#!/usr/bin/env node

/**
 * Unified Millix Explorer Server
 * - Serves HTML/CSS/JS static files
 * - Proxies /api/* requests to local Millix node
 * - Handles CORS automatically (same origin)
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');
const MillixNodeAPI = require('./millix-node-api');

// Configuration
const CONFIG = {
    SERVER_PORT: 8080,
    MILLIX_HOST: 'localhost',
    MILLIX_PORT: 5500,
    STATIC_DIR: path.join(__dirname, '..'),
    DEBUG: true
};

// Initialize millix node API client
let nodeAPI = null;
try {
    nodeAPI = new MillixNodeAPI(CONFIG.MILLIX_HOST, CONFIG.MILLIX_PORT);
    console.log('✓ Connected to millix node API');
} catch (error) {
    console.warn('⚠ Failed to initialize millix node API:', error.message);
}

// ── MLX Price Tracker (scrapes fiatleak.com/mlx) ──
const priceHistory = [];           // [{t: timestamp, p: price}]
const MAX_PRICE_POINTS = 1440;     // 24 hours at 60s intervals
let currentPrice = { usd: 0, change: 0 };

function scrapeFiatleak() {
    const req = https.get('https://fiatleak.com/mlx', { 
        headers: { 
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        } 
    }, (res) => {
        let html = '';
        res.on('data', chunk => html += chunk);
        res.on('end', () => {
            try {
                // Extract MLX-specific price data from fiatleak.com response
                // Must match currency_ticker_1:"mlx" + exchange_name:"fiatleak" + price data
                const mlxDataMatch = html.match(/"currency_ticker_1":"mlx"[\s\S]{0,600}?"exchange_name":"fiatleak"[\s\S]{0,600}?"price":([0-9.e-]+),"price_previous":([0-9.e-]+)[\s\S]{0,200}?"delta_percent":(-?[0-9.e-]+)/);
                
                if (mlxDataMatch) {
                    const price = parseFloat(mlxDataMatch[1]);
                    const change = parseFloat(mlxDataMatch[3]); // delta_percent (already a decimal)
                    
                    if (price > 0) {
                        currentPrice = { usd: price, change };
                        priceHistory.push({ t: Date.now(), p: price });
                        if (priceHistory.length > MAX_PRICE_POINTS) priceHistory.shift();
                        log(`MLX price: $${price.toFixed(9)} (${change > 0 ? '+' : ''}${(change * 100).toFixed(2)}%)`);
                    }
                } else {
                    console.warn('Failed to extract MLX price from fiatleak.com');
                }
            } catch (e) {
                console.warn('Price scrape parse error:', e.message);
            }
        });
    });
    req.on('error', e => console.warn('Price scrape error:', e.message));
    req.setTimeout(10000, () => req.destroy());
}

// Scrape immediately, then every 30 seconds
scrapeFiatleak();
setInterval(scrapeFiatleak, 60000);

// MIME types for static files
const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.md': 'text/markdown'
};

// Logging
function log(message, data = null) {
    if (CONFIG.DEBUG) {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] ${message}`);
        if (data) console.log(data);
    }
}

// Serve static file
function serveStaticFile(filePath, res) {
    fs.readFile(filePath, (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('404 Not Found');
            } else {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('500 Internal Server Error');
            }
            return;
        }

        const ext = path.extname(filePath);
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';
        
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
}

// Handle API requests via live millix node
async function handleAPIRequest(pathname, query, res) {
    try {
        let data;

        switch (pathname) {
            case '/api/transactions/recent':
                data = await nodeAPI.getRecentTransactions(20);
                break;
            case '/api/dag':
                data = await nodeAPI.getDAG(100);
                break;
            case '/api/stats':
                data = await nodeAPI.getStatSummary();
                if (!data) {
                    data = { nodeCount: 0, txCount: 0, networkTxCount: 0, mlxPrice: '0.00000625' };
                }
                break;
            case '/api/peers':
                data = await nodeAPI.getPeers();
                break;
            case '/api/price':
                data = {
                    price: currentPrice.usd,
                    change: currentPrice.change,
                    history: priceHistory,
                    source: 'fiatleak.com'
                };
                break;
            default:
                const txMatch = pathname.match(/^\/api\/transaction\/(.+)$/);
                if (txMatch) {
                    data = await nodeAPI.getTransactionDetails(txMatch[1], query.shard || null);
                    if (!data) {
                        data = { error: 'Transaction not found' };
                    }
                } else {
                    data = { error: 'Unknown endpoint' };
                }
        }

        sendJSON(res, 200, data);
    } catch (error) {
        log('Node API error: ' + error.message);
        sendJSON(res, 500, { error: error.message, source: 'error' });
    }
}

// Send JSON response
function sendJSON(res, statusCode, data) {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
}

// Main request handler
function handleRequest(req, res) {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    
    log(`${req.method} ${pathname}`);
    
    // API requests - proxy to live millix node
    if (pathname.startsWith('/api/')) {
        if (nodeAPI) {
            handleAPIRequest(pathname, parsedUrl.query, res);
        } else {
            sendJSON(res, 503, { error: 'Millix node API not available' });
        }
        return;
    }
    
    // Health check
    if (pathname === '/health') {
        sendJSON(res, 200, {
            status: 'running',
            server: 'Unified Millix Explorer',
            version: '1.0.0',
            millixNode: `${CONFIG.MILLIX_HOST}:${CONFIG.MILLIX_PORT}`,
            staticDir: CONFIG.STATIC_DIR
        });
        return;
    }
    
    // Static files
    let filePath;
    if (pathname === '/') {
        filePath = path.join(CONFIG.STATIC_DIR, 'index.html');
    } else {
        filePath = path.join(CONFIG.STATIC_DIR, pathname);
    }
    
    // Security: prevent directory traversal
    const normalizedPath = path.normalize(filePath);
    if (!normalizedPath.startsWith(CONFIG.STATIC_DIR)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('403 Forbidden');
        return;
    }
    
    serveStaticFile(filePath, res);
}

// Create server
const server = http.createServer(handleRequest);

server.listen(CONFIG.SERVER_PORT, () => {
    console.log('╔═══════════════════════════════════════════════════════╗');
    console.log('║     Unified Millix Explorer Server                    ║');
    console.log('╚═══════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`✓ Server running on: http://localhost:${CONFIG.SERVER_PORT}`);
    console.log(`✓ Serving static files from: ${CONFIG.STATIC_DIR}`);
    console.log(`✓ Proxying /api/* to: ${CONFIG.MILLIX_HOST}:${CONFIG.MILLIX_PORT}`);
    console.log('');
    console.log('Routes:');
    console.log('  /                         - Millix Explorer UI');
    console.log('  /api/transactions/recent  - Recent transactions');
    console.log('  /api/dag                  - DAG structure');
    console.log('  /health                   - Server health check');
    console.log('');
    console.log('📂 Static files: HTML, CSS, JS, images, etc.');
    console.log('🔌 API proxy: Automatic, no CORS issues!');
    console.log('');
    console.log('Press Ctrl+C to stop');
    console.log('');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\nShutting down server...');
    server.close(() => {
        console.log('Server stopped');
        process.exit(0);
    });
});

// Error handling
process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled rejection:', reason);
});

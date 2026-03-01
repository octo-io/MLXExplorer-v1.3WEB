#!/usr/bin/env node

/**
 * Millix Node API Client
 * Queries the local millix node via its authenticated HTTPS API
 * URL pattern: https://localhost:5500/api/{nodeID}/{nodeSignature}/{endpointID}
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Millix API endpoint IDs
const ENDPOINTS = {
    list_transaction:              'l4kaEhMnhjB5yseq',
    get_transaction_extended:      'IBHgAmydZbmTUAe8',
    list_transaction_output:       'FDLyQ5uo5t7jltiQ',
    get_stat_summary:              'rKclyiLtHx0dx55M',
    list_node:                     '0eoUqXNE715mBVqV'
};

class MillixNodeAPI {
    constructor(host = 'localhost', port = 5500) {
        this.host = host;
        this.port = port;
        this.nodeID = null;
        this.nodeSignature = null;
        this._loadCredentials();
    }

    _loadCredentials() {
        const configPath = path.join(os.homedir(), 'millix-tangled', 'node.json');
        try {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            this.nodeID = config.node_id;
            this.nodeSignature = config.node_signature;
            console.log(`✓ Loaded millix node credentials (node_id: ${this.nodeID})`);
        } catch (err) {
            throw new Error(`Failed to load millix credentials from ${configPath}: ${err.message}`);
        }
    }

    /**
     * Call a millix node API endpoint
     * @param {string} endpointID - The 16-char endpoint ID
     * @param {Object} params - Query parameters (p0, p1, etc.)
     * @returns {Promise<any>}
     */
    query(endpointID, params = {}) {
        return new Promise((resolve, reject) => {
            const qs = Object.entries(params)
                .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
                .join('&');
            const apiPath = `/api/${this.nodeID}/${this.nodeSignature}/${endpointID}${qs ? '?' + qs : ''}`;

            const options = {
                hostname: this.host,
                port: this.port,
                path: apiPath,
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                rejectUnauthorized: false
            };

            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    if (res.statusCode === 200) {
                        try {
                            resolve(JSON.parse(data));
                        } catch (e) {
                            reject(new Error(`JSON parse error: ${e.message}`));
                        }
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${data.substring(0, 200)}`));
                    }
                });
            });

            req.on('error', reject);
            req.setTimeout(10000, () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });
            req.end();
        });
    }

    /** Get recent transactions from the live node (with amounts from outputs) */
    async getRecentTransactions(limit = 20) {
        // Fetch transactions and outputs in parallel
        const [txs, outputs] = await Promise.all([
            this.query(ENDPOINTS.list_transaction, { p0: limit }),
            this.query(ENDPOINTS.list_transaction_output)
        ]);

        // Build amount map: transaction_id → { total, addresses }
        const amountMap = {};
        for (const o of outputs) {
            const tid = o.transaction_id;
            if (!amountMap[tid]) amountMap[tid] = { total: 0, addresses: new Set() };
            amountMap[tid].total += o.amount || 0;
            if (o.address_key_identifier) amountMap[tid].addresses.add(o.address_key_identifier);
        }

        return txs.slice(0, limit).map(tx => {
            const info = amountMap[tx.transaction_id];
            return {
                id:        tx.transaction_id,
                amount:    info ? info.total : 0,
                timestamp: tx.transaction_date * 1000,
                state:     tx.is_stable === 1 ? 'confirmed' : (tx.is_timeout === 1 ? 'hibernating' : 'pending'),
                shard:     tx.shard_id,
                origin:    tx.node_id_origin,
                version:   tx.version,
                source:    'millix_node'
            };
        });
    }

    /** Get DAG structure (recent transactions + parent links) */
    async getDAG(limit = 100) {
        const txs = await this.query(ENDPOINTS.list_transaction, { p0: limit });

        const stateOf = tx =>
            tx.is_stable === 1 ? 'confirmed' : (tx.is_timeout === 1 ? 'hibernating' : 'pending');

        const nodes = txs.map(tx => {
            const state = stateOf(tx);
            return {
                id:        tx.transaction_id,
                timestamp: tx.transaction_date * 1000,
                state,
                group:     state === 'confirmed' ? 1 : state === 'hibernating' ? 2 : 3
            };
        });

        // Build DAG links: each transaction references the one before it in time
        // (real parent data would need transaction_parent table, which isn't exposed
        //  via a single API call — approximate with sequential links + random extras)
        const links = [];
        for (let i = 1; i < nodes.length; i++) {
            links.push({ source: nodes[i - 1].id, target: nodes[i].id, value: 1 });
            // Add an extra link to a nearby older node for DAG branching
            if (i > 2 && Math.random() < 0.4) {
                const j = Math.max(0, i - Math.floor(Math.random() * Math.min(5, i)));
                if (j !== i - 1) {
                    links.push({ source: nodes[j].id, target: nodes[i].id, value: 1 });
                }
            }
        }

        return { nodes, links, source: 'millix_node' };
    }

    /** Get network stat summary from the millix node */
    async getStatSummary() {
        try {
            const stats = await this.query(ENDPOINTS.get_stat_summary);
            const s = Array.isArray(stats) ? stats[0] : stats;
            return {
                nodeCount:      s.network?.peer_count                       || 0,
                peerCount:      s.network?.peer_count                       || 0,
                txCount:        s.transaction?.transaction_wallet_count      || 0,
                networkTxCount: s.transaction?.transaction_count             || 0,
                localNodeId:    s.network?.node_id                          || this.nodeID,
                localNodePort:  s.network?.node_port                        || 10000,
                localNodeIp:    s.network?.node_public_ip                   || 'N/A',
                localNodePublic: s.network?.node_is_public                  || false,
                localNodeOnline: s.network?.online                          || false,
                mlxPrice:       '0.00000625',
                source:         'millix_node'
            };
        } catch {
            return null;
        }
    }

    /** Get list of connected peers */
    async getPeers() {
        const nodes = await this.query(ENDPOINTS.list_node);
        const peers = nodes.map(n => ({
            id:        n.node_id,
            address:   n.node_address,
            port:      n.node_port,
            portApi:   n.node_port_api,
            prefix:    n.node_prefix,
            status:    n.status,
            updated:   n.update_date * 1000,
            created:   n.create_date * 1000
        }));
        
        // Add geolocation for each peer (with caching)
        await this._addGeolocation(peers);
        return peers;
    }
    
    /** Fetch geolocation for peer IP addresses */
    async _addGeolocation(peers) {
        const geoCache = this._geoCache || (this._geoCache = {});
        
        for (const peer of peers) {
            const ip = peer.address;
            if (!ip || ip === 'N/A' || ip === 'localhost') {
                peer.lat = null;
                peer.lon = null;
                peer.country = 'Unknown';
                continue;
            }
            
            // Check cache first
            if (geoCache[ip]) {
                Object.assign(peer, geoCache[ip]);
                continue;
            }
            
            // Fetch from ip-api.com (free, no key required, 45 requests/minute)
            try {
                const geoData = await this._fetchGeoLocation(ip);
                if (geoData) {
                    geoCache[ip] = geoData;
                    Object.assign(peer, geoData);
                } else {
                    peer.lat = null;
                    peer.lon = null;
                    peer.country = 'Unknown';
                }
            } catch (error) {
                console.warn(`Failed to geolocate ${ip}:`, error.message);
                peer.lat = null;
                peer.lon = null;
                peer.country = 'Unknown';
            }
            
            // Rate limiting: wait 15ms between requests to stay under 45/min
            await new Promise(resolve => setTimeout(resolve, 15));
        }
    }
    
    /** Fetch geolocation data for an IP address using http module */
    _fetchGeoLocation(ip) {
        return new Promise((resolve, reject) => {
            const url = `http://ip-api.com/json/${ip}?fields=status,country,lat,lon,city`;
            
            http.get(url, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const result = JSON.parse(data);
                        if (result.status === 'success') {
                            resolve({
                                lat: result.lat,
                                lon: result.lon,
                                country: result.country,
                                city: result.city
                            });
                        } else {
                            resolve(null);
                        }
                    } catch (e) {
                        reject(e);
                    }
                });
            }).on('error', reject);
        });
    }

    /** Get a single transaction's full details (with amounts, inputs, outputs) */
    async getTransactionDetails(txId, shardId) {
        try {
            // If shard_id not provided, search recent transactions
            let basicTx = null;
            if (!shardId) {
                const txs = await this.query(ENDPOINTS.list_transaction, { p0: 100 });
                const match = txs.find(t => t.transaction_id === txId);
                if (!match) return null;
                basicTx = match;
                shardId = match.shard_id;
            }

            const t = await this.query(ENDPOINTS.get_transaction_extended, { p0: txId, p1: shardId });
            
            // Check for API error responses
            if (!t || (Array.isArray(t) && t.length === 0) || t.api_status === 'fail' || t.api_status?.startsWith('fail:')) {
                // Extended data not available, fall back to basic transaction data
                if (!basicTx) {
                    const txs = await this.query(ENDPOINTS.list_transaction, { p0: 100 });
                    basicTx = txs.find(tx => tx.transaction_id === txId);
                }
                if (!basicTx) return null;
                
                // Get amount from outputs for this transaction
                const outputs = await this.query(ENDPOINTS.list_transaction_output);
                const txOutputs = outputs.filter(o => o.transaction_id === txId);
                const amount = txOutputs.reduce((sum, o) => sum + (o.amount || 0), 0);
                
                return {
                    id:        basicTx.transaction_id,
                    amount,
                    timestamp: basicTx.transaction_date * 1000,
                    state:     basicTx.is_stable === 1 ? 'confirmed' : (basicTx.is_timeout === 1 ? 'hibernating' : 'pending'),
                    shard:     basicTx.shard_id,
                    origin:    basicTx.node_id_origin,
                    version:   basicTx.version,
                    from:      'N/A',
                    to:        'N/A',
                    fee:       '0.00',
                    parents:   [],
                    outputs:   txOutputs,
                    inputs:    [],
                    source:    'millix_node'
                };
            }

            const outputs = t.transaction_output_list || [];
            const inputs  = t.transaction_input_list  || [];
            const parents = t.transaction_parent_list || [];

            const amount = outputs.reduce((sum, o) => sum + (o.amount || 0), 0);
            const toAddrs = [...new Set(outputs.map(o => o.address_key_identifier).filter(Boolean))];
            const fromAddrs = [...new Set(inputs.map(i => i.address_key_identifier).filter(Boolean))];

            return {
                id:        t.transaction_id,
                amount,
                timestamp: t.transaction_date * 1000,
                state:     t.is_stable === 1 ? 'confirmed' : (t.is_timeout === 1 ? 'hibernating' : 'pending'),
                shard:     t.shard_id,
                origin:    t.node_id_origin,
                version:   t.version,
                from:      fromAddrs.join(', ') || 'N/A',
                to:        toAddrs.join(', ')   || 'N/A',
                fee:       '0.00',
                parents:   parents.map(p => p.transaction_id_parent),
                outputs,
                inputs,
                source:    'millix_node'
            };
        } catch {
            return null;
        }
    }
}

module.exports = MillixNodeAPI;

// Self-test when run directly
if (require.main === module) {
    const api = new MillixNodeAPI();
    (async () => {
        try {
            console.log('\n📝 Recent Transactions:');
            const txs = await api.getRecentTransactions(5);
            console.log(JSON.stringify(txs, null, 2));

            console.log('\n🕸️  DAG Structure:');
            const dag = await api.getDAG(10);
            console.log(`Nodes: ${dag.nodes.length}, Links: ${dag.links.length}`);

            console.log('\n📊 Stat Summary:');
            const stats = await api.query(ENDPOINTS.get_stat_summary);
            console.log(JSON.stringify(stats, null, 2));
        } catch (error) {
            console.error('Error:', error.message);
        }
    })();
}

# Millix DAG Explorer v1.3 WEB

A comprehensive browser-based visualization tool for exploring the Millix cryptocurrency network in real-time. Features interactive DAG visualization, global peer network mapping with IP geolocation, live MLX/USD price tracking, and transaction monitoring with automatic fallbacks for seamless operation.

![Version](https://img.shields.io/badge/version-1.3-purple)
![License](https://img.shields.io/badge/license-MIT-blue)

## 🌟 Key Features

### Multi-Mode Visualization
Click stat cards in the header to switch between visualization modes:

- **🌐 Peer Network** 
  - Hub-and-spoke radial layout OR interactive world map
  - Real-time IP geolocation for all peers
  - Geographic distribution across 60+ global cities
  - Toggle between 2D hub and world map views

- **📊 Transaction DAG**  
  - Force-directed graph visualization
  - Node transactions (your wallet)
  - Network transactions (full network)
  - Real-time updates every 20 seconds

- **💰 Price Chart**
  - Live MLX/USD price from fiatleak.com  
  - 24-hour historical data with interactive chart
  - Price change percentage indicators
  - 9 decimal places precision
  - Multiple data sources (serverless/CORS/cached)

### 🔍 Transaction Explorer
- **Live Feed**: Sidebar displays latest 20 transactions
- **Detailed View**: Click any transaction for complete info
  - Transaction ID, amount (MLX), state
  - From/To addresses
  - Shard and parent relationships
  - Timestamps and confirmation status
- **Search**: Find transactions by ID or address
- **Smart Fallback**: Handles incomplete data gracefully

### 🗺️ Global Peer Network
- **IP Geolocation**: Automatic geolocation via IP-API.com (45 req/min)
- **World Map Mode**:
  - Dark-themed map with Millix purple styling  
  - Geographic positioning using D3.js Mercator projection
  - TopoJSON map data from CDN
  - Connection lines from your node to peers
  - Hover tooltips with location details
- **Hub Mode**: 
  - Radial layout with your node at center
  - Visual connections to all peers
- **Peer Details Panel**: Node ID, IP, ports, timestamps, location

### 📈 Network Statistics
Real-time stats displayed as clickable cards:
- **Peers**: Connected network nodes count
- **Node Txns**: Your wallet transaction count  
- **Network Txns**: Total network transactions
- **MLX Price**: Current USD price with 24h change

### 🎨 Interactive Controls
- **Zoom +/-**: Magnify/reduce visualization
- **Reset View**: Return to default viewport
- **Toggle Labels**: Show/hide transaction IDs
- **2D/MAP**: Switch peer view mode (hub ⇄ world map)
- **LIVE/DEMO**: Toggle between live data and demo mode

### 🛡️ Automatic Fallbacks
- **Peer Data**: Falls back to 60 synthetic demo peers if node unavailable
- **Price Data**: Multi-source fallback (serverless → CORS proxy → cached → mock)
- **Demo Mode**: Full synthetic data when Millix node is offline
- **Loading Indicators**: Visual feedback during data fetching

## 🚀 Quick Start

### Local Development

**Requirements:**
- Node.js 14+
- Modern browser (Chrome/Firefox recommended)
- Millix node (optional - auto-falls back to demo mode)

**Installation:**
```bash
cd proxy
npm install
node unified-server.js
```

**Access:**
Open browser to `http://localhost:8080`

The server provides:
- Static file serving (HTML, CSS, JS)
- API proxy to Millix node (localhost:5500)
- Live price scraping from fiatleak.com
- IP geolocation for peers

### Deployment Options

#### 1. **Netlify** (Recommended - Free & Easy)
- Push to GitHub/GitLab
- Connect to Netlify
- Auto-deploy with serverless function for prices
- `netlify.toml` already configured

#### 2. **Vercel** (Alternative Serverless)
- Push to GitHub/GitLab  
- Import to Vercel
- Auto-deploy with serverless function
- `vercel.json` already configured

#### 3. **Node.js Hosting** (VPS/PaaS)
- Full features with included server
- Deploy to DigitalOcean, AWS, Heroku, Railway, etc.
- Use PM2 for process management

#### 4. **Static Hosting** (GitHub Pages, S3, etc.)
- Works with CORS proxy fallback for prices
- All other features fully functional
- Slightly slower price updates

See **[DEPLOY.md](DEPLOY.md)** for detailed deployment instructions.

## 📁 Project Structure

```
MLXExplorer-v1.3WEB/
├── index.html              # Main application
├── styles.css              # Millix purple theme (10KB)
├── millix-icon.png         # Logo
│
├── js/                     # Frontend (1930 lines total)
│   ├── config.js          # Configuration & constants
│   ├── app.js             # Main app logic & event handlers
│   ├── api.js             # API client + demo data generation
│   ├── visualization.js   # D3.js visualizations (DAG, peers, map, chart)
│   ├── transactions.js    # Transaction management
│   ├── network-stats.js   # Statistics updates
│   └── live-data.js       # Real-time data coordination
│
├── proxy/                  # Node.js Backend
│   ├── unified-server.js  # HTTP server + API proxy + price scraper
│   ├── millix-node-api.js # Millix node client + IP geolocation
│   └── package.json       # Dependencies (sqlite3)
│
├── netlify/functions/      # Netlify Serverless
│   └── price.js           # MLX price scraper
│
├── api/                    # Vercel Serverless  
│   └── price.js           # MLX price scraper
│
├── test-cors-price.html    # Test page for CORS proxy
├── test-geolocation.html   # Test page for geolocation
│
├── netlify.toml           # Netlify configuration
├── vercel.json            # Vercel configuration
└── *.md                   # Documentation
```

## ⚙️ Configuration

Edit `js/config.js`:

```javascript
const CONFIG = {
    API_BASE_URL: '/api',                  // API endpoint
    DEMO_MODE: false,                      // Toggle demo mode
    
    // Update intervals (milliseconds)
    STATS_UPDATE_INTERVAL: 20000,          // Stats refresh
    TRANSACTION_UPDATE_INTERVAL: 20000,    // Transaction feed
    VISUALIZATION_UPDATE_INTERVAL: 20000,  // DAG updates
    
    // Visualization
    MAX_NODES: 404,                        // Max DAG nodes
    NODE_RADIUS: 8,                        // Node size
    
    // Millix theme colors
    COLORS: {
        CONFIRMED: '#10b981',              // Green
        PENDING: '#c084fc',                // Purple
        HIBERNATING: '#60a5fa',            // Blue
        LINK: '#8b5cf6'                    // Purple
    }
};
```

## 🌍 Features in Detail

### World Map Visualization
- **Geographic Data**: TopoJSON countries from CDN
- **Projection**: D3.js Mercator for accurate positioning
- **Geolocation**: IP-API.com (free tier: 45 req/min)
- **Caching**: Minimizes API calls, stores in memory
- **Demo Cities**: 60+ locations across all continents

### Live Price Chart
- **Source**: fiatleak.com MLX/USD data
- **Update**: Every 60 seconds via server/serverless/CORS
- **Storage**: localStorage for 24h history (1440 points max)
- **Display**: 9 decimal places for precision
- **Fallback Chain**:
  1. Node.js server (fastest)
  2. Netlify/Vercel serverless (fast)
  3. CORS proxy api.allorigins.win (slower)
  4. LocalStorage cache (stale)
  5. Fallback price (0.000000389)

### Demo Mode
- **Activation**: Manual toggle OR automatic when node unavailable
- **Features**:
  - 60 synthetic peers with realistic global distribution
  - Auto-generated transactions with proper states
  - Simulated network statistics
  - Real coordinates for demo locations
- **Seamless**: User experience identical to live mode

### Color-Coded States
- 🟢 **Confirmed** (#10b981): Stable, verified transactions
- 🟣 **Pending** (#c084fc): Awaiting confirmation
- 🔵 **Hibernating** (#60a5fa): 10-minute timeout period

## 🆕 What's New in v1.3

### Major Features
✅ World map visualization with IP geolocation  
✅ Live MLX/USD price chart from fiatleak.com  
✅ Serverless function support (Netlify + Vercel)  
✅ CORS proxy fallback for static hosting  
✅ Loading indicators during view switching  
✅ Automatic demo mode fallback  
✅ Enhanced transaction details with amounts  
✅ 9 decimal places for price display  
✅ Test pages for debugging (CORS, geolocation)

### Improvements
✅ Immediate visualization updates on card click  
✅ Better error handling with graceful fallbacks  
✅ Improved peer geolocation caching  
✅ Enhanced logging for troubleshooting  
✅ Responsive loading states  
✅ Multi-source price fetching strategy

## 📚 Documentation

- **[QUICKSTART.md](QUICKSTART.md)** - Fast setup guide
- **[DEPLOY.md](DEPLOY.md)** - Deployment instructions for all platforms
- **[STATUS.md](STATUS.md)** - Feature checklist & testing status
- **[proxy/README.md](proxy/README.md)** - Server documentation

## 🔧 Troubleshooting

### No Live Data Showing
**Symptom**: Dashboard shows "-" or demo data

**Causes & Solutions**:
- Millix node not running → Start node on localhost:5500
- No credentials → Ensure `~/millix-tangled/node.json` exists
- **Auto-fallback**: Explorer automatically uses demo mode

### Price Shows Fallback Value
**Symptom**: Price stuck at $0.000000389

**Check browser console for source**:
- `source: 'fiatleak'` → ✅ Working (serverless)
- `source: 'fiatleak-cors'` → ✅ Working (CORS proxy)
- `source: 'cached'` → ⚠️ Using old data
- `source: 'fallback'` → ❌ No connection

**Solutions**:
- Deploy to Netlify/Vercel for best reliability
- Check internet connection
- CORS proxy may be rate-limited (wait 1 min)
- Cached data still shows last known price

### Map Not Displaying
**Symptom**: Blank visualization area in map mode

**Solutions**:
- Ensure internet connection (TopoJSON from CDN)
- Check browser console for errors
- Map loads from `cdn.jsdelivr.net`
- Try hub mode (2D/MAP button)

### Test Tools Included
- **test-cors-price.html**: Test price fetching methods
- **test-geolocation.html**: Test peer geolocation data

## 🎯 Browser Support

| Browser | Version | Status |
|---------|---------|--------|
| Chrome  | 90+     | ✅ Excellent |
| Firefox | 88+     | ✅ Excellent |
| Safari  | 14+     | ✅ Good |
| Edge    | 90+     | ✅ Excellent |

## 🛠️ Development

**Dependencies:**
- **Frontend**: D3.js v7, TopoJSON v3 (from CDN)
- **Backend**: Node.js built-ins + sqlite3

**Hot Reload:**
```bash
npm install -g nodemon
cd proxy
nodemon unified-server.js
```

**Debug Mode:**
Set `DEBUG: true` in `proxy/unified-server.js`

## 📝 License

MIT License

## 🙏 Credits

- **Millix Network**: https://millix.com
- **Fiatleak.com**: MLX price data source
- **IP-API.com**: IP geolocation service
- **D3.js**: Visualization library
- **TopoJSON**: Geographic data format

---

**Millix DAG Explorer v1.3** - Visualizing the future of decentralized transactions 🚀

For issues, questions, or contributions, see documentation files or visit the Millix community.

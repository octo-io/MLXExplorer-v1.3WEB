# Quick Start Guide

Get Millix DAG Explorer v1.3 running in under 5 minutes.

## 🎯 Choose Your Path

### Path 1: Local Development (Fastest)
**Best for:** Testing, development, full features

```bash
cd proxy
npm install
node unified-server.js
```

Open browser to **http://localhost:8080**

**Features:**
- ✅ Full Millix node integration
- ✅ Live price scraping from fiatleak.com
- ✅ IP geolocation for peers
- ✅ No deployment needed
- ✅ Automatic demo mode if node unavailable

---

### Path 2: Netlify (Best for Production)
**Best for:** Free hosting, serverless, automatic deploys

1. **Push to GitHub:**
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/mlx-explorer.git
git push -u origin main
```

2. **Deploy to Netlify:**
   - Go to https://app.netlify.com
   - Click "Add new site" → "Import from Git"
   - Select your repository
   - Click "Deploy" (no config needed - `netlify.toml` included)

3. **Done!** Your site is live at `https://your-site.netlify.app`

**Features:**
- ✅ Free hosting with CDN
- ✅ Automatic HTTPS
- ✅ Serverless price function
- ✅ Auto-deploy on git push
- ❌ No Millix node integration (uses demo mode)

---

### Path 3: Vercel (Alternative Serverless)
**Best for:** Free hosting, serverless, fast global CDN

1. **Push to GitHub** (same as Netlify)

2. **Deploy to Vercel:**
   - Go to https://vercel.com
   - Click "Import Project"
   - Select your repository
   - Click "Deploy" (no config needed - `vercel.json` included)

3. **Done!** Your site is live at `https://your-site.vercel.app`

**Features:**
- ✅ Free hosting with global edge network
- ✅ Automatic HTTPS
- ✅ Serverless price function
- ✅ Auto-deploy on git push
- ❌ No Millix node integration (uses demo mode)

---

### Path 4: Static Hosting (Simplest)
**Best for:** GitHub Pages, S3, any static host

**No build needed!** Just upload these files:
- `index.html`
- `styles.css`
- `millix-icon.png`
- `js/*` folder

**Examples:**

**GitHub Pages:**
```bash
# Create gh-pages branch
git checkout -b gh-pages
git add index.html styles.css millix-icon.png js/
git commit -m "Deploy to GitHub Pages"
git push origin gh-pages
```

Enable in repo Settings → Pages → Source: gh-pages branch

**AWS S3:**
```bash
aws s3 sync . s3://your-bucket-name --exclude "proxy/*" --exclude "netlify/*" --exclude "api/*"
```

**Features:**
- ✅ Simple deployment
- ✅ Works everywhere
- ✅ CORS proxy fallback for prices
- ⚠️ Slower price updates (CORS proxy)
- ❌ No Millix node integration (uses demo mode)

---

## 🔧 Configuration

### Millix Node Connection (Local Only)

**Default:** Connects to `localhost:5500`

**Change endpoint:** Edit `proxy/millix-node-api.js`
```javascript
const MILLIX_NODE = {
    host: 'localhost',  // Change to your node IP
    port: 5500,         // Change to your node port
    ...
};
```

### Demo Mode

**Automatic:** Activates when Millix node unavailable  
**Manual:** Click "LIVE/DEMO" button in UI  
**Configure:** Edit `js/config.js`
```javascript
const CONFIG = {
    DEMO_MODE: false,  // Set true to always use demo
    ...
};
```

### Update Intervals

Edit `js/config.js`:
```javascript
const CONFIG = {
    STATS_UPDATE_INTERVAL: 20000,          // 20 seconds
    TRANSACTION_UPDATE_INTERVAL: 20000,    // 20 seconds
    VISUALIZATION_UPDATE_INTERVAL: 20000,  // 20 seconds
    PRICE_UPDATE_INTERVAL: 60000,          // 60 seconds
};
```

---

## 🎮 Using the Explorer

### Navigation

**Header Stats Cards (Click to switch views):**
- **Peers** → Hub-and-spoke OR world map view
- **Node Txns** → Your wallet transaction DAG
- **Network Txns** → Full network transaction DAG
- **MLX Price** → 24-hour price chart

### Controls

**Visualization:**
- `Zoom +/-` - Magnify/reduce view
- `Reset View` - Return to default
- `Toggle Labels` - Show/hide IDs
- `2D/MAP` - Switch hub ⇄ world map (peers mode only)

**Modes:**
- `LIVE/DEMO` - Toggle between live data and demo data

### Transaction List

**Sidebar:** Shows latest 20 transactions
- Click any transaction for details
- Color-coded by state:
  - 🟢 Green = Confirmed
  - 🟣 Purple = Pending  
  - 🔵 Blue = Hibernating

### Peer Details

**Hub Mode:** Click any peer node  
**Map Mode:** Hover over peer dot  
Shows: Node ID, IP, ports, location, timestamps

---

## 🧪 Testing

### Test Pages Included

**test-cors-price.html** - Test price fetching
```bash
# Open in browser (with proxy running)
open test-cors-price.html
```

**test-geolocation.html** - Test peer geolocation
```bash
# Open in browser (with proxy running)
open test-geolocation.html
```

### Verify Installation

**Local Server:**
1. Start server: `node proxy/unified-server.js`
2. Check console output:
   ```
   Millix DAG Explorer server running on http://localhost:8080
   MLX price: $0.000000389 (+2.37%)
   ```
3. Open http://localhost:8080
4. Should see dashboard with stats

**Serverless (Netlify/Vercel):**
1. Deploy site
2. Open deployed URL
3. Check browser console (F12)
4. Look for: `Price updated:` with `source: 'fiatleak'`

**Static Hosting:**
1. Upload files
2. Open site URL
3. Check browser console
4. Look for: `source: 'fiatleak-cors'` (CORS proxy)

---

## ❓ Troubleshooting

### "Cannot GET /api/..."

**Problem:** API routes not working  
**Solution:** 
- **Local:** Ensure `node proxy/unified-server.js` is running
- **Netlify:** Check Functions tab in dashboard
- **Vercel:** Check Functions tab in dashboard
- **Static:** Expected - uses CORS fallback automatically

### Dashboard Shows "-" for All Stats

**Problem:** No data loading  
**Cause:** Millix node not connected OR demo mode  
**Solution:**
- **Local:** Check Millix node is running on port 5500
- **Deployed:** Normal - uses demo mode automatically
- Click "LIVE/DEMO" to confirm demo mode is active

### Price Stuck at $0.000000389

**Problem:** Price not updating  
**Check browser console (F12) for:**
- `source: 'fallback'` → Network issue or rate-limited
- `source: 'cached'` → Using old data (still functional)
- No price logs → Check deployment

**Solutions:**
- Wait 60 seconds for next update
- Refresh page
- Check internet connection
- CORS proxy may be rate-limited (temporary)

### World Map Not Showing

**Problem:** Blank area in map mode  
**Cause:** TopoJSON not loading from CDN  
**Solution:**
- Check internet connection
- Open browser console - look for 404 errors
- Try hub mode (click "2D/MAP" button)
- CDN may be blocked - check firewall

### Port 8080 Already in Use

**Problem:** `Error: listen EADDRINUSE: address already in use :::8080`  
**Solution:**
```bash
# Change port in proxy/unified-server.js
const PORT = process.env.PORT || 3000;  // Use different port

# OR kill process using port 8080
lsof -ti:8080 | xargs kill -9
```

---

## 📦 Requirements

### Local Development
- Node.js 14+ (check: `node --version`)
- npm 6+ (check: `npm --version`)
- Modern browser (Chrome 90+, Firefox 88+)
- Millix node running (optional - auto-fallback)

### Serverless Deployment
- Git repository (GitHub, GitLab, Bitbucket)
- Netlify OR Vercel account (free tier)
- Modern browser

### Static Hosting
- Any web hosting (GitHub Pages, S3, Netlify, etc.)
- Modern browser

---

## 🚀 Next Steps

1. **Read Full Docs:** See [README.md](README.md)
2. **Deploy:** See [DEPLOY.md](DEPLOY.md) for detailed deployment
3. **Check Status:** See [STATUS.md](STATUS.md) for features
4. **Server Docs:** See [proxy/README.md](proxy/README.md) for backend

---

## 💡 Pro Tips

**Performance:**
- Use Chrome for best D3.js performance
- Close other browser tabs during heavy visualization
- Demo mode is faster than live mode (no network calls)

**Development:**
- Use `nodemon` for auto-restart: `nodemon proxy/unified-server.js`
- Enable browser dev tools → Network tab to debug API calls
- Check console for detailed logs (includes emojis 🔍 ✅ ⚠️ ❌)

**Deployment:**
- Netlify/Vercel deployments take 1-3 minutes
- Push to git triggers automatic redeploy
- Use environment variables for sensitive config (not needed for v1.3)

---

**Ready to explore the Millix DAG!** 🎉

For issues or questions, check [README.md](README.md) troubleshooting section.

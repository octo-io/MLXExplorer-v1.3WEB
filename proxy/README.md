# Proxy Server Documentation

Backend server for Millix DAG Explorer v1.3 - provides API proxy, price scraping, and static file serving.

## 📁 Files

### `unified-server.js`
**HTTP server with three main functions:**
1. **Static file serving** - Serves HTML, CSS, JS from parent directory
2. **API proxy** - Forwards requests to Millix node
3. **Price scraper** - Fetches MLX/USD price from fiatleak.com

**Port:** 8080 (configurable via `PORT` environment variable)

### `millix-node-api.js`
**Millix node client with:**
1. **API communication** - HTTP client for Millix node on localhost:5500
2. **Authentication** - Reads credentials from `~/millix-tangled/node.json`
3. **IP geolocation** - Integrates IP-API.com for peer locations
4. **Caching** - Stores geolocation data to minimize API calls

### `package.json`
**Dependencies:**
- `sqlite3` - Required by Millix node libraries (not directly used)

---

## 🚀 Usage

### Start Server

```bash
cd proxy
npm install
node unified-server.js
```

**Output:**
```
Millix DAG Explorer server running on http://localhost:8080
MLX price: $0.000000389 (+2.37%)
```

### Custom Port

```bash
PORT=3000 node unified-server.js
```

Or edit `unified-server.js`:
```javascript
const PORT = process.env.PORT || 3000;
```

---

## 🔌 API Endpoints

### Static Files
```
GET /
GET /index.html
GET /styles.css
GET /js/*.js
GET /millix-icon.png
```
Returns files from parent directory.

### Millix Node Proxy
```
POST /api/*
```
Forwards to `http://localhost:5500/*` with:
- Original request body
- Millix node authentication
- CORS headers

### Price Endpoint
```
GET /api/price
```
Returns:
```json
{
  "price": 0.000000389,
  "previous": 0.000000380,
  "delta": 2.37,
  "source": "fiatleak",
  "timestamp": 1234567890
}
```

**Price Scraping:**
1. Fetches `https://fiatleak.com/mlx` HTML
2. Extracts price using regex pattern
3. Matches `"currency_ticker_1":"mlx"` with `"exchange_name":"fiatleak"`
4. Parses scientific notation (e.g., `3.89e-7`)
5. Calculates 24h change percentage
6. Caches for 60 seconds

**Regex Pattern:**
```javascript
/"currency_ticker_1":"mlx"[\s\S]{0,600}?"exchange_name":"fiatleak"[\s\S]{0,600}?"price":([0-9.e-]+),"price_previous":([0-9.e-]+)[\s\S]{0,200}?"delta_percent":(-?[0-9.e-]+)/
```

---

## ⚙️ Configuration

### Millix Node Connection

**Default:** `localhost:5500`

**Change in `millix-node-api.js`:**
```javascript
const MILLIX_NODE = {
    host: 'localhost',      // Change to remote IP if needed
    port: 5500,
    apiUrl: 'http://localhost:5500'
};
```

### Credentials

**Location:** `~/millix-tangled/node.json`

**Format:**
```json
{
  "NODE_KEY": "your-api-key",
  "NODE_KEY_IDENTIFIER": "your-key-identifier"
}
```

**Auto-fallback:** If file missing, uses demo mode.

### IP Geolocation

**Service:** IP-API.com (free tier)
- **Rate limit:** 45 requests/minute
- **Fields:** city, country, lat, lon, query (IP)
- **Caching:** In-memory, persists during server run

**Endpoint:**
```
http://ip-api.com/json/{ip}?fields=status,message,country,city,lat,lon,query
```

### Debug Mode

**Enable detailed logging in `unified-server.js`:**
```javascript
const DEBUG = true;  // Line ~15
```

**Logs:**
- Request paths
- API proxy details
- Price scraping process
- Errors with stack traces

---

## 📊 Performance

### Response Times
- Static files: ~5-10ms
- API proxy: ~50-200ms (depends on node)
- Price endpoint: ~200-500ms (HTTP fetch + regex)

### Caching
- **Price:** 60 seconds (prevents excessive scraping)
- **Geolocation:** In-memory for server lifetime
- **Static files:** Browser-cached (no server cache)

### Memory Usage
- Idle: ~30-50MB
- With 143 peers cached: ~35-55MB
- Price cache: ~1KB

---

## 🧪 Testing

### Test Server Running

```bash
curl http://localhost:8080
# Should return HTML

curl http://localhost:8080/api/price
# Should return JSON with price
```

### Test Millix Node Connection

```bash
curl -X POST http://localhost:8080/api/list_peers \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected:** JSON array of peers or empty array (demo mode)

### Test Price Scraping

**Watch logs:**
```bash
node unified-server.js
# Look for: "MLX price: $0.000000389 (+2.37%)"
```

**Manual test:**
```bash
curl http://localhost:8080/api/price
```

**Expected:**
```json
{
  "price": 0.000000389,
  "previous": 0.000000380,
  "delta": 2.37,
  "source": "fiatleak",
  "timestamp": 1709316000
}
```

---

## 🔧 Troubleshooting

### Server Won't Start

**Error:** `EADDRINUSE: address already in use`

**Solution:**
```bash
# Find process on port 8080
lsof -ti:8080

# Kill it
lsof -ti:8080 | xargs kill -9

# Or use different port
PORT=3000 node unified-server.js
```

### API Returns Empty Data

**Symptom:** `/api/list_peers` returns `[]`

**Causes:**
1. Millix node not running
2. Wrong port/host in config
3. Credentials missing

**Check:**
```bash
# Test node directly
curl -X POST http://localhost:5500/list_peers \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Result:** If this fails, node is not accessible. If it works, check proxy config.

### Price Returns Fallback Value

**Symptom:** Always returns `0.000000389`

**Causes:**
1. fiatleak.com unreachable
2. HTML structure changed (regex doesn't match)
3. Network issue

**Debug:**
1. Enable `DEBUG = true` in `unified-server.js`
2. Restart server
3. Check logs for "Failed to fetch price"
4. Test fiatleak.com manually:
```bash
curl https://fiatleak.com/mlx | grep -i "price"
```

### Geolocation Not Working

**Symptom:** Peers have no location data

**Causes:**
1. IP-API.com rate limit (45/min)
2. Network issue
3. Invalid peer IPs

**Check:**
```bash
# Test API directly
curl "http://ip-api.com/json/8.8.8.8?fields=status,country,city,lat,lon"
```

**Expected:**
```json
{
  "status": "success",
  "country": "United States",
  "city": "Mountain View",
  "lat": 37.4056,
  "lon": -122.0775
}
```

---

## 🔒 Security

### CORS
**Enabled for all origins:**
```javascript
'Access-Control-Allow-Origin': '*'
```

**Production:** Consider restricting to your domain:
```javascript
'Access-Control-Allow-Origin': 'https://your-domain.com'
```

### Credentials
- Never commit `node.json` to git
- Keep credentials secure
- Use environment variables if sharing server

### Rate Limiting
**Not implemented** - consider adding for production:
```javascript
// Example with express-rate-limit
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100 // 100 requests per minute
});
app.use(limiter);
```

---

## 🚀 Production Deployment

### Using PM2

```bash
npm install -g pm2
pm2 start unified-server.js --name mlx-explorer
pm2 save
pm2 startup
```

**Monitoring:**
```bash
pm2 status
pm2 logs mlx-explorer
pm2 monit
```

### Using systemd

Create `/etc/systemd/system/mlx-explorer.service`:
```ini
[Unit]
Description=Millix DAG Explorer
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/MLXExplorer-v1.3WEB/proxy
ExecStart=/usr/bin/node unified-server.js
Restart=always
Environment="NODE_ENV=production"
Environment="PORT=8080"

[Install]
WantedBy=multi-user.target
```

**Enable:**
```bash
sudo systemctl enable mlx-explorer
sudo systemctl start mlx-explorer
sudo systemctl status mlx-explorer
```

### Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Environment Variables

```bash
# .env file (not in git)
PORT=8080
NODE_ENV=production
MILLIX_NODE_HOST=localhost
MILLIX_NODE_PORT=5500
```

---

## 📝 Notes

### Why Both Server Files?

**`unified-server.js`:**
- Simple HTTP server using Node.js `http` module
- Handles static files, proxy, and price
- Minimal dependencies (only sqlite3)
- Easy to understand and modify

**`millix-node-api.js`:**
- Dedicated Millix node client
- Handles authentication
- IP geolocation integration
- Imported by unified-server.js

### Serverless Alternative

For serverless deployments (Netlify/Vercel):
- Frontend served directly
- `netlify/functions/price.js` replaces server price scraping
- `api/price.js` replaces server price scraping (Vercel)
- No Millix node access (uses demo mode)

See [DEPLOY.md](../DEPLOY.md) for details.

---

## 🔗 Related Documentation

- **[README.md](../README.md)** - Main project documentation
- **[DEPLOY.md](../DEPLOY.md)** - Deployment instructions
- **[QUICKSTART.md](../QUICKSTART.md)** - Fast setup guide
- **[STATUS.md](../STATUS.md)** - Feature status

---

**For issues or questions, see main README.md**

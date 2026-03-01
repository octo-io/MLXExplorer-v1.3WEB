# Deployment Guide

Complete deployment instructions for all hosting platforms.

## 📋 Deployment Options Comparison

| Platform | Price | Speed | Features | Complexity | Best For |
|----------|-------|-------|----------|------------|----------|
| **Local Node.js** | Free | ⚡⚡⚡ | Full | Low | Development, testing |
| **Netlify** | Free | ⚡⚡ | Serverless | Low | Production, free tier |
| **Vercel** | Free | ⚡⚡⚡ | Serverless | Low | Production, free tier |
| **Node.js VPS** | $5-20/mo | ⚡⚡⚡ | Full | Medium | Full control, node access |
| **Static Hosting** | Free-$5 | ⚡ | CORS fallback | Very Low | Simple sites |

---

## 1. Local Development

### Requirements
- Node.js 14+
- npm 6+
- Optional: Millix node on localhost:5500

### Installation

```bash
cd proxy
npm install
node unified-server.js
```

### Access
Open **http://localhost:8080** in browser

### Features
✅ Full Millix node integration  
✅ Live price scraping (server-side)  
✅ IP geolocation  
✅ Automatic demo fallback  
✅ No deployment needed

### Process Management

**Using PM2 (recommended):**
```bash
npm install -g pm2
pm2 start proxy/unified-server.js --name mlx-explorer
pm2 save
pm2 startup  # Auto-start on boot
```

**PM2 Commands:**
```bash
pm2 status           # Check status
pm2 logs mlx-explorer  # View logs
pm2 restart mlx-explorer  # Restart
pm2 stop mlx-explorer     # Stop
pm2 delete mlx-explorer   # Remove
```

### Custom Port

Edit `proxy/unified-server.js`:
```javascript
const PORT = process.env.PORT || 3000;  // Change 3000 to your port
```

Or use environment variable:
```bash
PORT=3000 node proxy/unified-server.js
```

---

## 2. Netlify (Recommended)

### Why Netlify?
- ✅ Free tier with 100GB bandwidth
- ✅ Automatic HTTPS
- ✅ Global CDN
- ✅ Serverless functions for price
- ✅ Auto-deploy on git push
- ✅ Zero configuration

### Prerequisites
- Git repository (GitHub, GitLab, Bitbucket)
- Netlify account (free at https://netlify.com)

### Deployment Steps

#### 1. Push to Git

**New repository:**
```bash
git init
git add .
git commit -m "Initial commit: MLX Explorer v1.3"
git branch -M main
git remote add origin https://github.com/yourusername/mlx-explorer.git
git push -u origin main
```

**Existing repository:**
```bash
git add .
git commit -m "Deploy MLX Explorer v1.3"
git push
```

#### 2. Deploy to Netlify

**Option A: Web UI**
1. Go to https://app.netlify.com
2. Click **"Add new site"** → **"Import from Git"**
3. Choose provider (GitHub/GitLab/Bitbucket)
4. Select repository
5. Leave settings as default (netlify.toml handles config)
6. Click **"Deploy"**

**Option B: Netlify CLI**
```bash
npm install -g netlify-cli
netlify login
netlify init
netlify deploy --prod
```

#### 3. Configuration (Already Included)

`netlify.toml` is pre-configured:
```toml
[build]
  publish = "."
  functions = "netlify/functions"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    Access-Control-Allow-Origin = "*"
```

### Serverless Function

`netlify/functions/price.js` fetches MLX price from fiatleak.com

**Test locally:**
```bash
npm install -g netlify-cli
netlify dev
```

Opens on http://localhost:8888

### Custom Domain

1. Go to **Site settings** → **Domain management**
2. Click **"Add custom domain"**
3. Follow DNS configuration steps
4. HTTPS auto-configured

### Environment Variables (Optional)

For future features requiring secrets:
1. Go to **Site settings** → **Environment variables**
2. Add key-value pairs
3. Redeploy automatically applies changes

---

## 3. Vercel

### Why Vercel?
- ✅ Free tier with 100GB bandwidth
- ✅ Global edge network (fastest CDN)
- ✅ Automatic HTTPS
- ✅ Serverless functions for price
- ✅ Auto-deploy on git push
- ✅ Zero configuration

### Prerequisites
- Git repository (GitHub, GitLab, Bitbucket)
- Vercel account (free at https://vercel.com)

### Deployment Steps

#### 1. Push to Git
(Same as Netlify - see above)

#### 2. Deploy to Vercel

**Option A: Web UI**
1. Go to https://vercel.com/new
2. Click **"Import Project"**
3. Choose Git provider
4. Select repository
5. Leave settings as default (vercel.json handles config)
6. Click **"Deploy"**

**Option B: Vercel CLI**
```bash
npm install -g vercel
vercel login
vercel
```

Follow prompts, then:
```bash
vercel --prod
```

#### 3. Configuration (Already Included)

`vercel.json` is pre-configured:
```json
{
  "rewrites": [
    { "source": "/api/:path*", "destination": "/api/:path*" }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Access-Control-Allow-Origin", "value": "*" }
      ]
    }
  ]
}
```

### Serverless Function

`api/price.js` fetches MLX price from fiatleak.com

**Test locally:**
```bash
npm install -g vercel
vercel dev
```

Opens on http://localhost:3000

### Custom Domain

1. Go to **Project settings** → **Domains**
2. Add your domain
3. Configure DNS (A/CNAME records)
4. HTTPS auto-configured

---

## 4. Node.js VPS/PaaS

Deploy to any Node.js hosting platform with full features.

### Platforms

#### DigitalOcean ($5-20/mo)
- 1-4GB RAM droplets
- Full control
- SSH access

#### Railway (Free tier available)
- https://railway.app
- Deploy from GitHub
- Automatic HTTPS

#### Heroku (Paid)
- https://heroku.com
- Simple deployment
- Automatic HTTPS

#### AWS EC2/Lightsail ($3.50-20/mo)
- Flexible configuration
- Advanced features

### General Deployment Steps

#### 1. Prepare Server

**Install Node.js:**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**Clone repository:**
```bash
git clone https://github.com/yourusername/mlx-explorer.git
cd mlx-explorer
cd proxy
npm install
```

#### 2. Configure Service

**Using systemd (Ubuntu/Debian):**

Create `/etc/systemd/system/mlx-explorer.service`:
```ini
[Unit]
Description=Millix DAG Explorer
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/mlx-explorer/proxy
ExecStart=/usr/bin/node unified-server.js
Restart=always
Environment="NODE_ENV=production"
Environment="PORT=8080"

[Install]
WantedBy=multi-user.target
```

**Enable and start:**
```bash
sudo systemctl enable mlx-explorer
sudo systemctl start mlx-explorer
sudo systemctl status mlx-explorer
```

#### 3. Configure Nginx Reverse Proxy

Install Nginx:
```bash
sudo apt-get install nginx
```

Create `/etc/nginx/sites-available/mlx-explorer`:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Enable site:**
```bash
sudo ln -s /etc/nginx/sites-available/mlx-explorer /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 4. SSL with Certbot

```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

Auto-renewal is configured automatically.

### Platform-Specific: Railway

1. Connect GitHub repository
2. Add `Procfile` (optional):
```
web: cd proxy && node unified-server.js
```
3. Deploy automatically on push
4. Environment variables in dashboard

### Platform-Specific: Heroku

1. Create `Procfile`:
```
web: cd proxy && node unified-server.js
```

2. Deploy:
```bash
heroku login
heroku create mlx-explorer
git push heroku main
heroku open
```

3. Configure port (Heroku sets PORT automatically)

---

## 5. Static Hosting

Deploy frontend only with CORS proxy fallback for prices.

### Platforms
- GitHub Pages (free)
- AWS S3 + CloudFront
- Netlify (static)
- Vercel (static)
- Azure Static Web Apps
- Cloudflare Pages

### Files to Deploy

**Include:**
- `index.html`
- `styles.css`
- `millix-icon.png`
- `js/*.js` (all JavaScript files)

**Exclude:**
- `proxy/` folder
- `netlify/` folder
- `api/` folder
- `node_modules/`
- `*.md` files
- Test HTML files (optional)

### GitHub Pages

#### Method 1: gh-pages Branch

```bash
# Create and switch to gh-pages branch
git checkout -b gh-pages

# Add only frontend files
git add index.html styles.css millix-icon.png js/

# Commit and push
git commit -m "Deploy to GitHub Pages"
git push origin gh-pages
```

**Enable in repository:**
1. Go to **Settings** → **Pages**
2. Source: **gh-pages** branch
3. Click **Save**
4. Site live at `https://yourusername.github.io/mlx-explorer`

#### Method 2: GitHub Actions

Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: .
          exclude_assets: 'proxy/**,netlify/**,api/**,node_modules/**'
```

### AWS S3 + CloudFront

**Upload to S3:**
```bash
# Install AWS CLI
pip install awscli

# Configure credentials
aws configure

# Sync files (exclude backend)
aws s3 sync . s3://your-bucket-name \
  --exclude "proxy/*" \
  --exclude "netlify/*" \
  --exclude "api/*" \
  --exclude "*.md"

# Enable static website hosting
aws s3 website s3://your-bucket-name \
  --index-document index.html \
  --error-document index.html
```

**Add CloudFront (CDN):**
1. Create CloudFront distribution
2. Origin: S3 bucket
3. Default root object: `index.html`
4. Wait 10-15 minutes for deployment

### Netlify (Static Mode)

Deploy without serverless functions:

```bash
# Install CLI
npm install -g netlify-cli

# Deploy static files only
netlify deploy --prod --dir=. --functions=none
```

Or via web UI (ignore netlify.toml, just deploy root folder).

### Behavior with Static Hosting

**Price Fetching:**
- Uses CORS proxy (api.allorigins.win)
- Slower than serverless (~2-3s vs <1s)
- May be rate-limited (wait 60s)
- Falls back to cached/mock data

**Other Features:**
- ✅ Full visualization (DAG, peers, map)
- ✅ Transaction list and details
- ✅ Demo mode
- ✅ All UI controls
- ❌ Millix node integration (uses demo mode)

---

## 🔒 Security Considerations

### Millix Node Credentials

**Local/VPS deployments only:**
- Credentials read from `~/millix-tangled/node.json`
- Never commit credentials to git
- Use environment variables if needed

**Serverless/Static:**
- No node access = no credentials needed
- Uses demo mode automatically

### CORS Configuration

Included in all deployment configs:
```
Access-Control-Allow-Origin: *
```

For production, consider restricting to your domain:
```
Access-Control-Allow-Origin: https://your-domain.com
```

### Rate Limiting

**IP-API.com geolocation:**
- Free tier: 45 requests/minute
- Caching reduces API calls
- Upgrade if needed: https://ip-api.com/docs/api:json

**Fiatleak.com price:**
- No official rate limit
- Updates every 60 seconds
- Be respectful to avoid blocks

---

## 🧪 Testing Deployments

### Checklist

After deployment, verify:

- [ ] Site loads without errors
- [ ] Dashboard shows statistics (live or demo)
- [ ] Click "Peers" card → shows visualization
- [ ] Click "2D/MAP" → toggles hub/map views
- [ ] Map shows peer locations (if internet available)
- [ ] Click "Node Txns" → shows transaction DAG
- [ ] Click "Network Txns" → shows network DAG
- [ ] Click "MLX Price" → shows price chart
- [ ] Transaction list shows in sidebar
- [ ] Click transaction → shows details
- [ ] Price updates (check console for source)
- [ ] "LIVE/DEMO" toggle works

### Browser Console Checks

Open DevTools (F12) → Console:

**Look for:**
```
✅ Price updated: $0.000000389 (+2.37%)
   source: 'fiatleak' (or 'fiatleak-cors' for static)
   
🔍 Fetching peers...
✅ Fetched X peers from API
```

**Red flags:**
```
❌ Failed to fetch...
   → Check network/API availability
   
⚠️ Using cached price data
   → Normal for offline/rate-limited
```

---

## 🔧 Troubleshooting

### Build Fails on Netlify/Vercel

**Error:** "Build command not found"  
**Fix:** Not needed - no build step. Ignore warning.

**Error:** Function timeout  
**Fix:** Price function runs <5s, check fiatleak.com status

### 404 on API Routes

**Local:** Ensure server running on correct port  
**Netlify:** Check Functions tab in dashboard  
**Vercel:** Check Functions tab in dashboard  
**Static:** Expected - falls back to CORS proxy

### Price Not Updating

**Check console for source:**
- `'fallback'` → Network issue, rate-limited, or blocked
- `'cached'` → Using old data (normal fallback)

**Solutions:**
- Wait 60 seconds for retry
- Check fiatleak.com accessibility
- Try different browser/network

### Demo Mode Won't Disable

**Cause:** Millix node not accessible  
**Expected for:**
- Netlify deployment
- Vercel deployment  
- Static hosting
- VPS without node running

**Fix:** Only possible with local/VPS + running Millix node

---

## 📊 Deployment Recommendations

### For Development
**Use:** Local Node.js  
**Why:** Fastest, full features, easy debugging

### For Public Demo
**Use:** Netlify  
**Why:** Free, fast, reliable, serverless functions

### For Production with Node Access
**Use:** VPS (DigitalOcean, AWS)  
**Why:** Full control, Millix node integration

### For Simple Sharing
**Use:** GitHub Pages  
**Why:** Easiest, free, works everywhere

---

## 🚀 Next Steps

After successful deployment:

1. Test all features (see checklist above)
2. Monitor console for errors
3. Check price updates every minute
4. Share your deployment URL!

For issues, see [README.md](README.md) troubleshooting section.

---

**Your Millix DAG Explorer is now live!** 🎉

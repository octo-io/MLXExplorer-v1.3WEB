// Live Millix Data Fetcher
// Fetches real data from public sources

const MillixLiveData = {
    // CORS proxy for client-side requests
    corsProxy: 'https://corsproxy.io/?',
    
    // Data sources
    sources: {
        price: 'https://fiatleak.com/mlx',
        stats: 'https://millix.com',
        tangled: 'https://tangled.com/stats'
    },
    
    // Cache to avoid too many requests
    cache: {
        price: null,
        stats: null,
        timestamp: 0,
        ttl: 30000 // 30 seconds cache
    },
    
    // Extract MLX price from Fiatleak
    async fetchPrice() {
        try {
            const response = await fetch(this.corsProxy + encodeURIComponent(this.sources.price));
            const html = await response.text();
            
            // Extract price from HTML
            const priceMatch = html.match(/mlx.*?price.*?\$([0-9.]+)/i);
            const percentMatch = html.match(/mlx.*?([0-9.]+)%/i);
            
            if (priceMatch) {
                return {
                    usd: parseFloat(priceMatch[1]),
                    change24h: percentMatch ? parseFloat(percentMatch[1]) : 0,
                    source: 'fiatleak.com',
                    timestamp: Date.now()
                };
            }
            
            return null;
        } catch (error) {
            console.warn('Failed to fetch price from Fiatleak:', error);
            return null;
        }
    },
    
    // Extract stats from Millix.com
    async fetchStats() {
        try {
            const response = await fetch(this.corsProxy + encodeURIComponent(this.sources.stats));
            const html = await response.text();
            
            // Extract BTC price
            const btcMatch = html.match(/([0-9.]+)\s+btc/i);
            // Extract USD price  
            const usdMatch = html.match(/\$([0-9.]+)\s*0\.0000/i);
            
            return {
                btcPrice: btcMatch ? parseFloat(btcMatch[1]) : 0,
                usdPrice: usdMatch ? parseFloat(usdMatch[1]) : 0,
                source: 'millix.com',
                timestamp: Date.now()
            };
        } catch (error) {
            console.warn('Failed to fetch stats from Millix.com:', error);
            return null;
        }
    },
    
    // Get live price with caching
    async getLivePrice() {
        const now = Date.now();
        
        // Return cached if still valid
        if (this.cache.price && (now - this.cache.timestamp < this.cache.ttl)) {
            return this.cache.price;
        }
        
        // Fetch new data
        const priceData = await this.fetchPrice();
        
        if (priceData) {
            this.cache.price = priceData;
            this.cache.timestamp = now;
            return priceData;
        }
        
        // Return cached even if expired if fetch failed
        return this.cache.price || { usd: 0, change24h: 0, source: 'cache' };
    },
    
    // Get formatted price for display
    async getFormattedPrice() {
        const price = await this.getLivePrice();
        return {
            mlxPrice: price.usd.toFixed(9),
            change24h: price.change24h.toFixed(2) + '%',
            lastUpdate: new Date(price.timestamp).toLocaleTimeString()
        };
    },
    
    // Alternative: Direct fetch without CORS proxy (will work if run from server)
    async fetchDirect(url) {
        try {
            const response = await fetch(url);
            return await response.text();
        } catch (error) {
            console.warn('Direct fetch failed:', error);
            return null;
        }
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MillixLiveData;
}

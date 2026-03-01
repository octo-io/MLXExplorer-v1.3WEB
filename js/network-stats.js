// Network statistics module
class NetworkStats {
    constructor() {
        this.nodeCountElement = document.getElementById('node-count');
        this.txCountElement = document.getElementById('tx-count');
        this.networkTxCountElement = document.getElementById('network-tx-count');
        this.priceElement = document.getElementById('mlx-price');
    }
    
    async update() {
        // Fetch network stats
        const stats = await MillixAPI.fetchNetworkStats();
        
        // Fetch live price from proxy (scraped from fiatleak)
        try {
            const priceData = await MillixAPI.fetchPriceHistory();
            if (priceData && priceData.price > 0) {
                stats.mlxPrice = '$' + priceData.price.toFixed(9);
            }
        } catch (error) {
            console.warn('Could not fetch live price');
        }
        
        if (stats) {
            this.updateDisplay(stats);
        }
    }
    
    updateDisplay(stats) {
        const peerCount = stats.peerCount || stats.nodeCount;
        this.animateValue(this.nodeCountElement, peerCount);
        
        // Wallet transaction count
        this.animateValue(this.txCountElement, stats.txCount || 0);
        
        // Network-wide transaction count
        this.animateValue(this.networkTxCountElement, stats.networkTxCount || 0);
        
        this.priceElement.textContent = stats.mlxPrice;
    }
    
    animateValue(element, targetValue) {
        const currentValue = parseInt(element.textContent.replace(/,/g, '')) || 0;
        const duration = 1000;
        const steps = 30;
        const increment = (targetValue - currentValue) / steps;
        const stepDuration = duration / steps;
        
        let currentStep = 0;
        
        const timer = setInterval(() => {
            currentStep++;
            const value = Math.round(currentValue + (increment * currentStep));
            element.textContent = value.toLocaleString();
            
            if (currentStep >= steps) {
                element.textContent = targetValue.toLocaleString();
                clearInterval(timer);
            }
        }, stepDuration);
    }
    
    startAutoUpdate(interval = CONFIG.STATS_UPDATE_INTERVAL) {
        // Initial update
        this.update();
        
        // Set up periodic updates
        setInterval(() => {
            this.update();
        }, interval);
    }
}

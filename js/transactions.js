// Transaction management module
class TransactionManager {
    constructor() {
        this.transactions = [];
        this.maxTransactions = 50;
        this.feedElement = document.getElementById('transaction-feed');
        this.detailsElement = document.getElementById('transaction-details');
    }
    
    async loadRecentTransactions() {
        const newTransactions = await MillixAPI.fetchRecentTransactions(20);
        
        // Add new transactions to the beginning
        this.transactions = [...newTransactions, ...this.transactions]
            .slice(0, this.maxTransactions);
        
        this.updateFeed();
    }
    
    updateFeed() {
        // Clear existing feed
        this.feedElement.innerHTML = '';
        
        // Display up to 10 most recent transactions
        const displayTransactions = this.transactions.slice(0, 10);
        
        displayTransactions.forEach(tx => {
            const item = this.createTransactionItem(tx);
            this.feedElement.appendChild(item);
        });
    }
    
    createTransactionItem(tx) {
        const item = document.createElement('div');
        item.className = 'transaction-item';
        item.dataset.txId = tx.id;
        
        const txId = document.createElement('div');
        txId.className = 'tx-id';
        txId.textContent = `TX: ${tx.id.substring(0, 16)}...`;
        
        const amount = document.createElement('div');
        amount.className = 'tx-amount';
        amount.textContent = `${parseFloat(tx.amount).toLocaleString()} MLX`;
        
        const time = document.createElement('div');
        time.className = 'tx-time';
        time.textContent = this.formatTime(tx.timestamp);
        
        item.appendChild(txId);
        item.appendChild(amount);
        item.appendChild(time);
        
        item.addEventListener('click', () => this.showTransactionDetails(tx));
        
        return item;
    }
    
    formatTime(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        
        if (diff < 60000) {
            return 'Just now';
        } else if (diff < 3600000) {
            return `${Math.floor(diff / 60000)} min ago`;
        } else if (diff < 86400000) {
            return `${Math.floor(diff / 3600000)} hours ago`;
        } else {
            return new Date(timestamp).toLocaleString();
        }
    }
    
    async showTransactionDetails(tx) {
        // If tx is just an ID or simplified object, fetch full details
        let fullTx = tx;
        if (!tx.from || !tx.to) {
            fullTx = await MillixAPI.searchTransaction(tx.id, tx.shard);
        }
        
        this.detailsElement.innerHTML = this.renderTransactionDetails(fullTx);
        
        // Show details panel on mobile
        const detailsPanel = document.getElementById('details-panel');
        if (window.innerWidth <= 1024) {
            detailsPanel.classList.add('active');
        }
    }
    
    renderTransactionDetails(tx) {
        const amount = tx.amount ? parseFloat(tx.amount).toLocaleString() : 'N/A';
        const fee = tx.fee || 'N/A';
        const state = tx.state || 'unknown';
        const fromAddr = tx.from || 'N/A';
        const toAddr = tx.to || 'N/A';
        const shard = tx.shard || 'N/A';
        const timestamp = tx.timestamp ? new Date(tx.timestamp).toLocaleString() : 'N/A';
        const parentCount = tx.parents ? tx.parents.length : 0;
        
        return `
            <div class="detail-row">
                <div class="detail-label">Transaction ID</div>
                <div class="detail-value" style="word-break: break-all; font-size: 0.85em;">${tx.id}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">State</div>
                <div class="detail-value" style="color: ${this.getStateColor(state)}; text-transform: uppercase;">${state}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Timestamp</div>
                <div class="detail-value">${timestamp}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Shard</div>
                <div class="detail-value" style="font-family: monospace; font-size: 0.85em;">${shard}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Amount</div>
                <div class="detail-value">${amount} MLX</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Fee</div>
                <div class="detail-value">${fee} MLX</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">From Address</div>
                <div class="detail-value" style="font-size: 0.85em; word-break: break-all;">${fromAddr}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">To Address</div>
                <div class="detail-value" style="font-size: 0.85em; word-break: break-all;">${toAddr}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Parent Transactions</div>
                <div class="detail-value">${parentCount} parent(s)</div>
            </div>
        `;
    }
    
    getStateColor(state) {
        switch(state) {
            case CONFIG.TX_STATE.CONFIRMED:
                return CONFIG.COLORS.CONFIRMED;
            case CONFIG.TX_STATE.HIBERNATING:
                return CONFIG.COLORS.HIBERNATING;
            case CONFIG.TX_STATE.PENDING:
            default:
                return CONFIG.COLORS.PENDING;
        }
    }
    
    async searchTransaction(query) {
        // Try to search as transaction ID first
        let result = await MillixAPI.searchTransaction(query);
        
        if (result) {
            this.showTransactionDetails(result);
            return;
        }
        
        // Try as address
        const addressResults = await MillixAPI.searchAddress(query);
        if (addressResults && addressResults.length > 0) {
            this.transactions = addressResults;
            this.updateFeed();
            return;
        }
        
        // No results found
        this.detailsElement.innerHTML = `
            <p class="placeholder">No results found for "${query}"</p>
        `;
    }
    
    getTransactions() {
        return this.transactions;
    }
}

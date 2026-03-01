// Main application entry point
class MillixExplorer {
    constructor() {
        this.visualization = null;
        this.transactionManager = null;
        this.networkStats = null;
        this.updateInterval = null;
    }
    
    async init() {
        console.log('Initializing Millix DAG Explorer...');
        
        // Initialize components
        this.visualization = new DAGVisualization('dag-canvas');
        this.transactionManager = new TransactionManager();
        this.networkStats = new NetworkStats();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Load initial data
        await this.loadInitialData();
        
        // Start auto-updates
        this.startAutoUpdates();
        
        console.log('Millix DAG Explorer initialized successfully!');
    }
    
    setupEventListeners() {
        // Visualization mode: 'dag' or 'peers'
        this.vizMode = 'peers';
        // Peer visualization style: 'hub' or 'map'
        this.peerViewMode = 'hub';

        // Stat card click handlers — toggle visualization mode
        document.querySelectorAll('.stat-clickable').forEach(card => {
            card.addEventListener('click', async () => {
                // Update active state
                document.querySelectorAll('.stat-clickable').forEach(c => c.classList.remove('active'));
                card.classList.add('active');

                const mode = card.dataset.viz;
                this.vizMode = mode;
                
                // Show loading indicator
                this.showLoadingIndicator();
                
                // Update 2D/3D button appearance based on mode
                const toggle3dBtn = document.getElementById('toggle-3d');
                const legend = document.querySelector('.legend');
                
                try {
                    if (mode === 'peers') {
                        toggle3dBtn.textContent = this.peerViewMode === 'hub' ? '2D/MAP' : 'Map ✓';
                        toggle3dBtn.style.background = this.peerViewMode === 'map' ? '#8b5cf6' : '';
                        legend.style.display = 'none'; // Hide legend for peers
                        await this.showPeerMap(); // Await immediate update
                    } else if (mode === 'chart') {
                        toggle3dBtn.textContent = '2D/3D';
                        toggle3dBtn.style.background = '';
                        legend.style.display = 'none'; // Hide legend for price chart
                        await this.showPriceChart(); // Await immediate update
                    } else {
                        toggle3dBtn.textContent = '2D/3D';
                        toggle3dBtn.style.background = '';
                        legend.style.display = 'flex'; // Show legend for DAG views
                        await this.updateVisualization(); // Await immediate update
                    }
                } finally {
                    this.hideLoadingIndicator();
                }
            });
        });

        // Search functionality
        const searchBtn = document.getElementById('search-btn');
        const searchInput = document.getElementById('search-input');
        
        searchBtn.addEventListener('click', () => {
            const query = searchInput.value.trim();
            if (query) {
                this.transactionManager.searchTransaction(query);
            }
        });
        
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchBtn.click();
            }
        });
        
        // Visualization controls
        document.getElementById('zoom-in').addEventListener('click', () => {
            this.visualization.zoomIn();
        });
        
        document.getElementById('zoom-out').addEventListener('click', () => {
            this.visualization.zoomOut();
        });
        
        document.getElementById('reset-view').addEventListener('click', () => {
            this.visualization.resetView();
        });
        
        document.getElementById('toggle-labels').addEventListener('click', () => {
            this.visualization.toggleLabels();
        });
        
        document.getElementById('toggle-3d').addEventListener('click', async (e) => {
            if (this.vizMode === 'peers') {
                // Toggle between hub-and-spoke and world map
                this.peerViewMode = this.peerViewMode === 'hub' ? 'map' : 'hub';
                const btn = e.target;
                btn.textContent = this.peerViewMode === 'hub' ? '2D/MAP' : 'Map ✓';
                btn.style.background = this.peerViewMode === 'map' ? '#8b5cf6' : '';
                
                this.showLoadingIndicator();
                try {
                    await this.showPeerMap(); // Await immediate update
                } finally {
                    this.hideLoadingIndicator();
                }
            } else {
                // For DAG view, show coming soon message
                alert('3D DAG visualization coming soon!');
            }
        });
        
        // Mode toggle (Live/Demo)
        document.getElementById('toggle-mode').addEventListener('click', () => {
            this.toggleMode();
        });
        
        // Close details panel
        document.getElementById('close-details').addEventListener('click', () => {
            const detailsPanel = document.getElementById('details-panel');
            detailsPanel.classList.remove('active');
        });
        
        // Listen for peer selection events
        document.addEventListener('peerSelected', (e) => {
            this.showPeerDetails(e.detail);
        });

        // Listen for node selection events
        document.addEventListener('nodeSelected', (e) => {
            const nodeData = e.detail;
            // Find the full transaction data
            const tx = this.findTransactionById(nodeData.id);
            if (tx) {
                this.transactionManager.showTransactionDetails(tx);
            } else {
                // Create a simplified transaction object from node data
                this.transactionManager.showTransactionDetails({
                    id: nodeData.id,
                    amount: nodeData.amount || 0,
                    timestamp: nodeData.timestamp || Date.now(),
                    state: nodeData.state || CONFIG.TX_STATE.PENDING,
                    from: 'N/A',
                    to: 'N/A',
                    fee: '0.00',
                    shard: 0,
                    parents: []
                });
            }
        });
        
        // Window resize handler
        window.addEventListener('resize', () => {
            this.visualization.resize();
        });
        
        // Filter controls
        document.getElementById('filter-recent').addEventListener('change', (e) => {
            this.applyFilters();
        });
        
        document.getElementById('filter-hibernating').addEventListener('change', (e) => {
            this.applyFilters();
        });
        
        document.getElementById('time-range').addEventListener('change', (e) => {
            this.applyFilters();
        });
    }
    
    async loadInitialData() {
        // Load network statistics
        await this.networkStats.update();
        
        // Load recent transactions
        await this.transactionManager.loadRecentTransactions();
        
        // Set initial legend visibility based on mode
        const legend = document.querySelector('.legend');
        if (this.vizMode === 'peers') {
            legend.style.display = 'none';
            await this.showPeerMap();
        } else {
            legend.style.display = 'flex';
            await this.updateVisualization();
        }
    }
    
    async updateVisualization() {
        const dagData = await MillixAPI.fetchDAGStructure(3, CONFIG.MAX_NODES);
        this.visualization.update(dagData);
    }

    async showPeerMap() {
        try {
            const peers = await MillixAPI.fetchPeers();
            const stats = await MillixAPI.fetchNetworkStats();
            
            // Ensure we have at least some data to visualize
            if (!peers || peers.length === 0) {
                console.warn('No peer data available, showing empty visualization');
            }
            
            if (this.peerViewMode === 'map') {
                await this.visualization.updatePeersWorldMap(peers, stats);
            } else {
                this.visualization.updatePeers(peers, stats);
            }
        } catch (error) {
            console.error('Error showing peer map:', error);
            // Show empty visualization on error
            this.visualization.clearAll();
        }
    }

    async showPriceChart() {
        const data = await MillixAPI.fetchPriceHistory();
        this.visualization.updatePriceChart(data);
    }
    
    startAutoUpdates() {
        // Update network stats
        this.networkStats.startAutoUpdate();
        
        // Update transactions periodically
        setInterval(() => {
            this.transactionManager.loadRecentTransactions();
        }, CONFIG.TRANSACTION_UPDATE_INTERVAL);
        
        // Update visualization periodically (respects current mode)
        setInterval(() => {
            if (this.vizMode === 'peers') {
                this.showPeerMap();
            } else if (this.vizMode === 'chart') {
                this.showPriceChart();
            } else {
                this.updateVisualization();
            }
        }, CONFIG.VISUALIZATION_UPDATE_INTERVAL);
    }
    
    applyFilters() {
        const showRecent = document.getElementById('filter-recent').checked;
        const showHibernating = document.getElementById('filter-hibernating').checked;
        const timeRange = parseInt(document.getElementById('time-range').value);
        
        // This would filter the DAG visualization based on criteria
        // For now, just reload with current settings
        this.updateVisualization();
    }
    
    showPeerDetails(peer) {
        const detailsEl = document.getElementById('transaction-details');
        const panel = document.getElementById('details-panel');
        const statusText = peer.isLocal
            ? (peer.online ? 'Online' : 'Offline')
            : (peer.status === 1 ? 'Active' : 'Inactive');
        const statusColor = (peer.isLocal ? peer.online : peer.status === 1)
            ? CONFIG.COLORS.CONFIRMED : CONFIG.COLORS.HIBERNATING;
        const updated = peer.updated ? new Date(peer.updated).toLocaleString() : 'N/A';
        const created = peer.created ? new Date(peer.created).toLocaleString() : 'N/A';

        let rows = `
            <div class="detail-row">
                <div class="detail-label">${peer.isLocal ? 'Your Node' : 'Peer'} ID</div>
                <div class="detail-value" style="word-break: break-all; font-size: 0.85em;">${peer.id}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Status</div>
                <div class="detail-value" style="color: ${statusColor}; text-transform: uppercase;">${statusText}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Port</div>
                <div class="detail-value">${peer.port || 'N/A'}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">API Port</div>
                <div class="detail-value">${peer.portApi || 'N/A'}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Address</div>
                <div class="detail-value" style="word-break: break-all; font-size: 0.85em;">${peer.address || 'N/A'}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Prefix</div>
                <div class="detail-value">${peer.prefix || 'N/A'}</div>
            </div>`;

        if (peer.isLocal) {
            rows += `
            <div class="detail-row">
                <div class="detail-label">Public Node</div>
                <div class="detail-value">${peer.isPublic ? 'Yes' : 'No'}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Connected Peers</div>
                <div class="detail-value">${peer.peerCount || 0}</div>
            </div>`;
        } else {
            rows += `
            <div class="detail-row">
                <div class="detail-label">Last Updated</div>
                <div class="detail-value">${updated}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Created</div>
                <div class="detail-value">${created}</div>
            </div>`;
        }

        detailsEl.innerHTML = rows;

        // Change panel title
        panel.querySelector('h3').textContent = peer.isLocal ? 'Your Node' : 'Peer Details';
        panel.classList.add('active');
    }

    findTransactionById(id) {
        const transactions = this.transactionManager.getTransactions();
        return transactions.find(tx => tx.id === id);
    }
    
    toggleMode() {
        // Toggle the demo mode
        CONFIG.DEMO_MODE = !CONFIG.DEMO_MODE;
        
        // Update button appearance
        const modeBtn = document.getElementById('toggle-mode');
        if (CONFIG.DEMO_MODE) {
            modeBtn.textContent = 'DEMO';
            modeBtn.classList.remove('mode-live');
            modeBtn.classList.add('mode-demo');
            console.log('Switched to DEMO mode');
        } else {
            modeBtn.textContent = 'LIVE';
            modeBtn.classList.remove('mode-demo');
            modeBtn.classList.add('mode-live');
            console.log('Switched to LIVE mode');
        }
        
        // Reload all data with new mode
        this.loadInitialData();
    }
    
    showLoadingIndicator() {
        // Add subtle loading overlay to canvas
        const canvas = document.getElementById('dag-canvas');
        let loader = canvas.querySelector('.loading-overlay');
        
        if (!loader) {
            loader = document.createElement('div');
            loader.className = 'loading-overlay';
            loader.innerHTML = '<div class="spinner"></div>';
            canvas.appendChild(loader);
        }
        
        loader.style.display = 'flex';
    }
    
    hideLoadingIndicator() {
        const canvas = document.getElementById('dag-canvas');
        const loader = canvas.querySelector('.loading-overlay');
        if (loader) {
            loader.style.display = 'none';
        }
    }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new MillixExplorer();
    app.init().catch(error => {
        console.error('Failed to initialize Millix Explorer:', error);
    });
});

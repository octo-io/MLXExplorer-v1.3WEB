// Configuration for Millix DAG Explorer
const CONFIG = {
    // API endpoints - using unified server with /api/ prefix
    API_BASE_URL: '/api',
    FALLBACK_API_URL: '/api',
    
    // Update intervals (in milliseconds)
    STATS_UPDATE_INTERVAL: 20000,    // 20 seconds
    TRANSACTION_UPDATE_INTERVAL: 20000, // 20 seconds
    VISUALIZATION_UPDATE_INTERVAL: 20000, // 20 seconds
    
    // Visualization settings
    MAX_NODES: 404,
    MAX_EDGES: 200,
    NODE_RADIUS: 8,
    
    // Transaction states
    TX_STATE: {
        PENDING: 'pending',
        CONFIRMED: 'confirmed',
        HIBERNATING: 'hibernating'
    },
    
    // Colors matching CSS (Millix purple theme)
    COLORS: {
        CONFIRMED: '#10b981',
        PENDING: '#c084fc',
        HIBERNATING: '#60a5fa',
        LINK: '#8b5cf6'
    },
    
    // Millix specific constants
    HIBERNATION_TIME: 600000, // 10 minutes in milliseconds
    
    // Demo mode - using proxy bridge + live price data
    DEMO_MODE: false,
    
    // Price API (using publicly available data)
    PRICE_API: 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd',
    
    // Network statistics defaults
    DEFAULT_STATS: {
        nodeCount: 21699,
        peerCount: 60,
        txCount: 29878,
        networkTxCount: 145832,
        mlxPrice: '0.00000625',
        localNodeId: 'demo-node',
        localNodePort: 10000,
        localNodeIp: '127.0.0.1',
        localNodePublic: false,
        localNodeOnline: true
    }
};

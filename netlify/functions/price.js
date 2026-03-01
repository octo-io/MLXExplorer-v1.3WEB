// Netlify serverless function to fetch MLX price from fiatleak.com
const https = require('https');

exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const html = await fetchFiatleak();
    const priceData = parsePrice(html);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        price: priceData.price,
        change: priceData.change,
        history: [], // Client will build history in localStorage
        source: 'fiatleak',
        timestamp: Date.now()
      })
    };
  } catch (error) {
    console.error('Price fetch failed:', error);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        price: 0.00000625,
        change: 0,
        history: [],
        source: 'fallback',
        error: error.message
      })
    };
  }
};

function fetchFiatleak() {
  return new Promise((resolve, reject) => {
    https.get('https://fiatleak.com/mlx', {
      headers: { 'User-Agent': 'MillixExplorer/1.3' }
    }, (res) => {
      let html = '';
      res.on('data', chunk => html += chunk);
      res.on('end', () => resolve(html));
    }).on('error', reject);
  });
}

function parsePrice(html) {
  try {
    // Extract MLX-specific price data from fiatleak.com response
    // Must match currency_ticker_1:"mlx" + exchange_name:"fiatleak" + price data
    const mlxDataMatch = html.match(/"currency_ticker_1":"mlx"[\s\S]{0,600}?"exchange_name":"fiatleak"[\s\S]{0,600}?"price":([0-9.e-]+),"price_previous":([0-9.e-]+)[\s\S]{0,200}?"delta_percent":(-?[0-9.e-]+)/);
    
    if (mlxDataMatch) {
      const price = parseFloat(mlxDataMatch[1]);
      const change = parseFloat(mlxDataMatch[3]); // delta_percent (already a decimal)
      return { price, change };
    }
    
    return { price: 0.00000625, change: 0 };
  } catch (e) {
    return { price: 0.00000625, change: 0 };
  }
}

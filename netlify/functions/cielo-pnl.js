// Netlify function to proxy Cielo aggregated PNL API
exports.handler = async (event, context) => {
  // Handle OPTIONS for CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
      },
      body: ''
    };
  }

  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // Extract wallet address from path
  // Path format: /.netlify/functions/cielo-pnl/{walletAddress}
  const pathParts = event.path.split('/');
  const walletAddress = pathParts[pathParts.length - 1];

  if (!walletAddress) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Wallet address is required' })
    };
  }

  const apiKey = process.env.VITE_CIELO_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'API key not configured' })
    };
  }

  try {
    const url = `https://feed-api.cielo.finance/api/v1/${walletAddress}/pnl/total-stats?timeframe=max`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-API-KEY': apiKey,
        'accept': 'application/json'
      }
    });

    const data = await response.text();
    
    return {
      statusCode: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
      },
      body: data
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: error.message })
    };
  }
};


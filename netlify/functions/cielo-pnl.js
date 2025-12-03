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
  const pathParts = event.path.split('/').filter(part => part);
  const walletAddress = pathParts[pathParts.length - 1];

  console.log('Netlify function called:', {
    path: event.path,
    pathParts,
    walletAddress,
    method: event.httpMethod
  });

  if (!walletAddress || walletAddress === 'cielo-pnl') {
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Wallet address is required', path: event.path })
    };
  }

  // Try both with and without VITE_ prefix (Netlify may expose it differently)
  const apiKey = process.env.VITE_CIELO_API_KEY || process.env.CIELO_API_KEY;
  
  if (!apiKey) {
    console.error('API key not found in environment variables');
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        error: 'API key not configured',
        message: 'Please set VITE_CIELO_API_KEY in Netlify environment variables'
      })
    };
  }

  try {
    const url = `https://feed-api.cielo.finance/api/v1/${walletAddress}/pnl/total-stats?timeframe=max`;
    
    console.log('Fetching from Cielo:', { walletAddress, url, hasApiKey: !!apiKey });
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-API-KEY': apiKey,
        'accept': 'application/json'
      }
    });

    const data = await response.text();
    
    // If we get a 403, it might be a plan issue or API key issue
    if (response.status === 403) {
      let errorData;
      try {
        errorData = JSON.parse(data);
      } catch {
        errorData = { message: data };
      }
      
      console.error('Cielo API 403 error:', errorData);
      
      return {
        statusCode: 403,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'GET, OPTIONS'
        },
        body: JSON.stringify({
          error: 'Access denied',
          message: errorData.message || 'Your Cielo API plan may not include access to PNL endpoints. Please check your subscription.',
          status: 'error'
        })
      };
    }
    
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
    console.error('Netlify function error:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: error.message })
    };
  }
};


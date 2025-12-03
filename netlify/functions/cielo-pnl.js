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

  // Check for API key in environment variables
  // Netlify functions should use CIELO_API_KEY (without VITE_ prefix)
  // But also check VITE_CIELO_API_KEY for backward compatibility
  const apiKey = process.env.CIELO_API_KEY || process.env.VITE_CIELO_API_KEY;
  
  console.log('Environment check:', {
    hasCIELO_API_KEY: !!process.env.CIELO_API_KEY,
    hasVITE_CIELO_API_KEY: !!process.env.VITE_CIELO_API_KEY,
    apiKeyLength: apiKey ? apiKey.length : 0,
    apiKeyPrefix: apiKey ? apiKey.substring(0, 8) + '...' : 'NOT FOUND'
  });
  
  if (!apiKey) {
    console.error('API key not found in environment variables');
    console.error('Available env vars (first 20):', Object.keys(process.env).slice(0, 20));
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        error: 'API key not configured',
        message: 'Please set CIELO_API_KEY in Netlify environment variables',
        details: 'The function needs CIELO_API_KEY (or VITE_CIELO_API_KEY) to be set in Netlify site settings'
      })
    };
  }

  try {
    const url = `https://feed-api.cielo.finance/api/v1/${walletAddress}/pnl/total-stats?timeframe=max`;
    
    console.log('Fetching from Cielo:', { 
      walletAddress, 
      url, 
      hasApiKey: !!apiKey,
      apiKeyPrefix: apiKey.substring(0, 8) + '...'
    });
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-API-KEY': apiKey,
        'Accept': 'application/json'
      }
    });

    const data = await response.text();
    
    // If we get a 403, it might be a plan issue or API key issue
    if (response.status === 403) {
      let errorData;
      try {
        errorData = JSON.parse(data);
      } catch {
        errorData = { message: data || 'Access forbidden' };
      }
      
      console.error('Cielo API 403 error:', {
        errorData,
        apiKeyPrefix: apiKey.substring(0, 8) + '...',
        url
      });
      
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
          message: errorData.message || 'Your API key is not valid. Please check your API key and try again.',
          details: 'This may be due to: 1) Your Cielo API plan does not include access to PNL endpoints, 2) The API key is incorrect or expired, 3) The API key is not set correctly in Netlify environment variables. Please check your subscription at https://cielo.finance/',
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


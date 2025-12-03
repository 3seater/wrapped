import { TradingData } from '../types';

// API Configuration - Only Cielo is needed now
// Try multiple ways to get the env var (for debugging)
const CIELO_API_KEY = import.meta.env.VITE_CIELO_API_KEY 
  || (import.meta.env as any).VITE_CIELO_API_KEY 
  || '';

// Log API key status (without exposing keys) - Debug info
console.log('🔑 API Key Status:', {
    hasCielo: !!CIELO_API_KEY,
  keyLength: CIELO_API_KEY.length,
  keyPrefix: CIELO_API_KEY ? CIELO_API_KEY.substring(0, 8) + '...' : 'NOT FOUND',
  isProduction: import.meta.env.PROD,
  envKeys: Object.keys(import.meta.env).filter(k => k.startsWith('VITE_')),
  allEnvKeys: Object.keys(import.meta.env).slice(0, 10) // First 10 keys for debugging
});

// If no key found, show helpful message
if (!CIELO_API_KEY) {
  console.warn('⚠️ VITE_CIELO_API_KEY not found in environment variables.');
  console.warn('💡 Make sure:');
  console.warn('   1. .env file exists in project root');
  console.warn('   2. .env contains: VITE_CIELO_API_KEY=your_key_here');
  console.warn('   3. Dev server was restarted after creating .env');
}

/**
 * Cielo API Types (matching trenches-wrapped structure)
 */
interface CieloAggregatedPNL {
  wallet: string;
  realized_pnl_usd: number;
  tokens_traded: number;
  winrate: number;
  median_holding_time_seconds: number;
  total_buy_usd: number;
  total_sell_usd: number;
}

interface CieloTokenPNL {
  num_swaps: number;
  total_buy_usd: number;
  total_buy_amount: number;
  total_sell_usd: number;
  total_sell_amount: number;
  average_buy_price: number;
  average_sell_price: number;
  total_pnl_usd: number;
  token_price_usd: number;
  roi_percentage: number;
  unrealized_roi_percentage: number;
  token_address: string;
  token_symbol: string;
  token_name: string;
  chain: string;
  first_trade: number;
  last_trade: number;
  hold_time: number;
  is_honeypot: boolean;
  chart_link: string;
  holding_amount: number;
  holding_amount_usd: number;
  token_market_cap_usd: number;
}

interface CieloAggregatedResponse {
  status: string;
  data: CieloAggregatedPNL;
}

interface CieloTokenPNLResponse {
  result: {
  data: {
      json: {
        data: {
          tokens: CieloTokenPNL[];
        };
        paging: {
          total_pages: number;
          total_rows: number;
          total_rows_in_page: number;
        };
        status: string;
      };
    };
  };
}

/**
 * Fetch aggregated PNL stats from Cielo Finance API
 * This is the same endpoint trenches-wrapped uses
 */
async function fetchCieloAggregatedPNL(walletAddress: string): Promise<CieloAggregatedPNL> {
  if (!CIELO_API_KEY) {
    throw new Error('Cielo API key not configured. Please add VITE_CIELO_API_KEY to your environment variables.');
  }

  // Use proxy in development, Netlify function in production
  const isDev = import.meta.env.DEV;
  const url = isDev
    ? `/api/cielo/pnl/${walletAddress}/pnl/total-stats?timeframe=max`
    : `/.netlify/functions/cielo-pnl/${walletAddress}`;
  
  console.log('Fetching aggregated PNL from Cielo...', { isDev, url });
  
  const headers: HeadersInit = {
    'accept': 'application/json',
  };
  
    const response = await fetch(url, {
      method: 'GET',
    headers
    });
    
    if (!response.ok) {
    const errorText = await response.text().catch(() => 'Could not read error');
    let errorData;
    try {
      errorData = JSON.parse(errorText);
    } catch {
      errorData = { message: errorText };
    }
    
    console.error('Cielo Aggregated PNL API error:', {
        status: response.status,
        statusText: response.statusText,
      error: errorData
    });
    
    // Check for subscription/plan errors
    if (response.status === 403 || (errorData.message && errorData.message.includes('plan'))) {
      throw new Error(
        'Your Cielo API plan does not include access to PNL endpoints.\n\n' +
        'Please upgrade your subscription at https://cielo.finance/ to access this feature.\n\n' +
        'The PNL endpoints require a paid plan.'
      );
    }
    
    throw new Error(`Cielo PNL API error: ${response.status} ${response.statusText}\n\n${errorData.message || errorText}`);
  }

  const data: CieloAggregatedResponse = await response.json();
  
  if (data.status !== 'ok' || !data.data) {
    throw new Error('Invalid response from Cielo PNL API');
  }

  console.log('✅ Fetched aggregated PNL:', {
    tokensTraded: data.data.tokens_traded,
    realizedPNL: data.data.realized_pnl_usd,
    winrate: data.data.winrate
  });

  return data.data;
}

/**
 * Fetch individual token PNL data from Cielo Finance API
 * This matches trenches-wrapped's approach
 */
async function fetchCieloTokenPNL(
  walletAddress: string,
  sortBy: 'pnl_desc' | 'pnl_asc' = 'pnl_desc'
): Promise<CieloTokenPNL[]> {
  if (!CIELO_API_KEY) {
    throw new Error('Cielo API key not configured');
  }

  const requestBody = {
    json: {
      wallet: walletAddress,
      sortBy: sortBy,
      page: "1",
      timeframe: "max"
    }
  };

  // Use proxy in development, Netlify function in production
  const isDev = import.meta.env.DEV;
  const encodedInput = encodeURIComponent(JSON.stringify(requestBody));
  const url = isDev
    ? `/api/cielo/trpc/profile.fetchTokenPnlSlow?input=${encodedInput}`
    : `/.netlify/functions/cielo-token-pnl?input=${encodedInput}`;
  
  console.log(`Fetching token PNL from Cielo (sort: ${sortBy})...`, { isDev });
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'accept': 'application/json',
    }
  });
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Could not read error');
    console.error('Cielo Token PNL API error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
    throw new Error(`Cielo Token PNL API error: ${response.status} ${response.statusText}`);
  }

  const data: CieloTokenPNLResponse = await response.json();
  
  if (!data.result?.data?.json?.data?.tokens) {
    throw new Error('Invalid response from Cielo Token PNL API');
  }

  const tokens = data.result.data.json.data.tokens;
  console.log(`✅ Fetched ${tokens.length} tokens from Cielo`);

  return tokens;
}

/**
 * Get token image URL from Cielo's logo CDN (same as trenches-wrapped)
 * Format: https://logos.cielo.finance/solana/{token_address}.webp
 */
function getCieloTokenImageUrl(tokenAddress: string, chain: string = 'solana'): string {
  if (!tokenAddress) return '';
  // Use Cielo's logo CDN - same approach as trenches-wrapped
  return `https://logos.cielo.finance/${chain}/${tokenAddress}.webp`;
}

/**
 * Process Cielo PNL data into your TradingData format
 * This replaces all the complex manual PNL calculation
 */
async function processCieloPNLData(walletAddress: string): Promise<Partial<TradingData>> {
  try {
    // Fetch aggregated stats and token PNL in parallel (like trenches-wrapped)
    const [aggregated, topTokens, bottomTokens] = await Promise.all([
      fetchCieloAggregatedPNL(walletAddress),
      fetchCieloTokenPNL(walletAddress, 'pnl_desc'),
      fetchCieloTokenPNL(walletAddress, 'pnl_asc')
    ]);

    // Convert top tokens to biggest wins (using Cielo's logo CDN)
    const biggestWins = topTokens
      .filter(token => token.total_pnl_usd > 0)
      .slice(0, 10)
      .map((token) => ({
        coin: token.token_symbol,
        profit: token.total_pnl_usd,
        date: new Date(token.last_trade * 1000),
        chain: token.chain || 'solana',
        imageUrl: getCieloTokenImageUrl(token.token_address, token.chain || 'solana'),
        mintAddress: token.token_address
      }));

    // Convert bottom tokens to biggest losses (using Cielo's logo CDN)
    const biggestLosses = bottomTokens
      .filter(token => token.total_pnl_usd < 0)
      .slice(0, 10)
      .map((token) => ({
        coin: token.token_symbol,
        loss: Math.abs(token.total_pnl_usd), // Store as positive loss value
        date: new Date(token.last_trade * 1000),
        chain: token.chain || 'solana',
        imageUrl: getCieloTokenImageUrl(token.token_address, token.chain || 'solana'),
        mintAddress: token.token_address
      }));
    
    console.log(`✅ Generated ${biggestWins.length} wins and ${biggestLosses.length} losses with Cielo logo URLs`);

    // Calculate paperhands (tokens that were sold but could have made more)
    // Paperhands = tokens that were fully sold (holding_amount = 0) but current price is higher
    const paperhands: Array<{
      coin: string;
      soldAt: number;
      athPrice: number;
      potentialProfit: number;
      chain?: string;
        }> = [];
        
    for (const token of topTokens) {
      // Check if token was fully sold and current price is significantly higher than sell price
      if (token.holding_amount === 0 && token.total_sell_amount > 0) {
        const avgSellPrice = token.total_sell_usd / token.total_sell_amount;
        const currentPrice = token.token_price_usd || 0;
        
        // If current price is at least 20% higher than average sell price, it's a paperhand
        if (currentPrice > avgSellPrice * 1.2 && currentPrice > 0) {
          paperhands.push({
            coin: token.token_symbol,
            soldAt: avgSellPrice,
            athPrice: currentPrice,
            potentialProfit: (currentPrice - avgSellPrice) * token.total_sell_amount,
            chain: token.chain || 'solana'
            });
          }
        }
    }

    // Sort paperhands by potential profit (biggest missed opportunity first)
    paperhands.sort((a, b) => b.potentialProfit - a.potentialProfit);

    // For biggest trading day and highest PNL day, we'll use approximations
    // since Cielo doesn't provide daily breakdowns in the aggregated endpoint
    // You could enhance this by fetching transaction data if needed
    const biggestTradingDay = {
      date: new Date().toLocaleDateString(),
      trades: Math.max(1, Math.floor(aggregated.tokens_traded / 365)) // Rough estimate
    };

    const highestPnLDay = {
      date: new Date().toLocaleDateString(),
      pnl: aggregated.realized_pnl_usd / 365 // Rough daily average
    };

  return {
      totalTrades: aggregated.tokens_traded,
      totalVolume: aggregated.total_buy_usd + aggregated.total_sell_usd,
      totalPnL: aggregated.realized_pnl_usd,
      winrate: aggregated.winrate,
      medianHoldTime: aggregated.median_holding_time_seconds,
      biggestWins: biggestWins.slice(0, 10),
      biggestLosses: biggestLosses.slice(0, 10),
      paperhands: paperhands.slice(0, 10),
      biggestTradingDay,
      highestPnLDay
    };
  } catch (error) {
    console.error('Error processing Cielo PNL data:', error);
    throw error;
  }
}

/**
 * Main function to fetch trading data
 * Uses Cielo's PNL API directly (trenches-wrapped approach)
 */
export async function fetchTradingData(
  walletAddress: string,
  network: 'solana' | 'evm'
): Promise<TradingData> {
  try {
    if (!CIELO_API_KEY) {
      throw new Error(
        'Cielo API key not configured. Please add VITE_CIELO_API_KEY to your environment variables.\n\n' +
        'Get your API key at: https://cielo.finance/'
      );
    }

    // For now, we'll focus on Solana (Cielo's primary chain)
    // EVM support can be added later if Cielo supports it
    if (network === 'evm') {
      throw new Error(
        'EVM chains are not yet supported with the Cielo API approach.\n' +
        'Please use Solana wallets for now.'
      );
    }

    console.log('✅ Using Cielo PNL API (trenches-wrapped approach)...');
    console.log(`Wallet: ${walletAddress}`);
    console.log(`Network: ${network}`);

    const processedData = await processCieloPNLData(walletAddress);

    // Validate that we got meaningful data
      if (!processedData || (processedData.totalTrades === 0 && processedData.totalVolume === 0)) {
      throw new Error(
        'No trading activity found for this wallet address.\n' +
        'This wallet may not have any trades, or the data may still be processing.'
      );
      }

      return {
        walletAddress,
      currency: 'USD', // Cielo returns everything in USD
      totalTrades: processedData.totalTrades || 0,
      totalVolume: processedData.totalVolume || 0,
      totalPnL: processedData.totalPnL || 0,
      winrate: processedData.winrate || 0,
      medianHoldTime: processedData.medianHoldTime || 0,
        biggestLosses: processedData.biggestLosses || [],
        biggestWins: processedData.biggestWins || [],
        paperhands: processedData.paperhands || [],
        biggestTradingDay: processedData.biggestTradingDay || {
          date: new Date().toLocaleDateString(),
          trades: 0
        },
        highestPnLDay: processedData.highestPnLDay || {
          date: new Date().toLocaleDateString(),
          pnl: 0
        }
      } as TradingData;
        } catch (error) {
    console.error('Error fetching trading data:', error);
    
    // Provide helpful error messages
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    // Log API key status for debugging
    console.error('API Key Status:', {
      hasCielo: !!CIELO_API_KEY,
      isProduction: import.meta.env.PROD
    });
    
    throw new Error(errorMessage);
  }
}

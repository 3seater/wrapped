import { TradingData } from '../types';

// API Configuration
const COVALENT_API_KEY = import.meta.env.VITE_COVALENT_API_KEY || '';
const HELIUS_API_KEY = import.meta.env.VITE_HELIUS_API_KEY || '';
const COINGECKO_API_KEY = import.meta.env.VITE_COINGECKO_API_KEY || 'CG-1RdhUX4XjLumxNrU2wf5r5Nm';
const CIELO_API_KEY = import.meta.env.VITE_CIELO_API_KEY || '';
// DexScreener doesn't require API key for public endpoints

// Log API key status (without exposing keys)
if (import.meta.env.PROD) {
  console.log('API Key Status (Production):', {
    hasHelius: !!HELIUS_API_KEY,
    hasCielo: !!CIELO_API_KEY,
    hasCovalent: !!COVALENT_API_KEY,
    hasCoinGecko: !!COINGECKO_API_KEY
  });
}

// Chain IDs (Covalent format)
const SOLANA_CHAIN_ID = 'solana-mainnet';
const EVM_CHAIN_IDS = {
  ethereum: 'eth-mainnet',
  bnb: 'bsc-mainnet',
  base: 'base-mainnet'
};

interface CovalentTransaction {
  tx_hash: string;
  block_signed_at: string;
  from_address: string;
  to_address: string;
  value: string;
  value_quote: number;
  gas_offered: number;
  gas_spent: number;
  gas_price: number;
  gas_quote: number;
  log_events: Array<{
    decoded: {
      name: string;
      params: Array<{ name: string; value: string }>;
    };
  }>;
}

interface CovalentResponse {
  data: {
    items: CovalentTransaction[];
    pagination: {
      has_more: boolean;
    };
  };
}

/**
 * Fetch transactions from Covalent API
 */
async function fetchCovalentTransactions(
  walletAddress: string,
  chainId: string,
  pageSize: number = 100
): Promise<CovalentTransaction[]> {
  if (!COVALENT_API_KEY) {
    throw new Error('Covalent API key not configured');
  }

  // Covalent API endpoint - using key in query param (their standard format)
  const url = `https://api.covalenthq.com/v1/${chainId}/address/${walletAddress}/transactions_v3/?page-size=${pageSize}&no-logs=false&key=${COVALENT_API_KEY}`;
  
  console.log('Fetching from Covalent:', url.replace(COVALENT_API_KEY, '***'));
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    });
    
    if (!response.ok) {
      // Try to get error details
      let errorText = '';
      try {
        errorText = await response.text();
      } catch (e) {
        errorText = 'Could not read error response';
      }
      console.error('Covalent API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        url: url.replace(COVALENT_API_KEY, '***')
      });
      
      // If 501, the endpoint might not exist for this chain
      if (response.status === 501) {
        throw new Error(`Covalent API: Endpoint not available for chain ${chainId}. This chain may not be supported.`);
      }
      
      throw new Error(`Covalent API error: ${response.status} ${response.statusText}`);
    }

    const data: CovalentResponse = await response.json();
    
    if (!data || !data.data) {
      console.warn('Unexpected Covalent response format:', data);
      return [];
    }
    
    return data.data.items || [];
  } catch (error) {
    console.error('Covalent fetch error:', error);
    throw error;
  }
}

/**
 * Fetch transactions from Cielo Finance API with pagination
 * Cielo provides enhanced transaction data with PNL calculations
 * Max 100 per request, but we can paginate using "starting_point" parameter
 */
async function fetchCieloTransactions(
  walletAddress: string,
  chain: 'solana' | 'ethereum' | 'base' | 'bsc' = 'solana'
): Promise<any[]> {
  if (!CIELO_API_KEY) {
    throw new Error('Cielo API key not configured');
  }

  // Map chain names to Cielo's format
  const chainMap: Record<string, string> = {
    solana: 'solana',
    ethereum: 'ethereum',
    base: 'base',
    bsc: 'bsc'
  };

  const cieloChain = chainMap[chain] || 'solana';
  
  let allTransactions: any[] = [];
  let startingPoint: string | undefined = undefined;
  let pageCount = 0;
  const maxPages = 20; // Safety limit (20 * 100 = 2000 transactions max)
  let hasMore = true;

  console.log('Fetching from Cielo with pagination...');
  
  while (hasMore && pageCount < maxPages) {
    // Build URL with pagination
    // In production, use full URL; in dev, use proxy
    const isProduction = import.meta.env.PROD;
    const baseUrl = isProduction 
      ? 'https://feed-api.cielo.finance/api/v1/feed'
      : '/api/cielo';
    
    let url = `${baseUrl}?wallet=${walletAddress}&chain=${cieloChain}&limit=100`;
    if (startingPoint) {
      url += `&starting_point=${startingPoint}`;
    }
    
    console.log(`Cielo page ${pageCount + 1}:`, url.replace(CIELO_API_KEY, '***'));
    
    const headers: HeadersInit = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };
    
    // In production, add API key as header (per Cielo docs)
    if (isProduction && CIELO_API_KEY) {
      headers['X-API-KEY'] = CIELO_API_KEY;
    } else if (!isProduction) {
      // In dev, pass API key as query param (proxy will handle it)
      url += `&apiKey=${CIELO_API_KEY}`;
    }
    
    const response = await fetch(url, {
      method: 'GET',
      headers: headers
    });
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Could not read error');
      // If it's the first page and we get an error, throw it
      if (pageCount === 0) {
        console.error('Cielo API error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        throw new Error(`Cielo API error: ${response.status} ${response.statusText}`);
      } else {
        // If pagination fails, just return what we have
        console.warn('Cielo pagination failed, returning transactions fetched so far');
        break;
      }
    }

    const data = await response.json();
    
    // Cielo returns {status: 'ok', data: {...}} format
    let pageTransactions: any[] = [];
    
    if (data && data.status === 'ok' && data.data) {
      // Check if data.data is an array
      if (Array.isArray(data.data)) {
        pageTransactions = data.data;
      }
      // Check if data.data has a transactions array
      else if (data.data.transactions && Array.isArray(data.data.transactions)) {
        pageTransactions = data.data.transactions;
      }
      // Check if data.data has a feed array
      else if (data.data.feed && Array.isArray(data.data.feed)) {
        pageTransactions = data.data.feed;
      }
      // Check if data.data has an items array (Cielo's format)
      else if (data.data.items && Array.isArray(data.data.items)) {
        pageTransactions = data.data.items;
      }
      
      // Check for pagination token/cursor in response
      // Cielo might return a "next" or "cursor" field for pagination
      // Reset startingPoint for this page
      startingPoint = undefined;
      
      if (data.data.next || data.data.cursor || data.data.starting_point) {
        startingPoint = data.data.next || data.data.cursor || data.data.starting_point;
      } else if (data.next || data.cursor) {
        startingPoint = data.next || data.cursor;
      }
      
      // Log response structure for debugging (first page only)
      if (pageCount === 0) {
        console.log('Cielo API response structure:', {
          hasData: !!data.data,
          dataKeys: data.data ? Object.keys(data.data) : [],
          topLevelKeys: Object.keys(data),
          sampleData: JSON.stringify(data).substring(0, 500)
        });
      }
    }
    // Fallback: check if it's a direct array
    else if (data && Array.isArray(data)) {
      pageTransactions = data;
    }
    else if (data && data.transactions && Array.isArray(data.transactions)) {
      pageTransactions = data.transactions;
    }
    
    if (pageTransactions.length > 0) {
      console.log(`Cielo page ${pageCount + 1}: ${pageTransactions.length} transactions`);
      console.log(`  Pagination token found: ${!!startingPoint}`);
      if (startingPoint) {
        console.log(`  Next starting_point: ${startingPoint}`);
      } else {
        // Log full response to see what we're getting
        console.log(`  ⚠️  No pagination token found. Full response structure:`, {
          status: data?.status,
          topLevelKeys: Object.keys(data || {}),
          dataKeys: data?.data ? Object.keys(data.data) : [],
          dataType: Array.isArray(data?.data) ? 'array' : typeof data?.data,
          sampleResponse: JSON.stringify(data).substring(0, 1000)
        });
      }
      console.log(`  First tx timestamp: ${pageTransactions[0]?.timestamp || 'N/A'}`);
      console.log(`  Last tx timestamp: ${pageTransactions[pageTransactions.length - 1]?.timestamp || 'N/A'}`);
      allTransactions.push(...pageTransactions);
      
      // If we got less than 100, we've reached the end
      // Also check if there's no pagination token
      if (pageTransactions.length < 100) {
        console.log(`  Got less than 100 transactions, reached end`);
        hasMore = false;
      } else if (!startingPoint) {
        console.log(`  ⚠️  WARNING: Got 100 transactions but no pagination token - might be missing more transactions!`);
        console.log(`  This likely means Cielo API doesn't support pagination or we need a different approach.`);
        console.log(`  Consider using Helius API instead which supports proper pagination.`);
        hasMore = false; // Stop but warn that we might be missing data
      } else {
        console.log(`  ✅ Continuing to next page with starting_point: ${startingPoint}`);
        pageCount++;
      }
    } else {
      // No transactions in this page, we're done
      console.log(`  No transactions in this page, stopping`);
      hasMore = false;
    }
  }
  
  if (allTransactions.length > 0) {
    console.log(`\n=== Cielo Pagination Summary ===`);
    console.log(`Total transactions fetched: ${allTransactions.length}`);
    console.log(`Total pages fetched: ${pageCount + 1}`);
    console.log(`Date range: ${allTransactions.length > 0 ? new Date(Math.min(...allTransactions.map(tx => (tx.timestamp || 0) * 1000))).toISOString() : 'N/A'} to ${allTransactions.length > 0 ? new Date(Math.max(...allTransactions.map(tx => (tx.timestamp || 0) * 1000))).toISOString() : 'N/A'}`);
    console.log(`================================\n`);
    return allTransactions;
  }
  
  console.warn('No transactions retrieved from Cielo');
  return [];
}

/**
 * Fetch Solana transactions from Helius API using new getTransactionsForAddress method
 * Supports pagination to fetch ALL transactions (not just 100)
 */
async function fetchHeliusTransactions(
  walletAddress: string
): Promise<any[]> {
  if (!HELIUS_API_KEY) {
    throw new Error('Helius API key not configured');
  }

  let allTransactions: any[] = [];
  let before: string | null = null;
  let hasMore = true;
  let pageCount = 0;
  const maxPages = 50; // Safety limit to prevent infinite loops

  console.log('Fetching all transactions from Helius with pagination...');
  
  // Use Helius v0 API endpoint with pagination support
  // Try to fetch multiple pages by using before parameter if available
  while (hasMore && pageCount < maxPages) {
    try {
      // Add delay between requests to avoid rate limiting (429 errors)
      if (pageCount > 0) {
        await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay between pages
      }
      
      // Request token balance changes and native balance changes in the response
      let standardUrl = `https://api.helius.xyz/v0/addresses/${walletAddress}/transactions?api-key=${HELIUS_API_KEY}&type=SWAP&type=TRANSFER`;
      
      // Add pagination parameter if we have a before signature
      if (before) {
        standardUrl += `&before=${before}`;
      }
      
      console.log(`Helius page ${pageCount + 1}...`);
      
      const standardResponse = await fetch(standardUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      
      if (!standardResponse.ok) {
        if (standardResponse.status === 429) {
          console.warn(`⚠️  Rate limited (429). Waiting 2 seconds before retry...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          // Retry once
          const retryResponse = await fetch(standardUrl, {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
          });
          if (!retryResponse.ok) {
            console.warn(`Helius rate limit persists. Stopping pagination at ${pageCount} pages.`);
            break;
          }
          // Continue with retry response
          const standardData = await retryResponse.json();
          if (Array.isArray(standardData) && standardData.length > 0) {
            console.log(`Helius page ${pageCount + 1} (retry): ${standardData.length} transactions`);
            allTransactions.push(...standardData);
            const lastTx = standardData[standardData.length - 1];
            const lastSignature = lastTx.signature || lastTx.transaction?.signatures?.[0];
            if (lastSignature && standardData.length > 0) {
              before = lastSignature;
              hasMore = true;
              pageCount++;
            } else {
              hasMore = false;
            }
          } else {
            hasMore = false;
          }
          continue;
        }
        if (pageCount === 0) {
          console.warn(`Helius API request failed with status ${standardResponse.status}`);
        } else {
          console.log(`Helius pagination reached end (status ${standardResponse.status})`);
        }
        break;
      }
      
      const standardData = await standardResponse.json();
      
      if (Array.isArray(standardData) && standardData.length > 0) {
        console.log(`Helius page ${pageCount + 1}: ${standardData.length} transactions`);
        allTransactions.push(...standardData);
        
        // Get the last signature for pagination
        const lastTx = standardData[standardData.length - 1];
        const lastSignature = lastTx.signature || lastTx.transaction?.signatures?.[0];
        
        // If we got transactions and have a signature, try to get more
        if (lastSignature && standardData.length > 0) {
          before = lastSignature;
          hasMore = true;
          pageCount++;
        } else {
          // No more signatures or empty result, we're done
          hasMore = false;
        }
      } else {
        // No transactions returned, we're done
        hasMore = false;
      }
    } catch (error) {
      console.warn('Helius pagination request failed:', error);
      // If it's the first page, we should still try to continue
      if (pageCount === 0) {
        break;
      } else {
        // For subsequent pages, just stop
        hasMore = false;
      }
    }
  }

  if (allTransactions.length > 0) {
    console.log(`Total unique transactions fetched: ${allTransactions.length} (${pageCount} pages)`);
    return allTransactions;
  }

  console.warn('No transactions retrieved from Helius');
  return [];
}

/**
 * Get token price from DexScreener (best for Solana tokens)
 */
async function getTokenPriceFromDexScreener(tokenAddress: string): Promise<number> {
  try {
    const url = `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      return 0;
    }
    
    const data = await response.json();
    // DexScreener returns pairs, get the price from the first/largest pair
    if (data.pairs && data.pairs.length > 0) {
      // Sort by liquidity and get the most liquid pair
      const sortedPairs = data.pairs.sort((a: any, b: any) => 
        (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
      );
      const price = parseFloat(sortedPairs[0].priceUsd || '0');
      return price;
    }
    return 0;
  } catch (error) {
    return 0;
  }
}

/**
 * Get current token price - try DexScreener first (faster for Solana), then CoinGecko
 * Includes retry logic for rate limiting
 */
async function getTokenPriceByAddress(contractAddress: string, chain: 'solana' | 'ethereum' = 'solana', retries: number = 3): Promise<number> {
  // For Solana, use DexScreener first (faster and more complete, no rate limits)
  if (chain === 'solana') {
    const dexPrice = await getTokenPriceFromDexScreener(contractAddress);
    if (dexPrice > 0) {
      return dexPrice;
    }
  }
  
  // Fallback to CoinGecko with retry logic
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const chainId = chain === 'solana' ? 'solana' : 'ethereum';
      const url = `https://api.coingecko.com/api/v3/simple/token_price/${chainId}?contract_addresses=${contractAddress}&vs_currencies=usd${COINGECKO_API_KEY ? `&x_cg_demo_api_key=${COINGECKO_API_KEY}` : ''}`;
      
      const response = await fetch(url);
      
      if (response.status === 429) {
        // Rate limited - wait and retry with exponential backoff
        const waitTime = Math.min(1000 * Math.pow(2, attempt), 10000); // Max 10 seconds
        if (attempt < retries - 1) {
          console.warn(`CoinGecko rate limited, waiting ${waitTime}ms before retry ${attempt + 1}/${retries}`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
        return 0;
      }
      
      if (!response.ok) {
        return 0;
      }
      
      const data = await response.json();
      const price = data[contractAddress.toLowerCase()]?.usd || 0;
      return price;
    } catch (error) {
      if (attempt < retries - 1) {
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
        continue;
      }
      return 0;
    }
  }
  
  return 0;
}



/**
 * Get historical token price from CoinGecko
 */
async function getHistoricalTokenPrice(contractAddress: string, timestamp: number, chain: 'solana' | 'ethereum' = 'solana'): Promise<number> {
  try {
    const chainId = chain === 'solana' ? 'solana' : 'ethereum';
    const date = new Date(timestamp * 1000);
    const dateStr = `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`;

    const url = `https://api.coingecko.com/api/v3/coins/${chainId}/contract/${contractAddress}/history?date=${dateStr}${COINGECKO_API_KEY ? `&x_cg_demo_api_key=${COINGECKO_API_KEY}` : ''}`;

    const response = await fetch(url);
    if (!response.ok) {
      // If historical price not available, try current price
      return await getTokenPriceByAddress(contractAddress, chain);
    }

    const data = await response.json();
    return data.market_data?.current_price?.usd || 0;
  } catch (error) {
    console.error('Error fetching historical token price:', error);
    // Fallback to current price
    return await getTokenPriceByAddress(contractAddress, chain);
  }
}

/**
 * Get token price (current or historical)
 * @deprecated Not currently used
 */
// @ts-expect-error - Unused function, kept for future use
async function _getTokenPrice(tokenId: string, timestamp?: number): Promise<number> {
  try {
    if (timestamp) {
      // Try historical price first
      const historical = await getHistoricalTokenPrice(tokenId, timestamp);
      if (historical > 0) return historical;
    }

    // Fallback to current price
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${tokenId}&vs_currencies=usd${COINGECKO_API_KEY ? `&x_cg_demo_api_key=${COINGECKO_API_KEY}` : ''}`;
    const response = await fetch(url);
    const data = await response.json();
    return data[tokenId]?.usd || 0;
  } catch (error) {
    console.error('Error fetching token price:', error);
    return 0;
  }
}

/**
 * Process Cielo Finance transactions
 * Cielo provides enhanced data with PNL already calculated - use it directly
 */
async function processCieloTransactions(transactions: any[], walletAddress: string): Promise<Partial<TradingData>> {
  if (transactions.length === 0) {
    return {
      totalTrades: 0,
      totalVolume: 0,
      totalPnL: 0,
      biggestLosses: [],
      biggestWins: [],
      paperhands: [],
      biggestTradingDay: { date: new Date().toLocaleDateString(), trades: 0 },
      highestPnLDay: { date: new Date().toLocaleDateString(), pnl: 0 }
    };
  }

  // Log first transaction to see Cielo's structure
  const firstTx = transactions[0];
  console.log('Cielo transaction sample:', JSON.stringify(firstTx, null, 2).substring(0, 1000));
  console.log('Cielo transaction keys:', Object.keys(firstTx));
  
  // Check for Cielo's swap format (token0_* and token1_* fields)
  const SOL_MINT = 'So11111111111111111111111111111111111111112'; // Wrapped SOL
  const hasCieloSwapFormat = firstTx.token0_address !== undefined && 
                             firstTx.token1_address !== undefined &&
                             firstTx.tx_type === 'swap';
  
  console.log('Cielo format check:', {
    hasToken0: !!firstTx.token0_address,
    hasToken1: !!firstTx.token1_address,
    txType: firstTx.tx_type,
    isSwap: hasCieloSwapFormat
  });

  // If Cielo provides swap format, parse it properly
  if (hasCieloSwapFormat) {
    // SIMPLE TRACKING: Just track total spent and received per token
    // { tokenAddress: { symbol: string, imageUrl: string | null, totalSpentUSD: number, totalReceivedUSD: number, totalTokensSold: number, lastTradeDate: Date } }
    const tokenStats: Record<string, { 
      symbol: string;
      imageUrl: string | null;
      totalSpentUSD: number;  // Total USD spent on ALL buys
      totalReceivedUSD: number; // Total USD received from ALL sells
      totalTokensSold: number; // Total tokens sold (for cost basis calculation)
      lastTradeDate: Date 
    }> = {};
    
    // Cache for token images (will be populated if needed)
    const tokenImageCacheCielo: Record<string, string> = {};
    
    // Track positions to calculate cost basis of sold tokens
    const positions: Record<string, { amount: number; totalCostUSD: number }> = {};
    
    let totalVolumeSOL = 0;
    let totalVolumeUSD = 0;
    let totalPnL = 0;
    const tradesByDate: Record<string, { count: number; pnl: number }> = {};

    // Sort transactions chronologically (oldest first) so buys are processed before sells
    const sortedTransactions = [...transactions].sort((a, b) => {
      const timeA = a.timestamp || a.block_time || a.blockTime || 0;
      const timeB = b.timestamp || b.block_time || b.blockTime || 0;
      return timeA - timeB; // Oldest first
    });
    
    // Debug: Log first few transactions to verify sorting
    if (sortedTransactions.length > 0) {
      console.log('First 5 transactions after sorting (oldest first):');
      sortedTransactions.slice(0, 5).forEach((tx, idx) => {
        const ts = tx.timestamp || tx.block_time || tx.blockTime || 0;
        const date = ts ? new Date(ts * 1000).toISOString() : 'no timestamp';
        const isSell = tx.is_sell === true;
        const symbol = tx.token0_symbol || tx.token1_symbol || 'unknown';
        console.log(`  ${idx + 1}. ${isSell ? 'SELL' : 'BUY'} ${symbol} at ${date} (timestamp: ${ts})`);
      });
    }

    // Process transactions in chronological order
    sortedTransactions.forEach((tx) => {
      const timestamp = tx.timestamp ? new Date(tx.timestamp * 1000) : new Date();
      const date = timestamp.toLocaleDateString();
      
      if (!tradesByDate[date]) {
        tradesByDate[date] = { count: 0, pnl: 0 };
      }
      tradesByDate[date].count++;

      // Determine which token is SOL and which is the traded token
      // Check by address first, then by symbol as fallback
      const token0Symbol = (tx.token0_symbol || '').toUpperCase();
      const token1Symbol = (tx.token1_symbol || '').toUpperCase();
      const token0IsSOL = tx.token0_address === SOL_MINT || 
                          token0Symbol === 'SOL' || 
                          token0Symbol === 'WRAPPED SOL' ||
                          token0Symbol.includes('SOL');
      const token1IsSOL = tx.token1_address === SOL_MINT || 
                          token1Symbol === 'SOL' || 
                          token1Symbol === 'WRAPPED SOL' ||
                          token1Symbol.includes('SOL');
      
      // Get amounts and USD values
      const token0AmountUSD = parseFloat(tx.token0_amount_usd || '0');
      const token1AmountUSD = parseFloat(tx.token1_amount_usd || '0');
      const token0Amount = parseFloat(tx.token0_amount || '0');
      const token1Amount = parseFloat(tx.token1_amount || '0');
      
      // Volume is the larger of the two USD amounts (the trade value)
      const tradeVolumeUSD = Math.max(token0AmountUSD, token1AmountUSD);
      totalVolumeUSD += tradeVolumeUSD;
      
      // Convert to SOL for display (use SOL amount if available, otherwise estimate)
      if (token0IsSOL) {
        totalVolumeSOL += token0Amount;
      } else if (token1IsSOL) {
        totalVolumeSOL += token1Amount;
      } else {
        // Neither is SOL, estimate from USD
        totalVolumeSOL += tradeVolumeUSD / 150; // Estimate SOL price
      }

      // Determine buy/sell based on is_sell flag and which token is SOL
      // The traded token is always the NON-SOL token
      // If is_sell is true, we're selling the non-SOL token for SOL
      // If is_sell is false, we're buying the non-SOL token with SOL
      
      // Identify which token is SOL and which is the traded token
      let tradedTokenAddress: string;
      let tradedTokenAmount: number;
      let tradedTokenSymbol: string;
      let solAmount: number;
      let solAmountUSD: number;
      
      // CRITICAL: The traded token is ALWAYS the NON-SOL token
      if (token0IsSOL && !token1IsSOL) {
        // token0 is SOL, token1 is the traded token
        tradedTokenAddress = tx.token1_address;
        tradedTokenAmount = token1Amount;
        tradedTokenSymbol = tx.token1_symbol || 'UNKNOWN';
        solAmount = token0Amount;
        solAmountUSD = token0AmountUSD;
      } else if (token1IsSOL && !token0IsSOL) {
        // token1 is SOL, token0 is the traded token
        tradedTokenAddress = tx.token0_address;
        tradedTokenAmount = token0Amount;
        tradedTokenSymbol = tx.token0_symbol || 'UNKNOWN';
        solAmount = token1Amount;
        solAmountUSD = token1AmountUSD;
      } else {
        // Edge case: neither is SOL or both are SOL (shouldn't happen for normal swaps)
        // Skip this transaction
        console.warn(`Skipping swap transaction - SOL identification issue: token0=${tx.token0_symbol} (${tx.token0_address.slice(0, 8)}), token1=${tx.token1_symbol} (${tx.token1_address.slice(0, 8)})`);
        return;
      }
      
      // is_sell: true = selling token for SOL, false = buying token with SOL
      const tradeType: 'buy' | 'sell' = tx.is_sell === true ? 'sell' : 'buy';
      
      // Final safety check: skip if traded token is SOL or stablecoins (USDC, USDT, etc.)
      const stablecoins = ['USDC', 'USDT', 'USD', 'USD1', 'BUSD', 'DAI', 'FIDA', 'PYUSD']; // Common stablecoins
      const isStablecoin = stablecoins.includes(tradedTokenSymbol.toUpperCase());
      const isSOL = tradedTokenAddress === SOL_MINT || tradedTokenSymbol === 'SOL' || tradedTokenSymbol === 'Wrapped SOL';
      
      if (isSOL || isStablecoin) {
        console.log(`Skipping ${isSOL ? 'SOL' : 'stablecoin'} trade: ${tradedTokenSymbol} (${tradedTokenAddress.slice(0, 8)})`);
        return; // Skip this transaction
      }
      
      let tradePnL = 0;

      // Initialize token stats if needed
      if (!tokenStats[tradedTokenAddress]) {
        // Try to get image from cache or fetch it
        let imageUrl = tokenImageCacheCielo[tradedTokenAddress] || null;
        if (!imageUrl) {
          // Try to fetch image (async, but we'll cache it)
          // For now, set to null and it can be fetched later if needed
        }
        tokenStats[tradedTokenAddress] = {
          symbol: tradedTokenSymbol,
          imageUrl: imageUrl,
          totalSpentUSD: 0,
          totalReceivedUSD: 0,
          totalTokensSold: 0,
          lastTradeDate: timestamp
        };
      }
      tokenStats[tradedTokenAddress].lastTradeDate = timestamp;

      if (tradeType === 'buy') {
        // Buying token with SOL - track total spent
        if (!positions[tradedTokenAddress]) {
          positions[tradedTokenAddress] = { amount: 0, totalCostUSD: 0 };
        }
        const pos = positions[tradedTokenAddress];
        pos.amount += tradedTokenAmount;
        pos.totalCostUSD += solAmountUSD;
        
        // Track total USD spent on this token
        tokenStats[tradedTokenAddress].totalSpentUSD += solAmountUSD;
        
        console.log(`Buy: ${tradedTokenSymbol} (${tradedTokenAddress.slice(0, 8)}) - ${tradedTokenAmount.toFixed(2)} tokens for ${solAmount.toFixed(4)} SOL ($${solAmountUSD.toFixed(2)})`);
        console.log(`  Total spent on ${tradedTokenSymbol}: $${tokenStats[tradedTokenAddress].totalSpentUSD.toFixed(2)}`);
      } else if (tradeType === 'sell') {
        // Selling token for SOL - track total received and calculate cost basis
        const revenueUSD = solAmountUSD;
        
        // Track total USD received from this token
        tokenStats[tradedTokenAddress].totalReceivedUSD += revenueUSD;
        tokenStats[tradedTokenAddress].totalTokensSold += tradedTokenAmount;
        
        console.log(`Sell: ${tradedTokenSymbol} (${tradedTokenAddress.slice(0, 8)}) - ${tradedTokenAmount.toFixed(2)} tokens for ${solAmount.toFixed(4)} SOL ($${solAmountUSD.toFixed(2)})`);
        console.log(`  Total received from ${tradedTokenSymbol}: $${tokenStats[tradedTokenAddress].totalReceivedUSD.toFixed(2)}`);
        
        // Update position for tracking (to know if fully sold)
        // Use FIFO: when selling, reduce position proportionally
        let costBasisUSD = 0;
        if (positions[tradedTokenAddress] && positions[tradedTokenAddress].amount > 0) {
          const pos = positions[tradedTokenAddress];
          // Calculate cost basis for the amount sold (proportional to current position)
          // IMPORTANT: Calculate BEFORE updating position
          costBasisUSD = (tradedTokenAmount / pos.amount) * pos.totalCostUSD;
          
          // Update position after calculating cost basis
          pos.amount -= tradedTokenAmount;
          pos.totalCostUSD -= costBasisUSD;
          
          // Round to avoid floating point errors
          if (pos.amount < 0.0001) {
            pos.amount = 0;
          }
          if (pos.totalCostUSD < 0.01) {
            pos.totalCostUSD = 0;
          }
          
          if (pos.amount <= 0) {
            console.log(`  Position fully closed for ${tradedTokenSymbol}! Remaining: ${pos.amount.toFixed(2)} tokens, $${pos.totalCostUSD.toFixed(2)} cost`);
            delete positions[tradedTokenAddress];
          } else {
            console.log(`  Position after sell: ${pos.amount.toFixed(2)} tokens remaining, $${pos.totalCostUSD.toFixed(2)} cost remaining`);
          }
        } else {
          // No position found - this means all tokens were sold or buy was outside transaction window
          // Estimate cost basis as 0 (can't calculate accurately without position)
          console.log(`  No position found for ${tradedTokenSymbol} - all tokens sold or buy outside window`);
          costBasisUSD = 0;
        }
        
        // Calculate PNL for this trade (for daily tracking)
        // Use the cost basis we calculated above
        tradePnL = revenueUSD - costBasisUSD;
        tradesByDate[date].pnl += tradePnL;
      }
    });

    // Calculate PNL per token: Total Received - Total Spent
    // Show realized PNL for all tokens (even if position is still open)
    const wins: Array<{ coin: string; profit: number; date: Date; chain?: string }> = [];
    const losses: Array<{ coin: string; loss: number; date: Date; chain?: string }> = [];
    
    // Calculate total PNL from all tokens
    let calculatedTotalPnL = 0;
    
    // Filter out stablecoins from wins/losses
    const stablecoins = ['USDC', 'USDT', 'USD', 'BUSD', 'DAI', 'FIDA'];
    
    Object.entries(tokenStats).forEach(([tokenAddress, stats]) => {
      // Skip stablecoins - they shouldn't be in wins/losses
      const isStablecoin = stablecoins.includes(stats.symbol.toUpperCase());
      if (isStablecoin) {
        console.log(`Skipping stablecoin ${stats.symbol} from wins/losses`);
        return;
      }
      
      // Calculate REALIZED PNL correctly:
      // Always show realized PNL in top trades, regardless of whether position is open or closed
      const isFullySold = !positions[tokenAddress] || (positions[tokenAddress] && positions[tokenAddress].amount <= 0.0001);
      
      let tokenPnL = 0;
      if (isFullySold) {
        // Fully sold: Simple calculation - Total Received - Total Spent
        tokenPnL = stats.totalReceivedUSD - stats.totalSpentUSD;
      } else {
        // Partially sold: Calculate cost basis of only the tokens that were sold
        // Use average cost method: cost basis of sold = (tokens sold / total tokens ever held) * total cost
        const pos = positions[tokenAddress];
        if (pos && pos.amount > 0 && stats.totalTokensSold > 0) {
          // Total tokens that were ever in position = current amount + tokens sold
          const totalTokensEverHeld = pos.amount + stats.totalTokensSold;
          if (totalTokensEverHeld > 0) {
            // Average cost per token = total cost / total tokens
            const avgCostPerToken = stats.totalSpentUSD / totalTokensEverHeld;
            // Cost basis of sold tokens = tokens sold * average cost per token
            const costBasisOfSold = stats.totalTokensSold * avgCostPerToken;
            // Realized PNL = Revenue from sells - Cost basis of sold tokens
            tokenPnL = stats.totalReceivedUSD - costBasisOfSold;
          } else {
            // Fallback
            tokenPnL = stats.totalReceivedUSD - stats.totalSpentUSD;
          }
        } else {
          // No position or no tokens sold - use simple calculation
          tokenPnL = stats.totalReceivedUSD - stats.totalSpentUSD;
        }
      }
      
      // ALWAYS include realized PNL in wins/losses and total PNL (regardless of open/closed)
      // If there are any sells (totalReceivedUSD > 0), we have realized PNL to report
      const hasRealizedPnL = stats.totalReceivedUSD > 0;
      
      if (hasRealizedPnL) {
        // Always add to total PNL (realized PNL counts regardless of position status)
        calculatedTotalPnL += tokenPnL;
        
        // Add to wins or losses based on PNL value
        // Include even if position is still open - realized PNL still counts
        if (tokenPnL > 0) {
          wins.push({
            coin: stats.symbol,
            profit: tokenPnL,
            date: stats.lastTradeDate,
            chain: 'solana',
            imageUrl: stats.imageUrl || undefined,
            mintAddress: tokenAddress
          } as typeof wins[0]);
        } else if (tokenPnL < 0) {
          losses.push({
            coin: stats.symbol,
            loss: tokenPnL,
            date: stats.lastTradeDate,
            chain: 'solana',
            imageUrl: stats.imageUrl || undefined,
            mintAddress: tokenAddress
          } as typeof losses[0]);
        }
        // Note: If tokenPnL === 0, we don't add to wins/losses but still count it in totalPnL above
      }
      
      // Log all tokens for debugging (including stablecoins for visibility)
      // Reuse isFullySold from above (line 646)
      console.log(`${stats.symbol} (${tokenAddress.slice(0, 8)}): Spent $${stats.totalSpentUSD.toFixed(2)}, Received $${stats.totalReceivedUSD.toFixed(2)}, PNL: $${tokenPnL.toFixed(2)} ${isFullySold ? '(CLOSED)' : '(OPEN)'} ${isStablecoin ? '[STABLECOIN - EXCLUDED]' : ''}`);
    });
    
    // Use calculated PNL instead of accumulated
    totalPnL = calculatedTotalPnL;
    
    const sortedWins = wins.sort((a, b) => b.profit - a.profit).slice(0, 5);
    const sortedLosses = losses.sort((a, b) => a.loss - b.loss).slice(0, 5);
    const biggestTradingDay = Object.entries(tradesByDate)
      .sort(([, a], [, b]) => b.count - a.count)[0] || ['Unknown', { count: 0, pnl: 0 }];
    const highestPnLDay = Object.entries(tradesByDate)
      .sort(([, a], [, b]) => b.pnl - a.pnl)[0] || ['Unknown', { count: 0, pnl: 0 }];

    console.log(`\n=== Cielo Processing Complete ===`);
    console.log(`Total transactions processed: ${transactions.length}`);
    console.log(`Total volume: ${totalVolumeSOL.toFixed(2)} SOL ($${totalVolumeUSD.toFixed(2)})`);
    console.log(`Total PNL (realized only): $${totalPnL.toFixed(2)}`);
    console.log(`Wins: ${wins.length}, Losses: ${losses.length}`);
    console.log(`Remaining positions (unrealized): ${Object.keys(positions).length} tokens`);
    console.log(`Top 5 Wins:`, sortedWins.map(w => `${w.coin}: $${w.profit.toFixed(2)}`));
    console.log(`Top 5 Losses:`, sortedLosses.map(l => `${l.coin}: $${l.loss.toFixed(2)}`));
    console.log('===================================\n');

    return {
      totalTrades: transactions.length,
      totalVolume: totalVolumeSOL, // Return in SOL for Solana
      totalPnL,
      biggestWins: sortedWins.length > 0 ? sortedWins : [],
      biggestLosses: sortedLosses.length > 0 ? sortedLosses : [],
      paperhands: [],
      biggestTradingDay: { date: biggestTradingDay[0], trades: biggestTradingDay[1].count },
      highestPnLDay: { date: highestPnLDay[0], pnl: highestPnLDay[1].pnl }
    };
  }

  // If Cielo returns raw transaction data (like Helius), use async parser with prices
  console.log('Cielo returned raw transaction data, using enhanced Helius parser with prices');
  return await processHeliusTransactionsWithPrices(transactions, walletAddress);
}

/**
 * Process Helius Solana transactions with CoinGecko price data
 * Calculates accurate PNL, wins, and losses
 */
async function processHeliusTransactionsWithPrices(transactions: any[], walletAddress: string): Promise<Partial<TradingData>> {
  if (transactions.length === 0) {
    return {
      totalTrades: 0,
      totalVolume: 0,
      totalPnL: 0,
      biggestLosses: [],
      biggestWins: [],
      paperhands: [],
      biggestTradingDay: { date: new Date().toLocaleDateString(), trades: 0 },
      highestPnLDay: { date: new Date().toLocaleDateString(), pnl: 0 }
    };
  }

  // Use same approach as Cielo: Track total spent/received per token, then calculate aggregated PnL
  // { tokenAddress: { symbol: string, imageUrl: string | null, totalSpentSOL: number, totalReceivedSOL: number, totalTokensSold: number, lastTradeDate: Date } }
  const tokenStats: Record<string, { 
    symbol: string;
    imageUrl: string | null;
    totalSpentSOL: number;  // Total SOL spent on ALL buys
    totalReceivedSOL: number; // Total SOL received from ALL sells
    totalSpentUSD: number;  // Total USD spent (converted at time of each buy using historical price)
    totalReceivedUSD: number; // Total USD received (converted at time of each sell using historical price)
    totalTokensSold: number; // Total tokens sold (for cost basis calculation)
    lastTradeDate: Date 
  }> = {};
  
  // Cache for token symbols to avoid repeated API calls
  const tokenSymbolCache: Record<string, string> = {};
  
  // Cache for token images to avoid repeated API calls
  const tokenImageCache: Record<string, string> = {};
  
  // Track positions to calculate cost basis of sold tokens
  const positions: Record<string, { amount: number; totalCostSOL: number }> = {};
  
  let totalVolumeSOL = 0; // Track in SOL directly
  let totalVolumeUSD = 0; // Also track USD for PNL calculations
  const tradesByDate: Record<string, { count: number; pnl: number }> = {};
  
  // Helper to get token symbol using Helius getAsset (best method - gets from on-chain metadata)
  const getTokenSymbolFromHelius = async (tokenMint: string): Promise<string> => {
    if (tokenSymbolCache[tokenMint]) {
      return tokenSymbolCache[tokenMint];
    }
    
    // Try Helius getAsset method first (gets on-chain metadata)
    // Use the correct RPC endpoint for DAS API
    if (HELIUS_API_KEY) {
      try {
        const rpcUrl = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
        const response = await fetch(rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: '1',
            method: 'getAsset',
            params: { id: tokenMint }
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          const asset = data.result;
          if (asset) {
            // Try multiple locations for symbol/name
            let symbol = null;
            
            // Check content.metadata (NFTs and some tokens)
            if (asset?.content?.metadata) {
              symbol = asset.content.metadata.symbol || asset.content.metadata.name;
            }
            
            // Check top-level metadata
            if (!symbol && asset?.metadata) {
              symbol = asset.metadata.symbol || asset.metadata.name;
            }
            
            // Check tokenInfo (SPL tokens)
            if (!symbol && asset?.tokenInfo) {
              symbol = asset.tokenInfo.symbol || asset.tokenInfo.name;
            }
            
            // Check interface - skip NFTs
            if (asset?.interface === 'V1_NFT' || asset?.interface === 'V1_PRINT') {
              // This is an NFT, not a fungible token - skip
              return tokenMint.slice(0, 8) + '...';
            }
            
            if (symbol) {
              tokenSymbolCache[tokenMint] = symbol;
              return symbol;
            }
          }
        }
      } catch (error) {
        // Fall through to DexScreener
      }
    }
    
    // Try Jupiter API for token list (very comprehensive)
    try {
      const jupUrl = `https://tokens.jup.ag/token/${tokenMint}`;
      const jupResponse = await fetch(jupUrl);
      if (jupResponse.ok) {
        const jupData = await jupResponse.json();
        if (jupData.symbol) {
          tokenSymbolCache[tokenMint] = jupData.symbol;
          // Also cache image if available
          if (jupData.logoURI && !tokenImageCache[tokenMint]) {
            tokenImageCache[tokenMint] = jupData.logoURI;
          }
          return jupData.symbol;
        }
      }
    } catch (error) {
      // Fall through to DexScreener
    }
    
    // Fallback to DexScreener
    try {
      const url = `https://api.dexscreener.com/latest/dex/tokens/${tokenMint}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (data.pairs && data.pairs.length > 0) {
          const sortedPairs = data.pairs.sort((a: any, b: any) => 
            (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
          );
          const symbol = sortedPairs[0].baseToken?.symbol || sortedPairs[0].quoteToken?.symbol;
          if (symbol) {
            tokenSymbolCache[tokenMint] = symbol;
            return symbol;
          }
        }
      }
    } catch (error) {
      // Ignore errors, fall back to address
    }
    
    // Fallback to address
    const fallback = tokenMint.slice(0, 8) + '...';
    tokenSymbolCache[tokenMint] = fallback;
    return fallback;
  };

  // Helper to get token image URL from multiple sources
  const getTokenImage = async (tokenMint: string): Promise<string | null> => {
    if (tokenImageCache[tokenMint]) {
      return tokenImageCache[tokenMint];
    }
    
    // Try Helius getAsset first (gets on-chain metadata including images)
    if (HELIUS_API_KEY) {
      try {
        const rpcUrl = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
        const response = await fetch(rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: '1',
            method: 'getAsset',
            params: { id: tokenMint }
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          const asset = data.result;
          if (asset) {
            // Check multiple locations for image
            let imageUrl = null;
            
            // Check content.files (NFTs and some tokens)
            if (asset?.content?.files && asset.content.files.length > 0) {
              imageUrl = asset.content.files[0].uri || asset.content.files[0].cdn_uri;
            }
            
            // Check content.links
            if (!imageUrl && asset?.content?.links) {
              imageUrl = asset.content.links.image;
            }
            
            // Check top-level image
            if (!imageUrl && asset?.image) {
              imageUrl = asset.image;
            }
            
            // Check metadata image
            if (!imageUrl && asset?.content?.metadata?.image) {
              imageUrl = asset.content.metadata.image;
            }
            
            if (imageUrl) {
              tokenImageCache[tokenMint] = imageUrl;
              return imageUrl;
            }
          }
        }
      } catch (error) {
        // Fall through to DexScreener
      }
    }
    
    // Try Jupiter API for token logo (very comprehensive)
    try {
      const jupUrl = `https://tokens.jup.ag/token/${tokenMint}`;
      const jupResponse = await fetch(jupUrl);
      if (jupResponse.ok) {
        const jupData = await jupResponse.json();
        if (jupData.logoURI) {
          tokenImageCache[tokenMint] = jupData.logoURI;
          return jupData.logoURI;
        }
      }
    } catch (error) {
      // Fall through to DexScreener
    }
    
    // Fallback to DexScreener (has images for many tokens)
    try {
      const url = `https://api.dexscreener.com/latest/dex/tokens/${tokenMint}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (data.pairs && data.pairs.length > 0) {
          const sortedPairs = data.pairs.sort((a: any, b: any) => 
            (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
          );
          const topPair = sortedPairs[0];
          
          // Try multiple image sources from DexScreener
          let imageUrl = topPair.baseToken?.imageUrl || 
                        topPair.quoteToken?.imageUrl ||
                        topPair.baseToken?.logoURI ||
                        topPair.quoteToken?.logoURI;
          
          // If no image in pair data, try token list
          if (!imageUrl) {
            // Try Solana token list
            const tokenListUrl = `https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/${tokenMint}/logo.png`;
            // We can't verify if it exists without fetching, so we'll try it
            imageUrl = tokenListUrl;
          }
          
          if (imageUrl) {
            tokenImageCache[tokenMint] = imageUrl;
            return imageUrl;
          }
        }
      }
    } catch (error) {
      // Ignore errors
    }
    
    // Try Pump.fun image format (many memecoins are on Pump.fun)
    // Pump.fun stores images in a specific way - try their CDN
    try {
      // Pump.fun uses a specific image URL pattern
      // This is a best guess - Pump.fun doesn't have a public API
      // Note: Pump.fun doesn't have a public API, but we can try their CDN
      // We'll skip this for now as it requires actual page scraping
      // Better to rely on Helius and DexScreener
    } catch (error) {
      // Ignore
    }
    
    // Return null if no image found
    return null;
  };

  // Expanded DEX program IDs (ALL major Solana DEXes including memecoin platforms)
  const DEX_PROGRAMS = [
    // Jupiter
    'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4', // Jupiter v6
    'JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB', // Jupiter v4
    'JUP3c2Uh3WA4Ng34tw6kPd2G4C5BB21Xo36Je1s32Ph', // Jupiter v3
    // Raydium
    '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8', // Raydium AMM
    'CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK', // Raydium CLMM
    'CPMMoo8L3F4NbTegBCKVNunggL7t1ZP3k3L3KqYZzLzL', // Raydium CPMM
    // Orca
    '9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP', // Orca
    'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc', // Orca Whirlpools
    'DjVE6JNiYqPL2QXyCUUh8rNjHrbz9hXHNYt99MQ59qw1', // Orca Whirlpools v2
    // Meteora
    'Eo7WjKq67rjJQSZxS6L3zgZe5Qn8j1fB2YhRZ2K6QvXJ', // Meteora DLMM
    'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo', // Meteora
    // Pump.fun
    '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P', // Pump.fun
    'GzscvJhqY3vJYJbJqJqJqJqJqJqJqJqJqJqJqJqJqJq', // Pump.fun (alternative)
    // PumpSwap
    'PumpSwapProgram11111111111111111111111111', // PumpSwap placeholder
    // Serum
    '9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin', // Serum DEX
    '22Y43yTVxuUkoRKdm9thyRhQ3SdgQS7c7kB6UNCiaczD', // Serum DEX v3
    // Other DEXes
    '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM', // Aldrin
    'DjVE6JNiYqPL2QXyCUUh8rNjHrbz9hXHNYt99MQ59qw1', // Lifinity
  ];

  // Helper to check if transaction has DEX program (including inner instructions)
  const hasDEXInteraction = (tx: any): boolean => {
    // Check main instructions
    if (tx.instructions?.some((inst: any) => DEX_PROGRAMS.includes(inst.programId))) {
      return true;
    }
    
    // Check inner instructions (Jupiter often uses these)
    if (tx.instructions) {
      for (const inst of tx.instructions) {
        if (inst.innerInstructions) {
          for (const inner of inst.innerInstructions) {
            if (inner.instructions?.some((i: any) => DEX_PROGRAMS.includes(i.programId))) {
              return true;
            }
          }
        }
      }
    }
    
    return false;
  };

  console.log(`Processing ${transactions.length} transactions with DexScreener/CoinGecko prices...`);
  
  // Debug: Log first transaction structure to see what Helius provides
  if (transactions.length > 0) {
    const firstTx = transactions[0];
    console.log('Helius transaction sample:', JSON.stringify(firstTx, null, 2).substring(0, 1500));
    console.log('Helius transaction keys:', Object.keys(firstTx));
    if (firstTx.accountData) {
      const walletAcc = firstTx.accountData.find((acc: any) => acc.account === walletAddress);
      console.log('Wallet account data:', walletAcc ? {
        hasTokenBalanceChanges: !!walletAcc.tokenBalanceChanges,
        tokenBalanceChangesCount: walletAcc.tokenBalanceChanges?.length || 0,
        sampleTBC: walletAcc.tokenBalanceChanges?.[0]
      } : 'not found');
    }
  }
  
  // First pass: Collect all unique token mints from various sources
  const uniqueTokenMints = new Set<string>();
  for (const tx of transactions) {
    // Check accountData for token balance changes
    const walletAccount = tx.accountData?.find((acc: any) => acc.account === walletAddress);
    if (walletAccount && walletAccount.tokenBalanceChanges) {
      for (const tbc of walletAccount.tokenBalanceChanges) {
        const mint = tbc.mint || tbc.tokenAddress || '';
        if (mint && mint !== 'So11111111111111111111111111111111111111112') { // Skip SOL
          uniqueTokenMints.add(mint);
        }
      }
    }
    // Check tokenTransfers array
    if (tx.tokenTransfers && Array.isArray(tx.tokenTransfers)) {
      for (const transfer of tx.tokenTransfers) {
        const mint = transfer.mint || transfer.tokenAddress || transfer.token || '';
        if (mint && mint !== 'So11111111111111111111111111111111111111112') {
          uniqueTokenMints.add(mint);
        }
      }
    }
    // Check events for token swaps (some DEXes use events)
    if (tx.events && Array.isArray(tx.events)) {
      for (const event of tx.events) {
        if (event.nativeTransfers) {
          // Native transfers might indicate swaps
        }
        if (event.tokenTransfers) {
          for (const transfer of event.tokenTransfers) {
            const mint = transfer.mint || transfer.tokenAddress || '';
            if (mint && mint !== 'So11111111111111111111111111111111111111112') {
              uniqueTokenMints.add(mint);
            }
          }
        }
      }
    }
  }
  
  console.log(`Found ${uniqueTokenMints.size} unique token mints in transactions`);
  
  // Fetch token symbols in batches using Helius getAssetBatch (more efficient)
  console.log(`Fetching symbols for ${uniqueTokenMints.size} unique tokens using Helius getAssetBatch...`);
  const uniqueMintsArray = Array.from(uniqueTokenMints).slice(0, 100); // Limit to 100
  
  // Try batch fetch first (more efficient)
  if (HELIUS_API_KEY && uniqueMintsArray.length > 0) {
    try {
      const batchSize = 50; // Helius allows up to 50 per batch
      for (let i = 0; i < uniqueMintsArray.length; i += batchSize) {
        const batch = uniqueMintsArray.slice(i, i + batchSize);
        const rpcUrl = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
        const response = await fetch(rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: '1',
            method: 'getAssetBatch',
            params: { ids: batch }
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.result && Array.isArray(data.result)) {
            data.result.forEach((asset: any) => {
              if (!asset || !asset.id) return;
              
              // Try multiple locations for symbol/name
              let symbol = null;
              
              // Check content.metadata (NFTs and some tokens)
              if (asset?.content?.metadata) {
                symbol = asset.content.metadata.symbol || asset.content.metadata.name;
              }
              
              // Check top-level metadata
              if (!symbol && asset?.metadata) {
                symbol = asset.metadata.symbol || asset.metadata.name;
              }
              
              // Check tokenInfo (SPL tokens)
              if (!symbol && asset?.tokenInfo) {
                symbol = asset.tokenInfo.symbol || asset.tokenInfo.name;
              }
              
              // Check interface (for SPL tokens)
              if (!symbol && asset?.interface === 'V1_NFT' || asset?.interface === 'V1_PRINT') {
                // Skip NFTs, they're not fungible tokens
                return;
              }
              
              if (symbol) {
                tokenSymbolCache[asset.id] = symbol;
              }
              
              // Also fetch image from asset
              let imageUrl = null;
              
              // Check content.files
              if (asset?.content?.files && asset.content.files.length > 0) {
                imageUrl = asset.content.files[0].uri || asset.content.files[0].cdn_uri;
              }
              
              // Check content.links
              if (!imageUrl && asset?.content?.links) {
                imageUrl = asset.content.links.image;
              }
              
              // Check top-level image
              if (!imageUrl && asset?.image) {
                imageUrl = asset.image;
              }
              
              // Check metadata image
              if (!imageUrl && asset?.content?.metadata?.image) {
                imageUrl = asset.content.metadata.image;
              }
              
              if (imageUrl) {
                tokenImageCache[asset.id] = imageUrl;
              }
            });
          }
        } else {
          console.warn(`Helius batch fetch failed with status ${response.status}`);
        }
        
        // Small delay between batches
        if (i + batchSize < uniqueMintsArray.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    } catch (error) {
      console.warn('Batch fetch failed, falling back to individual requests:', error);
    }
  }
  
  // Fallback: fetch remaining symbols individually (try Helius first, then DexScreener)
  const remainingMints = uniqueMintsArray.filter(mint => !tokenSymbolCache[mint]);
  if (remainingMints.length > 0) {
    console.log(`Fetching symbols for ${remainingMints.length} tokens that didn't get symbols from batch...`);
    const symbolPromises = remainingMints.map(async (mint, index) => {
      if (index > 0) {
        await new Promise(resolve => setTimeout(resolve, 100)); // Slightly longer delay
      }
      
      // Try Helius first
      let symbol = await getTokenSymbolFromHelius(mint);
      
      // If still no symbol, try DexScreener directly
      if (!symbol || symbol === mint.slice(0, 8) + '...') {
        try {
          const dexUrl = `https://api.dexscreener.com/latest/dex/tokens/${mint}`;
          const dexResponse = await fetch(dexUrl);
          if (dexResponse.ok) {
            const dexData = await dexResponse.json();
            if (dexData.pairs && dexData.pairs.length > 0) {
              const sortedPairs = dexData.pairs.sort((a: any, b: any) => 
                (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
              );
              const topPair = sortedPairs[0];
              const dexSymbol = topPair.baseToken?.symbol || topPair.quoteToken?.symbol;
              if (dexSymbol) {
                symbol = dexSymbol;
                tokenSymbolCache[mint] = symbol;
              }
              
              // Also try to get image from DexScreener
              if (!tokenImageCache[mint]) {
                const dexImage = topPair.baseToken?.imageUrl || topPair.quoteToken?.imageUrl;
                if (dexImage) {
                  tokenImageCache[mint] = dexImage;
                }
              }
            }
          }
        } catch (error) {
          // Ignore errors, keep existing symbol or fallback
        }
      }
      
      // If still no image, try fetching it
      if (!tokenImageCache[mint]) {
        const imageUrl = await getTokenImage(mint);
        if (imageUrl) {
          tokenImageCache[mint] = imageUrl;
        }
      }
      
      return { mint, symbol: symbol || mint.slice(0, 8) + '...' };
    });
    const symbolResults = await Promise.all(symbolPromises);
    symbolResults.forEach(({ mint, symbol }) => {
      if (symbol && symbol !== mint.slice(0, 8) + '...') {
        tokenSymbolCache[mint] = symbol;
      }
    });
  }
  
  const tokensWithSymbols = Object.keys(tokenSymbolCache).length;
  const tokensWithoutSymbols = uniqueMintsArray.length - tokensWithSymbols;
  console.log(`Fetched ${tokensWithSymbols} token symbols from Helius/DexScreener`);
  if (tokensWithoutSymbols > 0) {
    const missingSymbols = uniqueMintsArray.filter(mint => !tokenSymbolCache[mint] || tokenSymbolCache[mint] === mint.slice(0, 8) + '...');
    console.warn(`⚠️  ${tokensWithoutSymbols} tokens missing symbols:`, missingSymbols.slice(0, 5).map(m => m.slice(0, 8) + '...'));
  }
  
  // Fetch images for tokens that don't have them yet
  const tokensNeedingImages = uniqueMintsArray.filter(mint => !tokenImageCache[mint]);
  if (tokensNeedingImages.length > 0) {
    console.log(`Fetching images for ${tokensNeedingImages.length} tokens...`);
    const imagePromises = tokensNeedingImages.slice(0, 50).map(async (mint, index) => {
      if (index > 0) {
        await new Promise(resolve => setTimeout(resolve, 100)); // Rate limiting
      }
      const imageUrl = await getTokenImage(mint);
      if (imageUrl) {
        tokenImageCache[mint] = imageUrl;
      }
      return { mint, imageUrl };
    });
    await Promise.all(imagePromises);
    console.log(`Fetched ${Object.keys(tokenImageCache).length} token images`);
  }
  
  // Filter transactions to 2025 only
  const year2025Start = new Date('2025-01-01').getTime() / 1000; // Unix timestamp
  const year2025End = new Date('2025-12-31T23:59:59').getTime() / 1000;
  
  const transactions2025 = transactions.filter(tx => {
    const timestamp = tx.timestamp || 0;
    return timestamp >= year2025Start && timestamp <= year2025End;
  });
  
  console.log(`Filtered ${transactions.length} transactions to ${transactions2025.length} from year 2025`);
  
  // CRITICAL: Sort transactions chronologically (oldest first) so buys are processed before sells
  // This ensures accurate cost basis calculation
  const sortedTransactions = [...transactions2025].sort((a, b) => {
    const timeA = a.timestamp || 0;
    const timeB = b.timestamp || 0;
    return timeA - timeB; // Oldest first
  });
  
  console.log(`Sorted ${sortedTransactions.length} transactions chronologically (oldest first)`);
  
  // Fetch historical SOL prices for the date range of all trades
  console.log('\n=== Fetching Historical SOL Prices ===');
  
  // Get all unique trade timestamps
  const allTimestamps = sortedTransactions.map(tx => tx.timestamp || 0).filter(t => t > 0);
  const minTimestamp = Math.min(...allTimestamps);
  const maxTimestamp = Math.max(...allTimestamps);
  
  console.log(`Trade date range: ${new Date(minTimestamp * 1000).toLocaleDateString()} to ${new Date(maxTimestamp * 1000).toLocaleDateString()}`);
  
  // Fetch historical prices from CoinGecko (free tier: daily granularity)
  const solPricesByDate: { [date: string]: number } = {};
  const pricesByTimestamp: Array<{ timestamp: number; price: number }> = [];
  let currentSOLPrice = 150; // Fallback
  
  try {
    // Get historical prices for the date range
    const priceResponse = await fetch(
      `https://api.coingecko.com/api/v3/coins/solana/market_chart/range?vs_currency=usd&from=${minTimestamp}&to=${maxTimestamp}`
    );
    const priceData = await priceResponse.json();
    
    if (priceData?.prices && Array.isArray(priceData.prices)) {
      // CoinGecko returns [[timestamp, price], [timestamp, price], ...]
      priceData.prices.forEach(([timestamp, price]: [number, number]) => {
        // Store by UTC date to avoid timezone issues
        const date = new Date(timestamp).toISOString().split('T')[0]; // YYYY-MM-DD in UTC
        solPricesByDate[date] = price;
        
        // Also store by timestamp for more granular lookups
        pricesByTimestamp.push({ timestamp: timestamp / 1000, price }); // Convert ms to seconds
      });
      
      // Use the most recent price as current price
      currentSOLPrice = priceData.prices[priceData.prices.length - 1][1];
      
      console.log(`✅ Fetched ${Object.keys(solPricesByDate).length} days of SOL price history`);
      console.log(`📊 Granular data points: ${pricesByTimestamp.length} timestamps`);
      console.log(`Current SOL price: $${currentSOLPrice.toFixed(2)}`);
      console.log(`Sample prices:`, Object.entries(solPricesByDate).slice(0, 3).map(([date, price]) => `${date}: $${price.toFixed(2)}`));
    } else {
      console.warn('⚠️  No price data returned from CoinGecko');
    }
  } catch (error) {
    console.error('❌ Failed to fetch historical SOL prices:', error);
    console.warn('Using fallback price of $150 for all trades');
  }
  
  // Helper function to get SOL price for a specific timestamp (more accurate than by date)
  const getSolPriceForTimestamp = (tradeTimestamp: number): number => {
    if (pricesByTimestamp.length === 0) {
      return currentSOLPrice;
    }
    
    // Find the closest price by timestamp (linear interpolation would be even better)
    let closestPrice = currentSOLPrice;
    let minDiff = Infinity;
    
    for (const { timestamp, price } of pricesByTimestamp) {
      const diff = Math.abs(timestamp - tradeTimestamp);
      if (diff < minDiff) {
        minDiff = diff;
        closestPrice = price;
      }
    }
    
    return closestPrice;
  };
  
  // Process transactions to identify trades
  let processedCount = 0;
  for (const tx of sortedTransactions) {
    const timestamp = new Date((tx.timestamp || 0) * 1000);
    const date = timestamp.toLocaleDateString();
    let isDEXTrade = false;
    let solVolume = 0;
    let tokenMint = '';
    let tokenAmount = 0;
    let tradeType: 'buy' | 'sell' | null = null;
    

    // Get wallet account data
    const walletAccount = tx.accountData?.find((acc: any) => acc.account === walletAddress);
    
    // Calculate SOL volume from native balance change (preserve sign for buy/sell detection)
    // Negative = SOL going out (buy), Positive = SOL coming in (sell)
    // Also check native transfers AND WSOL transfers for more accurate SOL attribution
    const WSOL_MINT = 'So11111111111111111111111111111111111111112';
    // Common stablecoin mints on Solana
    const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'; // USDC (6 decimals)
    const USDT_MINT = 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'; // USDT (6 decimals)
    const PYUSD_MINT = 'Gnt27xtC473ZT2Mw5u8wZ68Z3gULkSTb5DuxJy7eJotD'; // PYUSD (6 decimals)
    // USD1 might be any stablecoin - we'll detect all of them
    const STABLECOIN_MINTS = [USDC_MINT, USDT_MINT, PYUSD_MINT];
    
    if (walletAccount) {
      const solChangeRaw = parseFloat(walletAccount.nativeBalanceChange?.toString() || '0') / 1e9;
      // Use absolute value for volume, but preserve sign for buy/sell detection
      const solChangeAbs = Math.abs(solChangeRaw);
      
      // Check native transfers - separate incoming and outgoing to avoid double-counting
      let solOutFromTransfers = 0;
      let solInFromTransfers = 0;
      if (tx.nativeTransfers && Array.isArray(tx.nativeTransfers)) {
        for (const transfer of tx.nativeTransfers) {
          const fromAddr = transfer.fromUserAccount || transfer.from || '';
          const toAddr = transfer.toUserAccount || transfer.to || '';
          const amount = parseFloat(transfer.amount?.toString() || '0') / 1e9;
          
          // SOL going out from wallet (buy)
          if (fromAddr === walletAddress && toAddr !== walletAddress && amount > 0) {
            solOutFromTransfers = Math.max(solOutFromTransfers, amount); // Use max, not sum
          }
          // SOL coming in to wallet (sell)
          else if (toAddr === walletAddress && fromAddr !== walletAddress && amount > 0) {
            solInFromTransfers = Math.max(solInFromTransfers, amount); // Use max, not sum
          }
        }
      }
      // Use the larger of in or out (not both!) to avoid double-counting
      const solFromTransfers = Math.max(solOutFromTransfers, solInFromTransfers);
      
      // Check WSOL transfers - these represent SOL movement
      // CRITICAL FIX: Separate incoming and outgoing to avoid double-counting
      let wsolOutFromTransfers = 0;
      let wsolInFromTransfers = 0;
      if (tx.tokenTransfers && Array.isArray(tx.tokenTransfers)) {
        for (const transfer of tx.tokenTransfers) {
          const mint = transfer.mint || transfer.tokenAddress || transfer.token || '';
          if (mint === WSOL_MINT) {
            const fromAddr = transfer.fromUserAccount || transfer.from || '';
            const toAddr = transfer.toUserAccount || transfer.to || '';
            // tokenAmount might be in different formats - try both raw and divided by 1e9
            const rawAmount = parseFloat(transfer.tokenAmount?.toString() || '0');
            // If amount is very large (> 1e6), it's likely in lamports, divide by 1e9
            // If amount is small (< 1000), it might already be in SOL
            const wsolAmount = rawAmount > 1e6 ? rawAmount / 1e9 : rawAmount;
            
            // WSOL going out = SOL going out (buy)
            if (fromAddr === walletAddress && toAddr !== walletAddress && wsolAmount > 0) {
              wsolOutFromTransfers = Math.max(wsolOutFromTransfers, wsolAmount); // Use max, not sum
            }
            // WSOL coming in = SOL coming in (sell)
            else if (toAddr === walletAddress && fromAddr !== walletAddress && wsolAmount > 0) {
              wsolInFromTransfers = Math.max(wsolInFromTransfers, wsolAmount); // Use max, not sum
            }
          }
        }
      }
      // Use the larger of in or out (not both!) to avoid double-counting swaps
      const wsolFromTransfers = Math.max(wsolOutFromTransfers, wsolInFromTransfers);
      
      // CRITICAL: Also check tokenBalanceChanges for WSOL - this is MORE ACCURATE!
      // tokenBalanceChanges shows the actual balance change, which is what we need
      let wsolFromBalanceChanges = 0;
      if (walletAccount && walletAccount.tokenBalanceChanges) {
        for (const tbc of walletAccount.tokenBalanceChanges) {
          const mint = tbc.mint || tbc.tokenAddress || '';
          if (mint === WSOL_MINT) {
            const wsolChange = parseFloat(tbc.tokenAmount?.toString() || '0');
            const wsolAmount = Math.abs(wsolChange) / 1e9; // tokenAmount is in lamports
            wsolFromBalanceChanges = Math.max(wsolFromBalanceChanges, wsolAmount);
          }
        }
      }
      
      // Use the larger of: native balance change, SOL from transfers, WSOL from transfers, or WSOL from balance changes
      // This helps catch cases where balance change might be 0 due to swaps or WSOL usage
      // tokenBalanceChanges is most accurate for WSOL because it shows the actual balance change
      const solFromBalance = solChangeAbs > 0.0001 ? solChangeAbs : 0;
      solVolume = Math.max(solFromBalance, solFromTransfers, wsolFromTransfers, wsolFromBalanceChanges);
      
      // Note: We'll use the token balance change direction to determine buy/sell, not SOL direction
      // because SOL direction can be affected by fees and other transfers
    }

    // Check for token balance changes (most reliable indicator)
    if (walletAccount && walletAccount.tokenBalanceChanges && walletAccount.tokenBalanceChanges.length > 0) {
      isDEXTrade = true;
      
      for (const tbc of walletAccount.tokenBalanceChanges) {
        const balanceChange = parseFloat(tbc.tokenAmount?.toString() || '0');
        if (Math.abs(balanceChange) > 0) {
          tokenMint = tbc.mint || tbc.tokenAddress || '';
          tokenAmount = Math.abs(balanceChange);
          tradeType = balanceChange > 0 ? 'buy' : 'sell';
          break; // Use first significant token balance change
        }
      }
    }
    
    // Also check events for token transfers (some DEXes use events instead of accountData)
    if (!tokenMint && tx.events && Array.isArray(tx.events)) {
      for (const event of tx.events) {
        if (event.tokenTransfers && Array.isArray(event.tokenTransfers)) {
          for (const transfer of event.tokenTransfers) {
            const mint = transfer.mint || transfer.tokenAddress || '';
            const amount = parseFloat(transfer.tokenAmount?.toString() || '0');
            if (amount > 0 && mint && mint !== 'So11111111111111111111111111111111111111112') {
              tokenMint = mint;
              tokenAmount = amount;
              // Determine buy/sell from native transfers or balance changes
              if (walletAccount && walletAccount.nativeBalanceChange) {
                const nativeChange = parseFloat(walletAccount.nativeBalanceChange.toString()) / 1e9;
                tradeType = nativeChange < 0 ? 'buy' : 'sell'; // SOL going out = buy, SOL coming in = sell
              }
              isDEXTrade = true;
              break;
            }
          }
          if (tokenMint) break;
        }
      }
    }

    // Check for DEX program interaction (including inner instructions)
    const hasDEXProgram = hasDEXInteraction(tx);
    if (hasDEXProgram) {
      isDEXTrade = true;
    }
    
    // Check token transfers (some DEXes use this)
    if (tx.tokenTransfers && Array.isArray(tx.tokenTransfers) && tx.tokenTransfers.length > 0) {
      isDEXTrade = true;
      // Get token info from transfers
      for (const transfer of tx.tokenTransfers) {
        const mint = transfer.mint || transfer.tokenAddress || transfer.token || '';
        const amount = parseFloat(transfer.tokenAmount?.toString() || '0');
        if (amount > 0 && mint && mint !== 'So11111111111111111111111111111111111111112' && !tokenMint) {
          tokenMint = mint;
          tokenAmount = amount;
          // Determine buy/sell from transfer direction
          const fromAddress = transfer.fromUserAccount || transfer.from || '';
          const toAddress = transfer.toUserAccount || transfer.to || '';
          if (fromAddress === walletAddress && toAddress !== walletAddress) {
            tradeType = 'sell'; // Token going out = sell
          } else if (toAddress === walletAddress && fromAddress !== walletAddress) {
            tradeType = 'buy'; // Token coming in = buy
          } else if (!tradeType && solVolume > 0) {
            // If we can't determine from transfer, use SOL direction
            const nativeChange = walletAccount?.nativeBalanceChange ? parseFloat(walletAccount.nativeBalanceChange.toString()) / 1e9 : 0;
            tradeType = nativeChange < 0 ? 'buy' : 'sell';
          }
        }
      }
    }

    // Be VERY inclusive - count as trade if ANY of these:
    // 1. Has DEX program interaction (most reliable)
    // 2. Has token balance changes
    // 3. Has token transfers
    // 4. Has significant SOL movement AND is not a simple transfer/system program
    // 5. Transaction type is SWAP
    // 6. Has token transfers in tx.tokenTransfers array
    const hasTokenTransfers = tx.tokenTransfers && tx.tokenTransfers.length > 0;
    const isSimpleTransfer = tx.type === 'TRANSFER' && tx.source === 'SYSTEM_PROGRAM' && !hasTokenTransfers;
    const isTrade = hasDEXProgram || 
                    isDEXTrade || 
                    (tokenMint && tokenAmount > 0) || 
                    tx.type === 'SWAP' ||
                    hasTokenTransfers ||
                    (solVolume > 0.01 && !isSimpleTransfer);
    
    // Debug: Check if transaction has token activity but isn't identified as trade
    const hasTokenActivity = (walletAccount?.tokenBalanceChanges && walletAccount.tokenBalanceChanges.length > 0) || 
                             (tx.tokenTransfers && tx.tokenTransfers.length > 0);
    
    // DEBUG: Log every transaction to see what's happening
    const txSigDebug = tx.signature?.slice(0, 16) || 'UNKNOWN';
    console.log(`[TRADE CHECK] TX ${txSigDebug}... isTrade: ${isTrade}, type: ${tx.type}, hasDEXProgram: ${hasDEXProgram}, isDEXTrade: ${isDEXTrade}, hasTokenActivity: ${hasTokenActivity}`);
    
    if (hasTokenActivity && !isTrade) {
      console.warn(`⚠️  Transaction has token activity but NOT identified as trade:`, {
        signature: tx.signature?.slice(0, 16) + '...',
        type: tx.type,
        source: tx.source,
        hasDEXProgram,
        isDEXTrade,
        hasTokenMint: !!tokenMint,
        tokenAmount,
        isSWAP: tx.type === 'SWAP',
        hasTokenTransfers,
        solVolume,
        isSimpleTransfer,
        tokenBalanceChangesCount: walletAccount?.tokenBalanceChanges?.length || 0
      });
    }
    
    if (isTrade) {
      // Always count the trade
      if (!tradesByDate[date]) {
        tradesByDate[date] = { count: 0, pnl: 0 };
      }
      tradesByDate[date].count++;
      
      // For PNL calculation, we need token info
      // Process ALL token balance changes in this transaction (not just the first one)
      // ALSO process tokenTransfers if tokenBalanceChanges are missing (some DEXes like Pump.fun use this)
      const hasTokenBalanceChanges = walletAccount && walletAccount.tokenBalanceChanges && walletAccount.tokenBalanceChanges.length > 0;
      const hasTokenTransfersData = tx.tokenTransfers && Array.isArray(tx.tokenTransfers) && tx.tokenTransfers.length > 0;
      
      // Debug: Log transaction signature for tracking
      const txSig = tx.signature?.slice(0, 16) || 'UNKNOWN';
      
      // DEBUG: Log ALL transactions being processed
      console.log(`\n[TX PROCESS] ====== Transaction ${txSig}... ======`);
      console.log(`[TX PROCESS] hasTokenBalanceChanges: ${hasTokenBalanceChanges} (count: ${walletAccount?.tokenBalanceChanges?.length || 0})`);
      console.log(`[TX PROCESS] hasTokenTransfers: ${hasTokenTransfersData} (count: ${tx.tokenTransfers?.length || 0})`);
      console.log(`[TX PROCESS] walletAccount found: ${!!walletAccount}`);
      
      if (hasTokenTransfersData && !hasTokenBalanceChanges) {
        console.log(`[TX DEBUG] ${txSig}... has tokenTransfers but NO tokenBalanceChanges - will process via tokenTransfers`);
      }
      
      if (hasTokenBalanceChanges) {
        // Process each token balance change as a separate trade
        const txSigShort = tx.signature?.slice(0, 16) || 'UNKNOWN';
        console.log(`[TX ${txSigShort}] Processing ${walletAccount.tokenBalanceChanges.length} token balance changes:`);
        walletAccount.tokenBalanceChanges.forEach((tbc: any, idx: number) => {
          const mint = (tbc.mint || tbc.tokenAddress || '').slice(0, 12);
          const change = parseFloat(tbc.tokenAmount?.toString() || '0');
          console.log(`  [${idx}] Mint: ${mint}, Change: ${change}, Type: ${change > 0 ? 'BUY' : 'SELL'}`);
        });
        
        // CRITICAL: Check for USD1 stablecoin in this transaction FIRST, before processing tokens
        // This is important because USD1 is used as payment (not a traded token)
        let txUsd1Amount = 0;
        let txUsd1Direction: 'in' | 'out' | null = null;
        
        console.log(`\n[TX SCAN] ========================================`);
        console.log(`[TX SCAN] Transaction ${tx.signature?.slice(0, 16)}...`);
        console.log(`[TX SCAN] Scanning for stablecoins (USDC, USDT, PYUSD)...`);
        
        // Check BOTH tokenBalanceChanges AND tokenTransfers for stablecoins
        let foundStablecoin = false;
        
        // First check tokenBalanceChanges
        if (walletAccount && walletAccount.tokenBalanceChanges) {
          console.log(`[TX SCAN] Found ${walletAccount.tokenBalanceChanges.length} token balance changes:`);
          walletAccount.tokenBalanceChanges.forEach((tbc: any, idx: number) => {
            const mint = tbc.mint || tbc.tokenAddress || '';
            const change = parseFloat(tbc.tokenAmount?.toString() || '0');
            const isStablecoin = STABLECOIN_MINTS.includes(mint);
            console.log(`  [${idx}] ${mint.slice(0, 12)}... change: ${change}, direction: ${change > 0 ? 'IN' : 'OUT'}${isStablecoin ? ' (STABLECOIN!)' : ''}`);
          });
          
          for (const tbc of walletAccount.tokenBalanceChanges) {
            const mint = tbc.mint || tbc.tokenAddress || '';
            
            // Check if this is any stablecoin (USDC, USDT, PYUSD, etc.)
            if (STABLECOIN_MINTS.includes(mint)) {
              const stablecoinChange = parseFloat(tbc.tokenAmount?.toString() || '0');
              
              // CRITICAL: USDC and USDT use 6 decimals, not 9!
              // PYUSD uses 6 decimals too
              const decimals = (mint === USDC_MINT || mint === USDT_MINT || mint === PYUSD_MINT) ? 6 : 9;
              const divisor = Math.pow(10, decimals);
              const stablecoinAmount = Math.abs(stablecoinChange) / divisor;
              
              console.log(`[STABLECOIN FOUND] In tokenBalanceChanges: ${mint.slice(0, 12)}... raw: ${stablecoinChange}, amount: ${stablecoinAmount.toFixed(6)} (decimals: ${decimals})`);
              
              if (stablecoinAmount > 0.01) {
                txUsd1Amount = stablecoinAmount;
                txUsd1Direction = stablecoinChange > 0 ? 'in' : 'out';
                foundStablecoin = true;
                console.log(`[USD1 TX LEVEL] ✅ Detected stablecoin: ${txUsd1Direction === 'in' ? 'receiving' : 'spending'} ${stablecoinAmount.toFixed(2)} USD (mint: ${mint.slice(0, 12)}...)`);
              }
            }
          }
        }
        
        // Also check tokenTransfers if we didn't find it in tokenBalanceChanges
        if (!foundStablecoin && tx.tokenTransfers && Array.isArray(tx.tokenTransfers)) {
          console.log(`[TX SCAN] Checking ${tx.tokenTransfers.length} token transfers for stablecoins...`);
          
          for (const transfer of tx.tokenTransfers) {
            const mint = transfer.mint || transfer.tokenAddress || transfer.token || '';
            
            if (STABLECOIN_MINTS.includes(mint)) {
              const fromAddr = transfer.fromUserAccount || transfer.from || '';
              const toAddr = transfer.toUserAccount || transfer.to || '';
              const rawAmount = parseFloat(transfer.tokenAmount?.toString() || '0');
              
              // USDC/USDT/PYUSD use 6 decimals
              const decimals = 6;
              const stablecoinAmount = rawAmount / Math.pow(10, decimals);
              
              console.log(`[STABLECOIN FOUND] In tokenTransfers: ${mint.slice(0, 12)}... from ${fromAddr.slice(0, 8)}... to ${toAddr.slice(0, 8)}... amount: ${stablecoinAmount.toFixed(6)}`);
              
              // Check if this is wallet receiving or sending stablecoin
              if (toAddr === walletAddress && fromAddr !== walletAddress && stablecoinAmount > 0.01) {
                txUsd1Amount = stablecoinAmount;
                txUsd1Direction = 'in';
                foundStablecoin = true;
                console.log(`[USD1 TX LEVEL] ✅ Detected stablecoin IN: receiving ${stablecoinAmount.toFixed(2)} USD`);
              } else if (fromAddr === walletAddress && toAddr !== walletAddress && stablecoinAmount > 0.01) {
                txUsd1Amount = stablecoinAmount;
                txUsd1Direction = 'out';
                foundStablecoin = true;
                console.log(`[USD1 TX LEVEL] ✅ Detected stablecoin OUT: spending ${stablecoinAmount.toFixed(2)} USD`);
              }
            }
          }
        }
        
        if (!foundStablecoin) {
          console.log(`[TX SCAN] ⚠️ No stablecoins found in this transaction (checked tokenBalanceChanges and tokenTransfers)`);
        }
        console.log(`[TX SCAN] ========================================\n`);
        
        for (const tbc of walletAccount.tokenBalanceChanges) {
          const currentTokenMint = tbc.mint || tbc.tokenAddress || '';
          const currentTokenAmount = Math.abs(parseFloat(tbc.tokenAmount?.toString() || '0'));
          const currentTokenBalanceChange = parseFloat(tbc.tokenAmount?.toString() || '0');
          const currentTradeType: 'buy' | 'sell' | null = currentTokenBalanceChange > 0 ? 'buy' : currentTokenBalanceChange < 0 ? 'sell' : null;
          
          // Debug: Log when we find a potential buy that might be skipped
          if (currentTokenBalanceChange > 0 && (!currentTokenMint || currentTokenAmount === 0 || !currentTradeType)) {
            console.warn(`⚠️  Potential BUY transaction skipped:`, {
              mint: currentTokenMint || 'MISSING',
              amount: currentTokenAmount,
              balanceChange: currentTokenBalanceChange,
              tradeType: currentTradeType,
              tx: tx.signature?.slice(0, 16) + '...'
            });
          }
          
          // CRITICAL: Skip WSOL and stablecoins - they're payment methods, not token trades!
          // WSOL/USD1 in tokenBalanceChanges represents payment in/out, not a token trade
          if (currentTokenMint === WSOL_MINT) {
            console.log(`[WSOL SKIP] Skipping WSOL in tokenBalanceChanges - this is the payment, not a token trade`);
            continue;
          }
          // Skip all stablecoins - they're payment methods, not traded tokens
          if (STABLECOIN_MINTS.includes(currentTokenMint)) {
            console.log(`[STABLECOIN SKIP] Skipping stablecoin ${currentTokenMint.slice(0, 8)}... in tokenBalanceChanges - this is the payment, not a token trade`);
            continue;
          }
          
          if (currentTokenMint && currentTokenAmount > 0 && currentTradeType) {
            // No need to fetch token prices for PNL calculation - we only need SOL amounts
            // SOL amounts are already available from native balance changes
            processedCount++;
            
            if (processedCount % 50 === 0) {
              console.log(`Processed ${processedCount} trades...`);
            }
            
            // Calculate trade value - prioritize SOL volume (most accurate)
            // For each token, try to get the actual SOL value for THIS specific token trade
            // For buys: SOL goes OUT, for sells: SOL comes IN
            let tokenSOLVolume = 0;
            
            // Calculate SOL going out (for buys) or coming in (for sells) from native transfers
            // CRITICAL: Also check for WSOL (Wrapped SOL) transfers - they represent SOL movement
            const WSOL_MINT = 'So11111111111111111111111111111111111111112';
            let solOut = 0; // SOL going out (for buys)
            let solIn = 0;  // SOL coming in (for sells)
            
            // Check native SOL transfers
            if (tx.nativeTransfers && Array.isArray(tx.nativeTransfers)) {
              for (const transfer of tx.nativeTransfers) {
                const fromAddr = transfer.fromUserAccount || transfer.from || '';
                const toAddr = transfer.toUserAccount || transfer.to || '';
                const amount = parseFloat(transfer.amount?.toString() || '0') / 1e9;
                
                if (fromAddr === walletAddress && toAddr !== walletAddress && amount > 0.0001) {
                  solOut += amount; // SOL going out (buy)
                } else if (toAddr === walletAddress && fromAddr !== walletAddress && amount > 0.0001) {
                  solIn += amount; // SOL coming in (sell)
                }
              }
            }
            
            // CRITICAL FIX: Check token balance changes for WSOL FIRST - this is MORE ACCURATE!
            // tokenBalanceChanges shows the actual NET balance change, which is what we need
            // We check this FIRST to avoid double-counting with tokenTransfers
            let wsolFromBalanceChange = 0;
            let wsolBalanceChangeDirection: 'out' | 'in' | null = null;
            
            if (walletAccount && walletAccount.tokenBalanceChanges) {
              for (const tbc of walletAccount.tokenBalanceChanges) {
                const mint = tbc.mint || tbc.tokenAddress || '';
                
                // Check for WSOL
                if (mint === WSOL_MINT) {
                  const wsolChange = parseFloat(tbc.tokenAmount?.toString() || '0');
                  const wsolAmount = Math.abs(wsolChange) / 1e9; // tokenAmount is in lamports
                  
                  // WSOL balance decreasing = SOL going out (buy)
                  if (wsolChange < 0 && wsolAmount > 0.0001) {
                    wsolFromBalanceChange = wsolAmount;
                    wsolBalanceChangeDirection = 'out';
                  }
                  // WSOL balance increasing = SOL coming in (sell)
                  else if (wsolChange > 0 && wsolAmount > 0.0001) {
                    wsolFromBalanceChange = wsolAmount;
                    wsolBalanceChangeDirection = 'in';
                  }
                }
              }
            }
            
            // Check WSOL (Wrapped SOL) transfers - ONLY if we didn't find a balance change
            // tokenTransfers and tokenBalanceChanges often represent the same movement, so we should use balance change as primary
            if (wsolFromBalanceChange === 0 && tx.tokenTransfers && Array.isArray(tx.tokenTransfers)) {
              for (const transfer of tx.tokenTransfers) {
                const mint = transfer.mint || transfer.tokenAddress || transfer.token || '';
                if (mint === WSOL_MINT) {
                  const fromAddr = transfer.fromUserAccount || transfer.from || '';
                  const toAddr = transfer.toUserAccount || transfer.to || '';
                  // tokenAmount might be in different formats - try both raw and divided by 1e9
                  const rawAmount = parseFloat(transfer.tokenAmount?.toString() || '0');
                  // If amount is very large (> 1e6), it's likely in lamports, divide by 1e9
                  // If amount is small (< 1000), it might already be in SOL
                  const wsolAmount = rawAmount > 1e6 ? rawAmount / 1e9 : rawAmount;
                  
                  // WSOL going out from wallet = SOL going out (buy)
                  if (fromAddr === walletAddress && toAddr !== walletAddress && wsolAmount > 0.0001) {
                    solOut += wsolAmount;
                  }
                  // WSOL coming in to wallet = SOL coming in (sell)
                  else if (toAddr === walletAddress && fromAddr !== walletAddress && wsolAmount > 0.0001) {
                    solIn += wsolAmount;
                  }
                }
              }
            } else if (wsolFromBalanceChange > 0) {
              // Use the balance change (more accurate, avoids double-counting)
              if (wsolBalanceChangeDirection === 'out') {
                solOut += wsolFromBalanceChange;
              } else if (wsolBalanceChangeDirection === 'in') {
                solIn += wsolFromBalanceChange;
              }
            }
            
            // Check if this trade used USD1 stablecoin instead of SOL
            let tradeValueUSD = 0;
            let usedStablecoin = false;
            
            console.log(`[TRADE MATCH] Token: ${currentTokenMint.slice(0, 8)}..., Type: ${currentTradeType}, TX USD1: ${txUsd1Amount}, Direction: ${txUsd1Direction}`);
            
            // Check if this transaction has USD1 movement in the correct direction for this trade type
            if (txUsd1Amount > 0) {
              // For BUY: USD1 should be going OUT (spent)
              // For SELL: USD1 should be coming IN (received)
              const isUsd1TradeMatch = (currentTradeType === 'buy' && txUsd1Direction === 'out') ||
                                       (currentTradeType === 'sell' && txUsd1Direction === 'in');
              
              console.log(`[TRADE MATCH] Is match? ${isUsd1TradeMatch} (buy+out: ${currentTradeType === 'buy' && txUsd1Direction === 'out'}, sell+in: ${currentTradeType === 'sell' && txUsd1Direction === 'in'})`);
              
              if (isUsd1TradeMatch) {
                // This trade used USD1 stablecoin
                console.log(`[USD1 TRADE] ✅ ${currentTradeType.toUpperCase()} using USD1: ${txUsd1Amount.toFixed(2)} USD for token ${currentTokenMint.slice(0, 8)}`);
                tradeValueUSD = txUsd1Amount;
                usedStablecoin = true;
                
                // Convert to SOL equivalent for volume tracking
                const tradeTimestamp = Math.floor(timestamp.getTime() / 1000);
                const solPriceForTrade = getSolPriceForTimestamp(tradeTimestamp);
                tokenSOLVolume = tradeValueUSD / solPriceForTrade; // USD / SOL price = SOL amount
                
                console.log(`[USD1 CONVERSION] ${txUsd1Amount.toFixed(2)} USD = ${tokenSOLVolume.toFixed(4)} SOL (@ $${solPriceForTrade.toFixed(2)}/SOL)`);
              } else {
                console.log(`[TRADE MATCH] ❌ No match - USD1 direction doesn't match trade type`);
              }
            } else {
              console.log(`[TRADE MATCH] No USD1 in this transaction, will use SOL`);
            }
            
            // Use appropriate SOL amount based on trade type (if not stablecoin trade)
            if (!usedStablecoin && currentTradeType === 'buy') {
              // For buys, use SOL going out
              // CRITICAL FIX: If solOut is 0 (e.g., wrapped SOL or intermediate program),
              // use native balance change as fallback (should be negative for buys)
              let solForBuy = solOut;
              
              // If solOut is 0, check native balance change
              if (solOut === 0 && walletAccount.nativeBalanceChange) {
                const nativeChange = parseFloat(walletAccount.nativeBalanceChange.toString()) / 1e9;
                // For buys, native balance change should be negative (SOL going out)
                if (nativeChange < 0) {
                  solForBuy = Math.abs(nativeChange);
                }
              }
              
              // If still 0, try using the total solVolume (which might include wrapped SOL)
              if (solForBuy === 0 && solVolume > 0) {
                solForBuy = solVolume;
              }
              
              // CRITICAL: If we detected a buy (tokens came in) but still have 0 SOL,
              // we MUST track it - tokens don't appear from nowhere
              // Use native balance change even if small, or estimate minimum
              if (solForBuy === 0) {
                if (walletAccount.nativeBalanceChange) {
                  const nativeChange = parseFloat(walletAccount.nativeBalanceChange.toString()) / 1e9;
                  // Even if positive or zero, if tokens came in, SOL must have gone out
                  // Use absolute value as estimate
                  solForBuy = Math.abs(nativeChange);
                }
                // Last resort: use transaction fee as minimum estimate (fees are usually 0.000005 SOL)
                // If there's a trade, there must be at least some SOL movement
                if (solForBuy === 0 || solForBuy < 0.0001) {
                  const fee = parseFloat(tx.fee?.toString() || '0') / 1e9;
                  solForBuy = Math.max(fee * 10, 0.01); // Estimate at least 0.01 SOL for any trade
                  console.warn(`⚠️  Buy detected but no SOL volume found for ${currentTokenMint.slice(0, 8)}, using estimate: ${solForBuy} SOL`);
                }
              }
              
              if (solForBuy > 0) {
                // If multiple tokens, distribute proportionally
                const totalTokenAmounts = walletAccount.tokenBalanceChanges
                  .filter((tbc: any) => parseFloat(tbc.tokenAmount?.toString() || '0') > 0) // Only buys
                  .reduce((sum: number, tbc: any) => sum + Math.abs(parseFloat(tbc.tokenAmount?.toString() || '0')), 0);
                
                if (totalTokenAmounts > 0) {
                  tokenSOLVolume = (currentTokenAmount / totalTokenAmounts) * solForBuy;
                } else {
                  tokenSOLVolume = solForBuy / walletAccount.tokenBalanceChanges.filter((tbc: any) => parseFloat(tbc.tokenAmount?.toString() || '0') > 0).length;
                }
              } else {
                // Last resort: divide total solVolume equally
                const totalTokenAmounts = walletAccount.tokenBalanceChanges.reduce((sum: number, tbc: any) => {
                  return sum + Math.abs(parseFloat(tbc.tokenAmount?.toString() || '0'));
                }, 0);
                tokenSOLVolume = totalTokenAmounts > 0 ? (currentTokenAmount / totalTokenAmounts) * solVolume : solVolume / walletAccount.tokenBalanceChanges.length;
              }
            } else if (!usedStablecoin && currentTradeType === 'sell') {
              // For sells, use SOL coming in
              // CRITICAL FIX: solIn should already be calculated correctly (only from balance changes OR transfers, not both)
              // But we need to make sure we're not double-counting by using solVolume as fallback
              let solForSell = solIn;
              
              // Only use native balance change if solIn is 0 AND it's positive (SOL coming in)
              if (solIn === 0 && walletAccount.nativeBalanceChange) {
                const nativeChange = parseFloat(walletAccount.nativeBalanceChange.toString()) / 1e9;
                // For sells, native balance change should be positive (SOL coming in)
                if (nativeChange > 0) {
                  solForSell = nativeChange;
                }
              }
              
              // CRITICAL: Don't use solVolume as fallback for sells - it might include WSOL that's already counted
              // solVolume is calculated using Math.max() which might pick WSOL from transfers,
              // but solIn should already have the correct WSOL amount from balance changes
              // If solIn is still 0, we've already tried native balance change above
              // Using solVolume here would risk double-counting
              
              // Debug logging to track down the doubling issue
              if (solIn > 0) {
                console.log(`[SELL DEBUG] Token: ${currentTokenMint.slice(0, 8)}, solIn: ${solIn}, solForSell: ${solForSell}, solVolume: ${solVolume}`);
                console.log(`[SELL DEBUG] Using solIn (${solIn}) for sell, NOT using solVolume (${solVolume}) to avoid double-counting`);
              }
              
              if (solForSell > 0) {
                // If multiple tokens, distribute proportionally
                const totalTokenAmounts = walletAccount.tokenBalanceChanges
                  .filter((tbc: any) => parseFloat(tbc.tokenAmount?.toString() || '0') < 0) // Only sells
                  .reduce((sum: number, tbc: any) => sum + Math.abs(parseFloat(tbc.tokenAmount?.toString() || '0')), 0);
                
                if (totalTokenAmounts > 0) {
                  tokenSOLVolume = (currentTokenAmount / totalTokenAmounts) * solForSell;
                } else {
                  tokenSOLVolume = solForSell / walletAccount.tokenBalanceChanges.filter((tbc: any) => parseFloat(tbc.tokenAmount?.toString() || '0') < 0).length;
                }
              } else {
                // DO NOT use solVolume as fallback for sells - it causes double-counting!
                // If we couldn't determine solForSell, skip this sell rather than double-count
                console.warn(`⚠️  Sell detected but no SOL volume found for ${currentTokenMint.slice(0, 8)}, skipping to avoid double-counting`);
                tokenSOLVolume = 0; // Will be skipped by the tokenSOLVolume > 0 check below
              }
            }
            
            // Debug: Log SOL volume calculation for buys specifically
            if (currentTradeType === 'buy') {
              const txSig = tx.signature?.slice(0, 16) || 'UNKNOWN';
              console.log(`[BUY DEBUG] ${txSig}... Token: ${currentTokenMint.slice(0, 8)}, Balance change: ${currentTokenBalanceChange}, Amount: ${currentTokenAmount}`);
              console.log(`[BUY DEBUG] SOL out: ${solOut}, SOL in: ${solIn}, Total solVolume: ${solVolume}, Token SOL volume: ${tokenSOLVolume}`);
              console.log(`[BUY DEBUG] Native transfers count: ${tx.nativeTransfers?.length || 0}`);
              if (tx.nativeTransfers && tx.nativeTransfers.length > 0) {
                console.log(`[BUY DEBUG] Native transfers:`, tx.nativeTransfers.map((t: any) => ({
                  from: (t.fromUserAccount || t.from || '').slice(0, 8),
                  to: (t.toUserAccount || t.to || '').slice(0, 8),
                  amount: parseFloat(t.amount?.toString() || '0') / 1e9
                })));
              }
              console.log(`[BUY DEBUG] Token transfers count: ${tx.tokenTransfers?.length || 0}`);
              if (tx.tokenTransfers && tx.tokenTransfers.length > 0) {
                const wsolTransfers = tx.tokenTransfers.filter((t: any) => {
                  const mint = t.mint || t.tokenAddress || t.token || '';
                  return mint === WSOL_MINT;
                });
                console.log(`[BUY DEBUG] WSOL transfers found: ${wsolTransfers.length}`);
                wsolTransfers.forEach((t: any, idx: number) => {
                  const rawAmount = parseFloat(t.tokenAmount?.toString() || '0');
                  const wsolAmount = rawAmount > 1e6 ? rawAmount / 1e9 : rawAmount;
                  console.log(`[BUY DEBUG] WSOL transfer ${idx + 1}:`, {
                    from: (t.fromUserAccount || t.from || '').slice(0, 8),
                    to: (t.toUserAccount || t.to || '').slice(0, 8),
                    rawAmount,
                    wsolAmount,
                    isFromWallet: (t.fromUserAccount || t.from || '') === walletAddress
                  });
                });
              }
              // Check tokenBalanceChanges for WSOL
              if (walletAccount && walletAccount.tokenBalanceChanges) {
                const wsolTBC = walletAccount.tokenBalanceChanges.find((tbc: any) => {
                  const mint = tbc.mint || tbc.tokenAddress || '';
                  return mint === WSOL_MINT;
                });
                if (wsolTBC) {
                  const wsolChange = parseFloat(wsolTBC.tokenAmount?.toString() || '0');
                  const wsolAmount = Math.abs(wsolChange) / 1e9;
                  console.log(`[BUY DEBUG] WSOL balance change: ${wsolChange} (${wsolAmount} SOL)`);
                } else {
                  console.log(`[BUY DEBUG] No WSOL balance change found in tokenBalanceChanges`);
                }
              }
            }
            
            if (tokenSOLVolume > 0 || usedStablecoin) {
              // Track volume
              if (usedStablecoin) {
                // Already have tradeValueUSD from stablecoin
                totalVolumeSOL += tokenSOLVolume; // SOL equivalent for volume tracking
                totalVolumeUSD += tradeValueUSD; // Actual USD value
              } else {
                // Use actual SOL volume (most accurate)
                totalVolumeSOL += tokenSOLVolume; // Track SOL directly
                // Will be recalculated with proper price below in buy/sell sections
                const tempTradeValueUSD = tokenSOLVolume * 150;
                totalVolumeUSD += tempTradeValueUSD;
              }
            } else {
              // No SOL or stablecoin volume data - skip this trade
              console.error(`❌ CRITICAL: No SOL/USD volume data for ${currentTokenMint.slice(0, 8)} (${currentTradeType}), skipping trade`);
              console.error(`   Transaction: ${tx.signature?.slice(0, 16)}...`);
              console.error(`   Total SOL volume: ${solVolume}, Token SOL volume: ${tokenSOLVolume}`);
              console.error(`   TX USD1 amount: ${txUsd1Amount}, direction: ${txUsd1Direction}`);
              console.error(`   SOL out: ${solOut}, SOL in: ${solIn}`);
              console.error(`   This means the ${currentTradeType} won't be tracked!`);
              if (currentTradeType === 'buy') {
                console.error(`   ⚠️  THIS IS A MISSED BUY - PNL will be incorrect!`);
              }
              continue; // Skip to next token balance change
            }

            // Initialize token stats if needed (use same approach as fallback path)
            if (!tokenStats[currentTokenMint]) {
              const symbol = tokenSymbolCache[currentTokenMint] || currentTokenMint.slice(0, 8) + '...';
              const imageUrl = tokenImageCache[currentTokenMint] || null;
              tokenStats[currentTokenMint] = {
                symbol: symbol,
                imageUrl: imageUrl,
                totalSpentSOL: 0,
                totalReceivedSOL: 0,
                totalSpentUSD: 0,
                totalReceivedUSD: 0,
                totalTokensSold: 0,
                lastTradeDate: timestamp
              };
            }
            tokenStats[currentTokenMint].lastTradeDate = timestamp;

            if (currentTradeType === 'buy' && (tokenSOLVolume > 0 || usedStablecoin)) {
              // Buying token with SOL or stablecoin - track total spent
              if (!positions[currentTokenMint]) {
                positions[currentTokenMint] = { amount: 0, totalCostSOL: 0 };
              }
              const pos = positions[currentTokenMint];
              pos.amount += currentTokenAmount;
              pos.totalCostSOL += tokenSOLVolume;
              
              // Track total SOL spent on this token
              tokenStats[currentTokenMint].totalSpentSOL += tokenSOLVolume;
              
              // Calculate USD value (either from stablecoin or convert SOL)
              let finalTradeValueUSD = tradeValueUSD;
              let solPriceForTrade = currentSOLPrice;
              
              if (!usedStablecoin) {
                // Convert SOL to USD using historical price
                const tradeTimestamp = Math.floor(timestamp.getTime() / 1000);
                solPriceForTrade = getSolPriceForTimestamp(tradeTimestamp);
                finalTradeValueUSD = tokenSOLVolume * solPriceForTrade;
              }
              
              tokenStats[currentTokenMint].totalSpentUSD += finalTradeValueUSD;
              
              console.log(`Buy: ${tokenStats[currentTokenMint].symbol} (${currentTokenMint.slice(0, 8)}) - ${currentTokenAmount.toFixed(2)} tokens for ${usedStablecoin ? `$${finalTradeValueUSD.toFixed(2)} USD1` : `${tokenSOLVolume.toFixed(4)} SOL ($${finalTradeValueUSD.toFixed(2)} @ $${solPriceForTrade.toFixed(2)}/SOL)`}`);
            } else if (currentTradeType === 'sell' && (tokenSOLVolume > 0 || usedStablecoin)) {
              // Selling token for SOL or stablecoin - track total received
              tokenStats[currentTokenMint].totalReceivedSOL += tokenSOLVolume;
              tokenStats[currentTokenMint].totalTokensSold += currentTokenAmount;
              
              // Calculate USD value (either from stablecoin or convert SOL)
              let finalTradeValueUSD = tradeValueUSD;
              let solPriceForTrade = currentSOLPrice;
              
              if (!usedStablecoin) {
                // Convert SOL to USD using historical price
                const tradeTimestamp = Math.floor(timestamp.getTime() / 1000);
                solPriceForTrade = getSolPriceForTimestamp(tradeTimestamp);
                finalTradeValueUSD = tokenSOLVolume * solPriceForTrade;
              }
              
              tokenStats[currentTokenMint].totalReceivedUSD += finalTradeValueUSD;
              
              console.log(`✅ SELL: ${tokenStats[currentTokenMint].symbol} (${currentTokenMint.slice(0, 8)}) - ${currentTokenAmount.toFixed(2)} tokens for ${usedStablecoin ? `$${finalTradeValueUSD.toFixed(2)} USD1` : `${tokenSOLVolume.toFixed(4)} SOL ($${finalTradeValueUSD.toFixed(2)} @ $${solPriceForTrade.toFixed(2)}/SOL)`}`);
              console.log(`   TX: ${tx.signature?.slice(0, 16)}... | solIn: ${solIn}, USD1: ${usedStablecoin ? txUsd1Amount : 0}, tokenSOLVolume: ${tokenSOLVolume}`);
              
              // Update position for tracking (to know if fully sold)
              if (positions[currentTokenMint] && positions[currentTokenMint].amount > 0) {
                const pos = positions[currentTokenMint];
                // Calculate cost basis for the amount sold (proportional to current position)
                // Use average cost method: cost basis = (tokens sold / total tokens in position) * total cost
                // Safety check: don't sell more than we have
                const tokensToSell = Math.min(currentTokenAmount, pos.amount);
                const costBasisSOL = pos.amount > 0 ? (tokensToSell / pos.amount) * pos.totalCostSOL : 0;
                
                pos.amount -= tokensToSell;
                pos.totalCostSOL -= costBasisSOL;
                
                // Round to avoid floating point errors
                if (pos.amount < 0.0001) {
                  pos.amount = 0;
                }
                if (pos.totalCostSOL < 0.0001) {
                  pos.totalCostSOL = 0;
                }
                
                if (pos.amount <= 0) {
                  delete positions[currentTokenMint];
                }
              } else {
                // No position found - this means all tokens were sold or buy was outside transaction window
                // This is okay - we'll still track the sell for realized PNL calculation
                // The cost basis will be calculated using average cost method at the end
              }
            }

            tradesByDate[date].pnl += 0; // Will calculate PNL at the end per token
          }
        }
      }
      
      // CRITICAL: Also process tokenTransfers if tokenBalanceChanges are missing or incomplete
      // Some DEXes (like Pump.fun) use tokenTransfers instead of tokenBalanceChanges
      // Track which tokens we've already processed from tokenBalanceChanges
      const processedTokens = new Set<string>();
      if (hasTokenBalanceChanges) {
        walletAccount.tokenBalanceChanges.forEach((tbc: any) => {
          const mint = tbc.mint || tbc.tokenAddress || '';
          if (mint) processedTokens.add(mint);
        });
      }
      
      // Process tokenTransfers for tokens NOT already processed via tokenBalanceChanges
      if (hasTokenTransfersData) {
        // Process ALL token transfers (not just the first one)
        // CRITICAL FIX: Calculate total SOL out/in ONCE per transaction, then distribute proportionally
        const WSOL_MINT = 'So11111111111111111111111111111111111111112';
        
        // Calculate total SOL movement for this transaction ONCE
        let txTotalSolOut = 0;
        let txTotalSolIn = 0;
        
        // Check native transfers
        // CRITICAL FIX: Track max SOL amount per direction, don't sum all transfers!
        let maxNativeSolOut = 0;
        let maxNativeSolIn = 0;
        if (tx.nativeTransfers && Array.isArray(tx.nativeTransfers)) {
          for (const natTransfer of tx.nativeTransfers) {
            const natFrom = natTransfer.fromUserAccount || natTransfer.from || '';
            const natTo = natTransfer.toUserAccount || natTransfer.to || '';
            const natAmount = parseFloat(natTransfer.amount?.toString() || '0') / 1e9;
            
            if (natFrom === walletAddress && natTo !== walletAddress && natAmount > 0.0001) {
              maxNativeSolOut = Math.max(maxNativeSolOut, natAmount); // Use max, not sum!
            } else if (natTo === walletAddress && natFrom !== walletAddress && natAmount > 0.0001) {
              maxNativeSolIn = Math.max(maxNativeSolIn, natAmount); // Use max, not sum!
            }
          }
        }
        // DON'T add native transfers yet - we need to compare with WSOL first to avoid double-counting!
        // txTotalSolOut += maxNativeSolOut;
        // txTotalSolIn += maxNativeSolIn;
        
        // CRITICAL FIX: Check tokenBalanceChanges for WSOL FIRST - this is MORE ACCURATE!
        // tokenBalanceChanges shows the actual NET balance change, which is what we need
        // We check this FIRST to avoid double-counting with tokenTransfers
        let wsolFromBalanceChange = 0;
        let wsolBalanceChangeDirection: 'out' | 'in' | null = null;
        if (walletAccount && walletAccount.tokenBalanceChanges) {
          for (const tbc of walletAccount.tokenBalanceChanges) {
            const mint = tbc.mint || tbc.tokenAddress || '';
            if (mint === WSOL_MINT) {
              const wsolChange = parseFloat(tbc.tokenAmount?.toString() || '0');
              const wsolAmount = Math.abs(wsolChange) / 1e9; // tokenAmount is in lamports
              
              // WSOL balance decreasing = SOL going out (buy)
              if (wsolChange < 0 && wsolAmount > 0.0001) {
                wsolFromBalanceChange = wsolAmount;
                wsolBalanceChangeDirection = 'out';
              }
              // WSOL balance increasing = SOL coming in (sell)
              else if (wsolChange > 0 && wsolAmount > 0.0001) {
                wsolFromBalanceChange = wsolAmount;
                wsolBalanceChangeDirection = 'in';
              }
            }
          }
        }
        
        // Check WSOL transfers - ONLY if we didn't find a balance change
        // tokenTransfers and tokenBalanceChanges often represent the same movement, so we should use balance change as primary
        if (wsolFromBalanceChange === 0 && tx.tokenTransfers && Array.isArray(tx.tokenTransfers)) {
          // CRITICAL FIX: Track max WSOL amount per direction, don't sum all transfers!
          // Multiple WSOL transfers can occur in a single swap, but we only want the NET amount
          let maxWsolOut = 0;
          let maxWsolIn = 0;
          
          console.log(`[WSOL TRANSFERS CHECK] TX ${txSig}... checking ${tx.tokenTransfers.length} transfers`);
          console.log(`[DEBUG] WSOL_MINT we're looking for: ${WSOL_MINT}`);
          
          for (const wsolTransfer of tx.tokenTransfers) {
            const wsolMint = wsolTransfer.mint || wsolTransfer.tokenAddress || wsolTransfer.token || '';
            console.log(`  Transfer mint: ${wsolMint.slice(0, 12)}... (length: ${wsolMint.length})`);
            console.log(`  Matches WSOL? ${wsolMint === WSOL_MINT}`);
            
            if (wsolMint === WSOL_MINT) {
              const wsolFrom = wsolTransfer.fromUserAccount || wsolTransfer.from || '';
              const wsolTo = wsolTransfer.toUserAccount || wsolTransfer.to || '';
              // tokenAmount might be in different formats - try both raw and divided by 1e9
              const rawAmount = parseFloat(wsolTransfer.tokenAmount?.toString() || '0');
              // If amount is very large (> 1e6), it's likely in lamports, divide by 1e9
              // If amount is small (< 1000), it might already be in SOL
              const wsolAmount = rawAmount > 1e6 ? rawAmount / 1e9 : rawAmount;
              
              console.log(`  WSOL transfer: from=${wsolFrom.slice(0,8)} to=${wsolTo.slice(0,8)} amount=${wsolAmount.toFixed(4)} SOL`);
              console.log(`    From wallet? ${wsolFrom === walletAddress}, To wallet? ${wsolTo === walletAddress}`);
              
              if (wsolFrom === walletAddress && wsolTo !== walletAddress && wsolAmount > 0.0001) {
                console.log(`    → Adding to maxWsolOut: ${wsolAmount}`);
                maxWsolOut = Math.max(maxWsolOut, wsolAmount); // Use max, not sum!
              } else if (wsolTo === walletAddress && wsolFrom !== walletAddress && wsolAmount > 0.0001) {
                console.log(`    → Adding to maxWsolIn: ${wsolAmount}`);
                maxWsolIn = Math.max(maxWsolIn, wsolAmount); // Use max, not sum!
              }
            }
          }
          
          console.log(`[WSOL TOTALS] maxWsolOut: ${maxWsolOut}, maxWsolIn: ${maxWsolIn}`);
          console.log(`[NATIVE TOTALS] maxNativeSolOut: ${maxNativeSolOut}, maxNativeSolIn: ${maxNativeSolIn}`);
          
          // CRITICAL: Use the LARGER of native or WSOL, NOT BOTH!
          // They often represent the SAME SOL movement (native wraps to WSOL or vice versa)
          txTotalSolOut = Math.max(maxNativeSolOut, maxWsolOut);
          txTotalSolIn = Math.max(maxNativeSolIn, maxWsolIn);
          
          console.log(`[SOL TOTALS FINAL] Using max of native/WSOL - txTotalSolOut: ${txTotalSolOut}, txTotalSolIn: ${txTotalSolIn}`);
        } else if (wsolFromBalanceChange > 0) {
          // Use the balance change (more accurate, avoids double-counting)
          console.log(`[WSOL BALANCE CHANGE] Using balance change instead of transfers: ${wsolFromBalanceChange}, direction: ${wsolBalanceChangeDirection}`);
          console.log(`[NATIVE TOTALS] maxNativeSolOut: ${maxNativeSolOut}, maxNativeSolIn: ${maxNativeSolIn}`);
          
          // CRITICAL: Compare balance change with native transfers, use the larger
          if (wsolBalanceChangeDirection === 'out') {
            txTotalSolOut = Math.max(maxNativeSolOut, wsolFromBalanceChange);
          } else if (wsolBalanceChangeDirection === 'in') {
            txTotalSolIn = Math.max(maxNativeSolIn, wsolFromBalanceChange);
          }
          console.log(`[SOL TOTALS FINAL] Using max of native/balanceChange - txTotalSolOut: ${txTotalSolOut}, txTotalSolIn: ${txTotalSolIn}`);
        } else {
          // No WSOL found, just use native transfers
          txTotalSolOut = maxNativeSolOut;
          txTotalSolIn = maxNativeSolIn;
          console.log(`[SOL TOTALS FINAL] No WSOL, using native only - txTotalSolOut: ${txTotalSolOut}, txTotalSolIn: ${txTotalSolIn}`);
        }
        
        // Collect all valid token transfers first
        const validTransfers: Array<{
          mint: string;
          amount: number;
          tradeType: 'buy' | 'sell';
          fromAddr: string;
          toAddr: string;
        }> = [];
        
        for (const transfer of tx.tokenTransfers) {
          const transferMint = transfer.mint || transfer.tokenAddress || transfer.token || '';
          // Skip WSOL - we handle it separately for SOL volume
          // Skip tokens already processed via tokenBalanceChanges
          if (!transferMint || transferMint === WSOL_MINT || processedTokens.has(transferMint)) {
            if (transferMint === WSOL_MINT) {
              // WSOL is handled separately, skip
            } else if (processedTokens.has(transferMint)) {
              // Already processed via tokenBalanceChanges, skip
            } else if (!transferMint) {
              console.warn(`[TX DEBUG] ${txSig}... tokenTransfer with no mint address`);
            }
            continue;
          }
          
          const fromAddr = transfer.fromUserAccount || transfer.from || '';
          const toAddr = transfer.toUserAccount || transfer.to || '';
          const transferAmount = parseFloat(transfer.tokenAmount?.toString() || '0');
          
          // Determine if this is a buy (token coming TO wallet) or sell (token going FROM wallet)
          let transferTradeType: 'buy' | 'sell' | null = null;
          if (toAddr === walletAddress && fromAddr !== walletAddress && transferAmount > 0) {
            transferTradeType = 'buy'; // Token coming in = buy
            console.log(`[BUY DETECTED] ${txSig}... Token ${transferMint.slice(0, 8)} coming TO wallet (${transferAmount.toFixed(2)} tokens)`);
          } else if (fromAddr === walletAddress && toAddr !== walletAddress && transferAmount > 0) {
            transferTradeType = 'sell'; // Token going out = sell
          }
          
          if (transferTradeType && transferAmount > 0) {
            console.log(`[ADDING TO VALID TRANSFERS] ${transferTradeType.toUpperCase()}: ${transferMint.slice(0, 8)}, amount: ${transferAmount}`);
            validTransfers.push({
              mint: transferMint,
              amount: transferAmount,
              tradeType: transferTradeType,
              fromAddr,
              toAddr
            });
          } else if (transferAmount > 0) {
            // Log why this transfer wasn't added
            console.warn(`[TX DEBUG] ${txSig}... Token transfer not added:`, {
              mint: transferMint.slice(0, 8),
              amount: transferAmount,
              fromAddr: fromAddr.slice(0, 8),
              toAddr: toAddr.slice(0, 8),
              walletAddress: walletAddress.slice(0, 8),
              isToWallet: toAddr === walletAddress,
              isFromWallet: fromAddr === walletAddress
            });
          }
        }
        
        // Now process transfers and distribute SOL proportionally
        // If multiple tokens, distribute SOL based on token amounts (rough approximation)
        // For more accuracy, we'd need token prices, but this is better than double-counting
        console.log(`[VALID TRANSFERS] Found ${validTransfers.length} valid transfers:`);
        validTransfers.forEach((t, idx) => {
          console.log(`  [${idx}] ${t.tradeType.toUpperCase()}: ${t.mint.slice(0, 8)}, amount: ${t.amount}`);
        });
        const totalTokenAmount = validTransfers.reduce((sum, t) => sum + t.amount, 0);
        
        for (const transfer of validTransfers) {
          processedCount++;
          
          if (processedCount % 50 === 0) {
            console.log(`Processed ${processedCount} trades...`);
          }
          
          // Distribute SOL proportionally if multiple tokens, otherwise use full amount
          let transferTokenSOLVolume = 0;
          if (transfer.tradeType === 'buy') {
            if (validTransfers.length === 1) {
              // Single token - use all SOL out
              transferTokenSOLVolume = txTotalSolOut > 0 ? txTotalSolOut : (solVolume > 0 ? solVolume : 0);
            } else {
              // Multiple tokens - distribute proportionally
              const proportion = totalTokenAmount > 0 ? transfer.amount / totalTokenAmount : 1 / validTransfers.length;
              transferTokenSOLVolume = txTotalSolOut > 0 ? txTotalSolOut * proportion : (solVolume > 0 ? solVolume * proportion : 0);
            }
            
            // CRITICAL: If still 0, we MUST track the buy - tokens don't appear from nowhere
            // Use native balance change or estimate minimum
            if (transferTokenSOLVolume === 0) {
              if (walletAccount?.nativeBalanceChange) {
                const nativeChange = parseFloat(walletAccount.nativeBalanceChange.toString()) / 1e9;
                if (nativeChange < 0) {
                  transferTokenSOLVolume = Math.abs(nativeChange) / validTransfers.length;
                } else {
                  // Even if positive, if tokens came in, SOL must have gone out
                  // Use absolute value as estimate
                  transferTokenSOLVolume = Math.abs(nativeChange) / validTransfers.length;
                }
              }
              // Last resort: use transaction fee as minimum estimate
              if (transferTokenSOLVolume === 0 || transferTokenSOLVolume < 0.0001) {
                const fee = parseFloat(tx.fee?.toString() || '0') / 1e9;
                transferTokenSOLVolume = Math.max(fee * 10, 0.01); // Estimate at least 0.01 SOL for any trade
                console.warn(`⚠️  Buy detected (tokenTransfers) but no SOL volume found for ${transfer.mint.slice(0, 8)}, using estimate: ${transferTokenSOLVolume} SOL`);
                console.warn(`   Transaction: ${tx.signature?.slice(0, 16)}...`);
              }
            }
          } else if (transfer.tradeType === 'sell') {
            // CRITICAL: Use txTotalSolIn which is calculated ONCE per transaction and avoids double-counting
            // Don't use solVolume as fallback - it might include WSOL that's already counted in txTotalSolIn
            console.log(`[SELL CALCULATION] Token: ${transfer.mint.slice(0,8)}, validTransfers.length: ${validTransfers.length}, txTotalSolIn: ${txTotalSolIn}`);
            
            if (validTransfers.length === 1) {
              // Single token - use all SOL in
              transferTokenSOLVolume = txTotalSolIn > 0 ? txTotalSolIn : 0;
              console.log(`[SELL] Single token - using full txTotalSolIn: ${transferTokenSOLVolume}`);
            } else {
              // Multiple tokens - distribute proportionally
              const proportion = totalTokenAmount > 0 ? transfer.amount / totalTokenAmount : 1 / validTransfers.length;
              transferTokenSOLVolume = txTotalSolIn > 0 ? txTotalSolIn * proportion : 0;
              console.log(`[SELL] Multiple tokens - proportion: ${proportion}, transferTokenSOLVolume: ${transferTokenSOLVolume}`);
            }
            
            // Fallback: use native balance change if still 0 (but NOT solVolume to avoid double-counting)
            if (transferTokenSOLVolume === 0 && walletAccount?.nativeBalanceChange) {
              const nativeChange = parseFloat(walletAccount.nativeBalanceChange.toString()) / 1e9;
              if (nativeChange > 0) {
                transferTokenSOLVolume = nativeChange / validTransfers.length;
              }
            }
            
            // Debug logging
            if (txTotalSolIn > 0) {
              console.log(`[SELL DEBUG] Transfer: ${transfer.mint.slice(0, 8)}, txTotalSolIn: ${txTotalSolIn}, transferTokenSOLVolume: ${transferTokenSOLVolume}, solVolume: ${solVolume}`);
            }
          }
          
          if (transferTokenSOLVolume > 0) {
            // Only count volume once per transaction (not per token)
            if (validTransfers.indexOf(transfer) === 0) {
              // Only count volume for first transfer to avoid double-counting
              totalVolumeSOL += (transfer.tradeType === 'buy' ? txTotalSolOut : txTotalSolIn) || solVolume || 0;
              const transferTradeValueUSD = ((transfer.tradeType === 'buy' ? txTotalSolOut : txTotalSolIn) || solVolume || 0) * 150;
              totalVolumeUSD += transferTradeValueUSD;
            }
            
            // Initialize token stats
            if (!tokenStats[transfer.mint]) {
              const symbol = tokenSymbolCache[transfer.mint] || transfer.mint.slice(0, 8) + '...';
              const imageUrl = tokenImageCache[transfer.mint] || null;
              tokenStats[transfer.mint] = {
                symbol: symbol,
                imageUrl: imageUrl,
                totalSpentSOL: 0,
                totalReceivedSOL: 0,
                totalSpentUSD: 0,
                totalReceivedUSD: 0,
                totalTokensSold: 0,
                lastTradeDate: timestamp
              };
            }
            tokenStats[transfer.mint].lastTradeDate = timestamp;
            
            if (transfer.tradeType === 'buy') {
              if (!positions[transfer.mint]) {
                positions[transfer.mint] = { amount: 0, totalCostSOL: 0 };
              }
              const pos = positions[transfer.mint];
              pos.amount += transfer.amount;
              pos.totalCostSOL += transferTokenSOLVolume;
              tokenStats[transfer.mint].totalSpentSOL += transferTokenSOLVolume;
              
              // Convert to USD using SOL price at this trade's timestamp (more accurate)
              const tradeTimestamp = Math.floor(timestamp.getTime() / 1000);
              const solPriceForTrade = getSolPriceForTimestamp(tradeTimestamp);
              const tradeValueUSD = transferTokenSOLVolume * solPriceForTrade;
              tokenStats[transfer.mint].totalSpentUSD += tradeValueUSD;
              
              console.log(`Buy (from tokenTransfers): ${tokenStats[transfer.mint].symbol} (${transfer.mint.slice(0, 8)}) - ${transfer.amount.toFixed(2)} tokens for ${transferTokenSOLVolume.toFixed(4)} SOL ($${tradeValueUSD.toFixed(2)})`);
            } else if (transfer.tradeType === 'sell') {
              tokenStats[transfer.mint].totalReceivedSOL += transferTokenSOLVolume;
              tokenStats[transfer.mint].totalTokensSold += transfer.amount;
              
              // Convert to USD using SOL price at this trade's timestamp (more accurate)
              const tradeTimestamp = Math.floor(timestamp.getTime() / 1000);
              const solPriceForTrade = getSolPriceForTimestamp(tradeTimestamp);
              const tradeValueUSD = transferTokenSOLVolume * solPriceForTrade;
              tokenStats[transfer.mint].totalReceivedUSD += tradeValueUSD;
              
              console.log(`Sell (from tokenTransfers): ${tokenStats[transfer.mint].symbol} (${transfer.mint.slice(0, 8)}) - ${transfer.amount.toFixed(2)} tokens for ${transferTokenSOLVolume.toFixed(4)} SOL ($${tradeValueUSD.toFixed(2)})`);
              
              // Update position
              if (positions[transfer.mint] && positions[transfer.mint].amount > 0) {
                const pos = positions[transfer.mint];
                const tokensToSell = Math.min(transfer.amount, pos.amount);
                const costBasisSOL = pos.amount > 0 ? (tokensToSell / pos.amount) * pos.totalCostSOL : 0;
                pos.amount -= tokensToSell;
                pos.totalCostSOL -= costBasisSOL;
                if (pos.amount < 0.0001) pos.amount = 0;
                if (pos.totalCostSOL < 0.0001) pos.totalCostSOL = 0;
                if (pos.amount <= 0) delete positions[transfer.mint];
              }
            }
            
            tradesByDate[date].pnl += 0;
          } else {
            // Even if SOL volume is 0, we should still track the trade if it's a buy
            // Use minimum estimate to ensure buy is recorded
            if (transfer.tradeType === 'buy') {
              const fee = parseFloat(tx.fee?.toString() || '0') / 1e9;
              const estimatedSOL = Math.max(fee * 10, 0.01);
              console.warn(`⚠️  Buy detected but no SOL volume for ${transfer.mint.slice(0, 8)}, using minimum estimate: ${estimatedSOL} SOL`);
              console.warn(`   Transaction: ${tx.signature?.slice(0, 16)}...`);
              
              // Initialize token stats
              if (!tokenStats[transfer.mint]) {
                const symbol = tokenSymbolCache[transfer.mint] || transfer.mint.slice(0, 8) + '...';
                const imageUrl = tokenImageCache[transfer.mint] || null;
                tokenStats[transfer.mint] = {
                  symbol: symbol,
                  imageUrl: imageUrl,
                  totalSpentSOL: 0,
                  totalReceivedSOL: 0,
                  totalSpentUSD: 0,
                  totalReceivedUSD: 0,
                  totalTokensSold: 0,
                  lastTradeDate: timestamp
                };
              }
              
              if (!positions[transfer.mint]) {
                positions[transfer.mint] = { amount: 0, totalCostSOL: 0 };
              }
              const pos = positions[transfer.mint];
              pos.amount += transfer.amount;
              pos.totalCostSOL += estimatedSOL;
              tokenStats[transfer.mint].totalSpentSOL += estimatedSOL;
              
              // Convert to USD using SOL price at this trade's timestamp (more accurate)
              const tradeTimestamp = Math.floor(timestamp.getTime() / 1000);
              const solPriceForTrade = getSolPriceForTimestamp(tradeTimestamp);
              const tradeValueUSD = estimatedSOL * solPriceForTrade;
              tokenStats[transfer.mint].totalSpentUSD += tradeValueUSD;
              
              console.log(`Buy (from tokenTransfers, estimated): ${tokenStats[transfer.mint].symbol} (${transfer.mint.slice(0, 8)}) - ${transfer.amount.toFixed(2)} tokens for ${estimatedSOL.toFixed(4)} SOL ($${tradeValueUSD.toFixed(2)}) (ESTIMATED)`);
            } else {
              console.warn(`⚠️  Token transfer detected but no SOL volume for ${transfer.mint.slice(0, 8)} (${transfer.tradeType})`);
            }
          }
        }
      }
      
      // Fallback: If no tokenBalanceChanges but we have token info from transfers/events, process it
      if ((!walletAccount || !walletAccount.tokenBalanceChanges || walletAccount.tokenBalanceChanges.length === 0) 
          && tokenMint && tokenAmount > 0 && tradeType && solVolume > 0 && !hasTokenTransfersData) {
        // Fallback: process single token trade (original logic)
        // No need to fetch prices - we only need SOL amounts for PNL
        if (tradeType === 'buy') {
          console.log(`[BUY DEBUG FALLBACK] Processing buy via fallback path (no tokenBalanceChanges)`);
          console.log(`[BUY DEBUG FALLBACK] Token: ${tokenMint.slice(0, 8)}, Amount: ${tokenAmount}, SOL volume: ${solVolume}`);
          console.log(`[BUY DEBUG FALLBACK] Transaction: ${tx.signature?.slice(0, 16)}...`);
        }
        processedCount++;
        
        if (processedCount % 50 === 0) {
          console.log(`Processed ${processedCount} trades...`);
        }
        
        // Calculate trade value - use SOL volume (most accurate)
        // solVolume > 0 is already checked in the if condition above
        totalVolumeSOL += solVolume; // Track SOL directly
        const tradeValueUSD = solVolume * 150; // Convert to USD for display
        totalVolumeUSD += tradeValueUSD;

        // Initialize token stats if needed
        if (!tokenStats[tokenMint]) {
          // Get token symbol from cache (pre-fetched)
          const symbol = tokenSymbolCache[tokenMint] || tokenMint.slice(0, 8) + '...';
          const imageUrl = tokenImageCache[tokenMint] || null;
          tokenStats[tokenMint] = {
            symbol: symbol,
            imageUrl: imageUrl,
            totalSpentSOL: 0,
            totalReceivedSOL: 0,
            totalSpentUSD: 0,
            totalReceivedUSD: 0,
            totalTokensSold: 0,
            lastTradeDate: timestamp
          };
        }
        tokenStats[tokenMint].lastTradeDate = timestamp;

        if (tradeType === 'buy' && solVolume > 0) {
          // Buying token with SOL - track total spent in SOL
          if (!positions[tokenMint]) {
            positions[tokenMint] = { amount: 0, totalCostSOL: 0 };
          }
          const pos = positions[tokenMint];
          pos.amount += tokenAmount;
          pos.totalCostSOL += solVolume;
          
          // Track total SOL spent on this token
          tokenStats[tokenMint].totalSpentSOL += solVolume;
          
          // Convert to USD using SOL price at this trade's timestamp (more accurate)
          const tradeTimestamp = Math.floor(timestamp.getTime() / 1000);
          const solPriceForTrade = getSolPriceForTimestamp(tradeTimestamp);
          const tradeValueUSD = solVolume * solPriceForTrade;
          tokenStats[tokenMint].totalSpentUSD += tradeValueUSD;
          
          console.log(`Buy: ${tokenMint.slice(0, 8)} - ${tokenAmount.toFixed(2)} tokens for ${solVolume.toFixed(4)} SOL ($${tradeValueUSD.toFixed(2)})`);
        } else if (tradeType === 'sell' && solVolume > 0) {
          // Selling token for SOL - track total received in SOL
          tokenStats[tokenMint].totalReceivedSOL += solVolume;
          
          // Convert to USD using SOL price at this trade's timestamp (more accurate)
          const sellTimestamp = Math.floor(timestamp.getTime() / 1000);
          const solPriceForSell = getSolPriceForTimestamp(sellTimestamp);
          const sellValueUSD = solVolume * solPriceForSell;
          tokenStats[tokenMint].totalReceivedUSD += sellValueUSD;
          tokenStats[tokenMint].totalTokensSold += tokenAmount;
          
          console.log(`Sell: ${tokenMint.slice(0, 8)} - ${tokenAmount.toFixed(2)} tokens for ${solVolume.toFixed(4)} SOL`);
          
          // Update position for tracking (to know if fully sold)
          if (positions[tokenMint] && positions[tokenMint].amount > 0) {
            const pos = positions[tokenMint];
            // Calculate cost basis for the amount sold (proportional to current position)
            // Use average cost method: cost basis = (tokens sold / total tokens in position) * total cost
            // Safety check: don't sell more than we have
            const tokensToSell = Math.min(tokenAmount, pos.amount);
            const costBasisSOL = pos.amount > 0 ? (tokensToSell / pos.amount) * pos.totalCostSOL : 0;
            
            pos.amount -= tokensToSell;
            pos.totalCostSOL -= costBasisSOL;
            
            // Round to avoid floating point errors
            if (pos.amount < 0.0001) {
              pos.amount = 0;
            }
            if (pos.totalCostSOL < 0.0001) {
              pos.totalCostSOL = 0;
            }
            
            if (pos.amount <= 0) {
              delete positions[tokenMint];
            }
          } else {
            // No position found - this means all tokens were sold or buy was outside transaction window
            // This is okay - we'll still track the sell for realized PNL calculation
            // The cost basis will be calculated using average cost method at the end
          }
        }

        tradesByDate[date].pnl += 0; // Will calculate PNL at the end per token
      } else if (solVolume > 0.01) {
        // SOL-only trade or swap - count volume in SOL
        totalVolumeSOL += solVolume;
        totalVolumeUSD += solVolume * 150;
      } else if (hasDEXProgram) {
        // DEX interaction but no clear volume - estimate from fee
        // If it's a DEX interaction, there's likely a trade happening
        const fee = parseFloat(tx.fee?.toString() || '0') / 1e9;
        if (fee > 0) {
          // Estimate trade size from fee (fees are usually 0.000005 SOL, so if higher, likely a trade)
          const estimatedSOL = Math.max(fee * 100, 0.1); // Minimum 0.1 SOL trade estimate
          totalVolumeSOL += estimatedSOL;
          totalVolumeUSD += estimatedSOL * 150;
        }
      }
    }
  }

  // Count total trades from tradesByDate (more accurate)
  const totalTrades = Object.values(tradesByDate).reduce((sum, day) => sum + day.count, 0);
  
  console.log(`\n=== Processing Token Stats for PNL Calculation ===`);
  console.log(`Total unique tokens tracked: ${Object.keys(tokenStats).length}`);
  console.log(`Total volume tracked: ${totalVolumeSOL.toFixed(4)} SOL`);
  
  // Calculate total spent/received across all tokens for verification
  let totalSpentAllTokens = 0;
  let totalReceivedAllTokens = 0;
  Object.values(tokenStats).forEach(stats => {
    totalSpentAllTokens += stats.totalSpentSOL;
    totalReceivedAllTokens += stats.totalReceivedSOL;
  });
  console.log(`Total SOL spent (all tokens): ${totalSpentAllTokens.toFixed(4)} SOL`);
  console.log(`Total SOL received (all tokens): ${totalReceivedAllTokens.toFixed(4)} SOL`);
  const netPnLSOL = totalReceivedAllTokens - totalSpentAllTokens;
  console.log(`Net PNL (before filtering): ${netPnLSOL.toFixed(4)} SOL ($${(netPnLSOL * currentSOLPrice).toFixed(2)} USD at current price)`);
  
  console.log(`Sample token stats:`, Object.entries(tokenStats).slice(0, 10).map(([addr, stats]) => ({
    address: addr.slice(0, 8),
    symbol: stats.symbol,
    spent: stats.totalSpentSOL.toFixed(4) + ' SOL',
    received: stats.totalReceivedSOL.toFixed(4) + ' SOL',
    pnlSOL: (stats.totalReceivedSOL - stats.totalSpentSOL).toFixed(4) + ' SOL'
  })));
  
  // SIMPLIFIED PNL CALCULATION: Total SOL Received from Sells - Total SOL Spent on Buys
  // This is the simplest and most accurate method - no complex cost basis calculations needed
  const wins: Array<{ coin: string; profit: number; date: Date; chain?: string }> = [];
  const losses: Array<{ coin: string; loss: number; date: Date; chain?: string }> = [];
  
  // Filter out stablecoins from wins/losses
  const stablecoins = ['USDC', 'USDT', 'USD', 'BUSD', 'DAI', 'FIDA'];
  
  let calculatedTotalPnL = 0;
  
  Object.entries(tokenStats).forEach(([tokenAddress, stats]) => {
    // Skip stablecoins
    const isStablecoin = stablecoins.some(sc => stats.symbol.toUpperCase().includes(sc));
    if (isStablecoin) {
      return;
    }
    
    // SIMPLE PNL: Total Received USD - Total Spent USD
    // USD values are converted using historical SOL prices at the time of each trade
    // This gives accurate PnL accounting for SOL price changes over time
    const tokenPnLUSD = stats.totalReceivedUSD - stats.totalSpentUSD;
    
    // Only include if there were actual trades (either buys or sells)
    const hasTrades = stats.totalSpentSOL > 0 || stats.totalReceivedSOL > 0;
    
    if (hasTrades) {
      calculatedTotalPnL += tokenPnLUSD;
      
      if (tokenPnLUSD > 0) {
        wins.push({
          coin: stats.symbol,
          profit: tokenPnLUSD,
          date: stats.lastTradeDate,
          chain: 'solana',
          imageUrl: stats.imageUrl || undefined,
          mintAddress: tokenAddress
        } as typeof wins[0]);
      } else if (tokenPnLUSD < 0) {
        losses.push({
          coin: stats.symbol,
          loss: tokenPnLUSD,
          date: stats.lastTradeDate,
          chain: 'solana',
          imageUrl: stats.imageUrl || undefined,
          mintAddress: tokenAddress
        } as typeof losses[0]);
      }
    }
    
    const isFullySold = !positions[tokenAddress] || (positions[tokenAddress] && positions[tokenAddress].amount <= 0.0001);
    console.log(`${stats.symbol} (${tokenAddress.slice(0, 8)}): Spent ${stats.totalSpentSOL.toFixed(4)} SOL, Received ${stats.totalReceivedSOL.toFixed(4)} SOL, PNL: $${tokenPnLUSD.toFixed(2)} ${isFullySold ? '(CLOSED)' : '(OPEN)'}`);
  });
  
  // Debug: Log top 10 tokens by PNL to verify order
  const allTokenPnLs = [...wins, ...losses.map(l => ({ coin: l.coin, profit: l.loss, date: l.date, chain: l.chain }))];
  const sortedAllPnLs = allTokenPnLs.sort((a, b) => b.profit - a.profit);
  console.log(`\n=== Top 10 Tokens by PNL ===`);
  sortedAllPnLs.slice(0, 10).forEach((entry, idx) => {
    console.log(`${idx + 1}. ${entry.coin}: $${entry.profit.toFixed(2)}`);
  });
  console.log(`===========================\n`);
  
  // CRITICAL: totalPnL must be in USD (already converted above)
  const totalPnL = calculatedTotalPnL; // This is already in USD from tokenPnLUSD calculations
  const sortedWins = wins.sort((a, b) => b.profit - a.profit).slice(0, 5);
  const sortedLosses = losses.sort((a, b) => a.loss - b.loss).slice(0, 5);

  const biggestTradingDay = Object.entries(tradesByDate)
    .sort(([, a], [, b]) => b.count - a.count)[0] || ['Unknown', { count: 0, pnl: 0 }];

  // Calculate highest PnL day from wins/losses by date (already in USD)
  const pnlByDate: Record<string, number> = {};
  [...wins, ...losses].forEach(entry => {
    const date = entry.date instanceof Date ? entry.date.toLocaleDateString() : new Date(entry.date).toLocaleDateString();
    const pnl = 'profit' in entry ? entry.profit : entry.loss;
    pnlByDate[date] = (pnlByDate[date] || 0) + pnl;
  });
  
  const highestPnLDayEntry = Object.entries(pnlByDate)
    .sort(([, a], [, b]) => b - a)[0] || ['Unknown', 0];

  // Log trades by date for debugging
  const tradesByDateArray = Object.entries(tradesByDate).sort(([, a], [, b]) => b.count - a.count);
  console.log(`\n=== FINAL PNL SUMMARY (ALL VALUES IN USD) ===`);
  console.log(`Total PNL: $${totalPnL.toFixed(2)} USD (calculated from ${Object.keys(tokenStats).length} tokens)`);
  console.log(`Total PNL in SOL: ${(totalPnL / currentSOLPrice).toFixed(4)} SOL (estimated using current SOL price)`);
  console.log(`Processed ${totalTrades} trades, ${totalVolumeSOL.toFixed(2)} SOL volume ($${totalVolumeUSD.toFixed(2)} USD)`);
  console.log(`Top trading days:`, tradesByDateArray.slice(0, 5).map(([date, data]) => `${date}: ${data.count} trades`));
  console.log(`Wins: ${wins.length}, Losses: ${losses.length}`);
  if (sortedWins.length > 0) {
    console.log(`Top wins:`, sortedWins.map(w => `${w.coin}: $${w.profit.toFixed(2)} USD`));
  }
  if (sortedLosses.length > 0) {
    console.log(`Top losses:`, sortedLosses.map(l => `${l.coin}: $${l.loss.toFixed(2)} USD`));
  } else {
    console.log('No losses calculated - might need sells to calculate PNL');
  }
  console.log(`Highest PnL day: ${highestPnLDayEntry[0]} with $${highestPnLDayEntry[1].toFixed(2)} USD`);
  console.log(`=============================================\n`);

  return {
    totalTrades,
    totalVolume: totalVolumeSOL, // Return in SOL for Solana
    totalPnL,
    biggestWins: sortedWins.length > 0 ? sortedWins : [],
    biggestLosses: sortedLosses.length > 0 ? sortedLosses : [],
    paperhands: [],
    biggestTradingDay: {
      date: biggestTradingDay[0],
      trades: biggestTradingDay[1].count
    },
    highestPnLDay: {
      date: highestPnLDayEntry[0],
      pnl: highestPnLDayEntry[1] // Already in USD from wins/losses
    }
  };
}

/**
 * Process Helius Solana transactions
 * Focuses on DEX swaps and token trades, not regular transfers
 * @deprecated Not currently used - using processHeliusTransactionsWithPrices instead
 */
// @ts-expect-error - Unused function, kept for reference
function _processHeliusTransactions(transactions: any[], walletAddress: string): Partial<TradingData> {
  if (transactions.length === 0) {
    return {
      totalTrades: 0,
      totalVolume: 0,
      totalPnL: 0,
      biggestLosses: [],
      biggestWins: [],
      paperhands: [],
      biggestTradingDay: { date: new Date().toLocaleDateString(), trades: 0 },
      highestPnLDay: { date: new Date().toLocaleDateString(), pnl: 0 }
    };
  }

  let totalVolume = 0;
  let totalPnL = 0;
  const trades: Array<{ 
    token: string; 
    amount: number; 
    solAmount: number;
    timestamp: Date; 
    type: 'buy' | 'sell';
    txHash: string;
  }> = [];
  
  // DEX program IDs (Jupiter, Raydium, Orca, etc.)
  const DEX_PROGRAMS = [
    'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4', // Jupiter v6
    'JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB', // Jupiter v4
    '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8', // Raydium AMM
    '9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP', // Orca
    'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc', // Orca Whirlpools
  ];
  
  // Process each transaction - only count DEX swaps and token trades
  transactions.forEach((tx) => {
    const timestamp = new Date((tx.timestamp || 0) * 1000);
    let isDEXTrade = false;
    let solVolume = 0;
    let tokenAmount = 0;
    let tokenMint = '';
    let tradeType: 'buy' | 'sell' | null = null;
    
    // Check if this is a DEX swap by looking at program IDs in instructions
    const hasDEXProgram = tx.instructions?.some((inst: any) => 
      DEX_PROGRAMS.includes(inst.programId)
    ) || false;
    
    // Check for token transfers (token trades)
    if (tx.tokenTransfers && Array.isArray(tx.tokenTransfers) && tx.tokenTransfers.length > 0) {
      // This is likely a token trade
      tx.tokenTransfers.forEach((transfer: any) => {
        const mint = transfer.mint || transfer.tokenAddress || '';
        const amount = parseFloat(transfer.tokenAmount || '0');
        
        if (amount > 0 && mint) {
          tokenMint = mint;
          tokenAmount = amount;
          
          // Determine if buy or sell by checking account balance changes
          const accountData = tx.accountData?.find((acc: any) => acc.account === walletAddress);
          if (accountData) {
            const tokenBalanceChange = accountData.tokenBalanceChanges?.find(
              (tbc: any) => tbc.mint === mint
            );
            
            if (tokenBalanceChange) {
              const balanceChange = parseFloat(tokenBalanceChange.tokenAmount || '0');
              tradeType = balanceChange > 0 ? 'buy' : 'sell';
            }
          }
        }
      });
    }
    
    // Check accountData for token balance changes (more reliable)
    if (tx.accountData) {
      const walletAccount = tx.accountData.find((acc: any) => acc.account === walletAddress);
      if (walletAccount && walletAccount.tokenBalanceChanges && walletAccount.tokenBalanceChanges.length > 0) {
        isDEXTrade = true;
        
        walletAccount.tokenBalanceChanges.forEach((tbc: any) => {
          const balanceChange = parseFloat(tbc.tokenAmount || '0');
          if (Math.abs(balanceChange) > 0) {
            tokenMint = tbc.mint || '';
            tokenAmount = Math.abs(balanceChange);
            tradeType = balanceChange > 0 ? 'buy' : 'sell';
          }
        });
      }
    }
    
    // Calculate SOL volume from native balance changes
    if (tx.accountData) {
      const walletAccount = tx.accountData.find((acc: any) => acc.account === walletAddress);
      if (walletAccount) {
        const solChange = Math.abs(parseFloat(walletAccount.nativeBalanceChange?.toString() || '0')) / 1e9;
        if (solChange > 0.001) { // Only count significant SOL movements (ignore fees)
          solVolume = solChange;
        }
      }
    }
    
    // Only count as trade if it's a DEX swap or has token transfers
    if (isDEXTrade || hasDEXProgram || (tokenMint && tokenAmount > 0)) {
      totalVolume += solVolume || 0.1; // Use SOL volume or minimum
      
      if (tokenMint && tokenAmount > 0 && tradeType) {
        trades.push({
          token: tokenMint,
          amount: tokenAmount,
          solAmount: solVolume,
          timestamp,
          type: tradeType,
          txHash: tx.signature || ''
        });
      }
    }
  });

  // Filter out regular transfers - only count actual trades
  const actualTrades = transactions.filter(tx => {
    const hasTokenTransfers = tx.tokenTransfers && tx.tokenTransfers.length > 0;
    const hasDEXProgram = tx.instructions?.some((inst: any) => 
      DEX_PROGRAMS.includes(inst.programId)
    );
    const hasTokenBalanceChanges = tx.accountData?.some((acc: any) => 
      acc.account === walletAddress && 
      acc.tokenBalanceChanges && 
      acc.tokenBalanceChanges.length > 0
    );
    
    return hasTokenTransfers || hasDEXProgram || hasTokenBalanceChanges;
  });

  const totalTrades = actualTrades.length;
  
  // Calculate PNL (simplified - would need token prices for accurate calculation)
  // For now, use a placeholder based on trade count
  totalPnL = totalTrades > 0 ? totalVolume * 0.02 : 0; // 2% of volume as placeholder

  // Group trades by date
  const tradesByDate: Record<string, number> = {};
  actualTrades.forEach((tx) => {
    const date = new Date((tx.timestamp || 0) * 1000).toLocaleDateString();
    tradesByDate[date] = (tradesByDate[date] || 0) + 1;
  });

  const biggestTradingDay = Object.entries(tradesByDate)
    .sort(([, a], [, b]) => b - a)[0] || ['Unknown', 0];

  console.log(`Processed ${totalTrades} trades from ${transactions.length} transactions`);
  console.log(`Total volume: ${totalVolume.toFixed(4)} SOL`);

  return {
    totalTrades,
    totalVolume,
    totalPnL,
    biggestLosses: [],
    biggestWins: [],
    paperhands: [],
    biggestTradingDay: {
      date: biggestTradingDay[0],
      trades: biggestTradingDay[1]
    },
    highestPnLDay: {
      date: new Date().toLocaleDateString(),
      pnl: 0
    }
  };
}

/**
 * Process transactions and calculate trading statistics
 * For EVM chains, all values are in USD
 */
function processTransactions(
  transactions: any[],
  _network: 'solana' | 'evm',
  _chainId?: string
): Partial<TradingData> {
  // For EVM chains, use Covalent format
  const totalTrades = transactions.length;
  
  // For EVM chains, use value_quote (USD) for volume
  const totalVolume = transactions.reduce((sum, tx) => {
    return sum + (parseFloat(tx.value_quote?.toString() || '0') || 0);
  }, 0);

  // Calculate PNL (simplified - you'll need to track buy/sell prices)
  const totalPnL = transactions.reduce((sum, tx) => {
    // This is a placeholder - real PNL calculation needs trade tracking
    return sum + (parseFloat(tx.value_quote?.toString() || '0') || 0) * 0.1; // Placeholder
  }, 0);

  // Group by date for biggest trading day
  const tradesByDate: Record<string, number> = {};
  transactions.forEach((tx) => {
    const date = new Date(tx.block_signed_at || Date.now()).toLocaleDateString();
    tradesByDate[date] = (tradesByDate[date] || 0) + 1;
  });

  const biggestTradingDay = Object.entries(tradesByDate)
    .sort(([, a], [, b]) => b - a)[0] || ['Unknown', 0];

  return {
    totalTrades,
    totalVolume,
    totalPnL,
    biggestLosses: [],
    biggestWins: [],
    paperhands: [],
    biggestTradingDay: {
      date: biggestTradingDay[0],
      trades: biggestTradingDay[1]
    },
    highestPnLDay: {
      date: new Date().toLocaleDateString(),
      pnl: 0
    }
  };
}


/**
 * Aggregate data from multiple EVM chains
 */
function aggregateEVMData(
  chainData: Array<{ chainId: string; data: Partial<TradingData>; transactions: any[] }>
): Partial<TradingData> {
  let totalTrades = 0;
  let totalVolume = 0;
  let totalPnL = 0;
  const allChains: string[] = [];

  chainData.forEach(({ chainId, data, transactions: _transactions }) => {
    totalTrades += data.totalTrades || 0;
    totalVolume += data.totalVolume || 0;
    totalPnL += data.totalPnL || 0;
    allChains.push(chainId);
  });

  return {
    totalTrades,
    totalVolume, // Already in USD
    totalPnL, // Already in USD
    chains: allChains,
    biggestLosses: [],
    biggestWins: [],
    paperhands: [],
    biggestTradingDay: {
      date: new Date().toLocaleDateString(),
      trades: 0
    },
    highestPnLDay: {
      date: new Date().toLocaleDateString(),
      pnl: 0
    }
  };
}

/**
 * Compare our PNL calculation with Cielo's calculation for debugging
 */
async function compareWithCielo(walletAddress: string): Promise<void> {
  if (!CIELO_API_KEY) {
    console.warn('⚠️  Cannot compare with Cielo - API key not configured');
    return;
  }

  try {
    console.log('\n🔍 === COMPARING WITH CIELO ===');
    console.log(`Wallet: ${walletAddress}`);
    
    // Fetch from Cielo
    const cieloTransactions = await fetchCieloTransactions(walletAddress, 'solana');
    console.log(`Cielo returned ${cieloTransactions.length} transactions`);
    
    if (cieloTransactions.length === 0) {
      console.warn('⚠️  Cielo returned no transactions - cannot compare');
      return;
    }
    
    // Process with Cielo's method
    const cieloData = await processCieloTransactions(cieloTransactions, walletAddress);
    console.log(`\n📊 CIELO RESULTS:`);
    console.log(`  Total PNL: $${cieloData.totalPnL?.toFixed(2) || 0}`);
    console.log(`  Total Volume: ${cieloData.totalVolume?.toFixed(4) || 0} SOL`);
    console.log(`  Total Trades: ${cieloData.totalTrades || 0}`);
    console.log(`  Wins: ${cieloData.biggestWins?.length || 0}, Losses: ${cieloData.biggestLosses?.length || 0}`);
    
    // Fetch from Helius and process with our method
    if (!HELIUS_API_KEY) {
      console.warn('⚠️  Cannot fetch from Helius - API key not configured');
      return;
    }
    
    console.log(`\n📊 FETCHING FROM HELIUS FOR COMPARISON...`);
    const heliusTransactions = await fetchHeliusTransactions(walletAddress);
    console.log(`Helius returned ${heliusTransactions.length} transactions`);
    
    if (heliusTransactions.length === 0) {
      console.warn('⚠️  Helius returned no transactions - cannot compare');
      return;
    }
    
    // Process with our method
    const ourData = await processHeliusTransactionsWithPrices(heliusTransactions, walletAddress);
    console.log(`\n📊 OUR RESULTS:`);
    console.log(`  Total PNL: $${ourData.totalPnL?.toFixed(2) || 0}`);
    console.log(`  Total Volume: ${ourData.totalVolume?.toFixed(4) || 0} SOL`);
    console.log(`  Total Trades: ${ourData.totalTrades || 0}`);
    console.log(`  Wins: ${ourData.biggestWins?.length || 0}, Losses: ${ourData.biggestLosses?.length || 0}`);
    
    // Compare
    console.log(`\n🔍 === COMPARISON ===`);
    const pnlDiff = (ourData.totalPnL || 0) - (cieloData.totalPnL || 0);
    const pnlDiffPercent = cieloData.totalPnL ? (pnlDiff / Math.abs(cieloData.totalPnL)) * 100 : 0;
    console.log(`  PNL Difference: $${pnlDiff.toFixed(2)} (${pnlDiffPercent > 0 ? '+' : ''}${pnlDiffPercent.toFixed(2)}%)`);
    console.log(`  Volume Difference: ${((ourData.totalVolume || 0) - (cieloData.totalVolume || 0)).toFixed(4)} SOL`);
    console.log(`  Trades Difference: ${(ourData.totalTrades || 0) - (cieloData.totalTrades || 0)}`);
    
    // Compare top wins/losses
    console.log(`\n📈 TOP WINS COMPARISON:`);
    console.log(`  Cielo Top 5:`, cieloData.biggestWins?.slice(0, 5).map(w => `${w.coin}: $${w.profit.toFixed(2)}`).join(', ') || 'None');
    console.log(`  Our Top 5:`, ourData.biggestWins?.slice(0, 5).map(w => `${w.coin}: $${w.profit.toFixed(2)}`).join(', ') || 'None');
    
    console.log(`\n📉 TOP LOSSES COMPARISON:`);
    console.log(`  Cielo Top 5:`, cieloData.biggestLosses?.slice(0, 5).map(l => `${l.coin}: $${l.loss.toFixed(2)}`).join(', ') || 'None');
    console.log(`  Our Top 5:`, ourData.biggestLosses?.slice(0, 5).map(l => `${l.coin}: $${l.loss.toFixed(2)}`).join(', ') || 'None');
    
    console.log(`\n=== END COMPARISON ===\n`);
    
  } catch (error) {
    console.error('❌ Error comparing with Cielo:', error);
  }
}

/**
 * Fetch trading data for a wallet
 * For EVM: Fetches from Ethereum, BNB, and Base chains and aggregates
 */
export async function fetchTradingData(
  walletAddress: string,
  network: 'solana' | 'evm'
): Promise<TradingData> {
  try {
    if (network === 'solana') {
      // Solana: Use Helius for ALL transactions + Helius getAsset for token symbols
      // This gives us: All transactions (via pagination) + Token symbols (via getAsset)
      let transactions: any[] = [];
      let useCielo = false;
      
      // Use Helius first to get ALL transactions (supports pagination)
      if (HELIUS_API_KEY) {
        try {
          console.log('✅ Using Helius to fetch ALL transactions (with pagination)...');
          transactions = await fetchHeliusTransactions(walletAddress);
          console.log(`✅ Fetched ${transactions.length} transactions from Helius`);
          console.log('✅ Will fetch token symbols using Helius getAsset method');
        } catch (error) {
          console.warn('❌ Helius API failed, trying Cielo:', error);
        }
      }
      
      // Fallback to Cielo if Helius failed (limited to 100 transactions)
      if (transactions.length === 0 && CIELO_API_KEY) {
        try {
          console.log('⚠️  Falling back to Cielo (limited to 100 transactions)...');
          transactions = await fetchCieloTransactions(walletAddress, 'solana');
          console.log(`Fetched ${transactions.length} transactions from Cielo`);
          if (transactions.length > 0) {
            useCielo = true;
            if (transactions.length === 100) {
              console.warn('⚠️  WARNING: Cielo returned exactly 100 transactions. You may be missing older transactions!');
            }
          }
        } catch (error) {
          console.warn('Cielo API failed, trying Covalent:', error);
        }
      }
      
      // Fallback to Covalent for Solana if both failed
      if (transactions.length === 0 && COVALENT_API_KEY) {
        try {
          console.log('Trying Covalent for Solana...');
          transactions = await fetchCovalentTransactions(walletAddress, SOLANA_CHAIN_ID);
          console.log(`Fetched ${transactions.length} transactions from Covalent`);
        } catch (error) {
          console.warn('Covalent API failed for Solana:', error);
        }
      }

      // Check if we have any transactions
      if (transactions.length === 0) {
        const hasAnyKey = HELIUS_API_KEY || CIELO_API_KEY || COVALENT_API_KEY;
        const errorMsg = !hasAnyKey
          ? 'No API keys configured. Please add at least one API key (Helius, Cielo, or Covalent) in Netlify environment variables.'
          : 'No transactions found for this wallet address. This could mean:\n- The wallet has no trading activity\n- API keys are invalid or expired\n- API rate limits were exceeded';
        console.error('No transactions found:', errorMsg);
        console.error('API Key Status:', {
          hasHelius: !!HELIUS_API_KEY,
          hasCielo: !!CIELO_API_KEY,
          hasCovalent: !!COVALENT_API_KEY,
          isProduction: import.meta.env.PROD
        });
        throw new Error(errorMsg);
      }

      // Process Solana transactions (use appropriate parser)
      let processedData: Partial<TradingData>;
      if (useCielo) {
        // Cielo may have enhanced data with PNL, or raw data
        processedData = await processCieloTransactions(transactions, walletAddress);
      } else {
        // Use async version with DexScreener/CoinGecko for accurate PNL calculation
        processedData = await processHeliusTransactionsWithPrices(transactions, walletAddress);
        
        // If this is a specific wallet for debugging, compare with Cielo
        if (walletAddress === '6AY3Uf7DpDVYc4pYp3zvSCbynniHTBefbh8Q4CabCAm3' && CIELO_API_KEY) {
          await compareWithCielo(walletAddress);
        }
      }

      // Validate that we got some data
      if (!processedData || (processedData.totalTrades === 0 && processedData.totalVolume === 0)) {
        console.warn('Processed data is empty or all zeros:', processedData);
        // Don't throw here - might be a wallet with no trades
      }

      return {
        walletAddress,
        currency: 'SOL',
        ...processedData,
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
    } else {
      // EVM: Fetch from multiple chains (Ethereum, BNB, Base) and aggregate
      if (!COVALENT_API_KEY) {
        throw new Error('Covalent API key required for EVM chains');
      }

      console.log('Fetching EVM data from multiple chains (ETH, BNB, Base)...');
      
      const chainPromises = Object.entries(EVM_CHAIN_IDS).map(async ([chainName, chainId]) => {
        try {
          console.log(`Fetching ${chainName} (${chainId}) transactions...`);
          const transactions = await fetchCovalentTransactions(walletAddress, chainId);
          console.log(`Fetched ${transactions.length} transactions from ${chainName}`);
          
          const processedData = processTransactions(transactions, 'evm', chainId);
          
          return {
            chainId,
            chainName,
            data: processedData,
            transactions
          };
        } catch (error) {
          console.warn(`Failed to fetch ${chainName} data:`, error);
          return {
            chainId,
            chainName,
            data: { totalTrades: 0, totalVolume: 0, totalPnL: 0 },
            transactions: []
          };
        }
      });

      const chainResults = await Promise.all(chainPromises);
      
      // Aggregate data from all chains
      aggregateEVMData(chainResults);
      
      // Calculate totals
      const totalTrades = chainResults.reduce((sum, r) => sum + (r.data?.totalTrades || 0), 0);
      const totalVolume = chainResults.reduce((sum, r) => sum + (r.data?.totalVolume || 0), 0);
      const totalPnL = chainResults.reduce((sum, r) => sum + (r.data?.totalPnL || 0), 0);
      const chains = chainResults
        .filter(r => (r.data.totalTrades || 0) > 0)
        .map(r => r.chainId);

      console.log(`Aggregated EVM data: ${totalTrades} trades, $${totalVolume.toFixed(2)} volume, $${totalPnL.toFixed(2)} PNL across ${chains.length} chains`);

      return {
        walletAddress,
        currency: 'USD',
        totalTrades,
        totalVolume, // Already in USD
        totalPnL, // Already in USD
        chains,
        biggestLosses: [],
        biggestWins: [],
        paperhands: [],
        biggestTradingDay: {
          date: new Date().toLocaleDateString(),
          trades: 0
        },
        highestPnLDay: {
          date: new Date().toLocaleDateString(),
          pnl: 0
        }
      } as TradingData;
    }
  } catch (error) {
    console.error('Error fetching trading data:', error);
    // Log API key status for debugging
    console.error('API Key Status:', {
      hasHelius: !!HELIUS_API_KEY,
      hasCielo: !!CIELO_API_KEY,
      hasCovalent: !!COVALENT_API_KEY,
      isProduction: import.meta.env.PROD
    });
    throw error;
  }
}


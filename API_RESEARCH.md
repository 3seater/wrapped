# API Research for Trenches Wrapped

## Requirements
- Track wallet transactions on Solana and Ethereum
- Calculate PNL from trading activities
- Identify DEX trades (buys/sells)
- Get historical token prices
- Calculate gas fees spent
- Track paperhands (sold early vs ATH)

## Recommended API Solutions

### Primary Solution: Helius + Covalent + CoinGecko

#### 1. Helius (Solana)
**Best for Solana wallet tracking**
- **API**: Enhanced RPC with transaction parsing
- **Features**:
  - Parsed transaction data (DEX trades, NFT trades)
  - Real-time webhooks
  - Enhanced APIs for token balances, transactions
  - Can identify trade types (buy/sell) and amounts
- **Pricing**: Free tier (10k requests/month), Paid plans from $49/month
- **Docs**: https://docs.helius.dev/
- **Why**: Excellent for parsing Solana DEX transactions automatically

#### 2. Covalent (Cross-chain)
**Best for unified cross-chain data**
- **API**: Unified API for 30+ blockchains
- **Features**:
  - Transaction history with decoded data
  - Token balances and transfers
  - Gas fees tracking
  - DEX trade identification
  - Historical data
- **Pricing**: Free tier (100k requests/month), Paid from $99/month
- **Docs**: https://www.covalenthq.com/docs/
- **Why**: User mentioned this, works for both SOL and ETH

#### 3. Moralis (Alternative)
**Good alternative for both chains**
- **API**: Web3 data platform
- **Features**:
  - Wallet transaction history
  - Token balances and transfers
  - NFT data
  - DeFi positions
- **Pricing**: Free tier (25k requests/month), Paid from $49/month
- **Docs**: https://docs.moralis.io/

#### 4. CoinGecko (Price Data)
**For token prices and ATH data**
- **API**: Cryptocurrency data
- **Features**:
  - Historical prices
  - ATH prices
  - Market data
- **Pricing**: Free tier (50 calls/minute), Paid plans available
- **Docs**: https://www.coingecko.com/en/api

### Implementation Strategy

#### For Solana Wallets:
1. **Primary**: Helius Enhanced API
   - Use `getTransactions` with parsing enabled
   - Identify DEX programs (Raydium, Jupiter, Orca)
   - Parse instruction data for trade amounts

2. **Fallback**: Covalent Solana endpoints

#### For Ethereum Wallets:
1. **Primary**: Covalent Ethereum endpoints
   - Get transaction history with decoded logs
   - Identify ERC20 transfers and DEX trades
   - Calculate gas fees

2. **Alternative**: Alchemy Enhanced APIs

#### Price Data & ATH Tracking:
- CoinGecko API for all token prices
- Cache historical prices for performance
- Track ATH prices for paperhands calculation

#### PNL Calculation:
1. Identify all trades (buy/sell transactions)
2. Get token prices at trade time
3. Calculate realized PNL
4. Track gas fees separately
5. Calculate paperhands by comparing sell price vs ATH

### Data Flow:
1. User inputs wallet address
2. Fetch transaction history (Helius/Covalent)
3. Parse trades and calculate PNL
4. Fetch price data (CoinGecko)
5. Generate statistics
6. Display in slideshow format

### Estimated API Costs:
- Helius: $49/month (sufficient for moderate traffic)
- Covalent: $99/month (unified solution)
- CoinGecko: Free tier sufficient
- Total: ~$150/month for production

### Next Steps:
1. Sign up for API keys
2. Create data fetching functions
3. Implement PNL calculation logic
4. Add error handling and caching

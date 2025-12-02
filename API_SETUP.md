# API Setup Guide

## Quick Start

1. **Create a `.env` file** in the root directory:
```bash
# Copy the example file
cp .env.example .env
```

2. **Get API Keys** (at least one is required):

### Option 1: Covalent (Recommended - Works for both Solana & Ethereum)
- Sign up at: https://www.covalenthq.com/platform/auth/register/
- Get your API key from the dashboard
- Add to `.env`: `VITE_COVALENT_API_KEY=your_key_here`

### Option 2: Helius (Solana only, better Solana support)
- Sign up at: https://www.helius.dev/
- Get your API key from the dashboard
- Add to `.env`: `VITE_HELIUS_API_KEY=your_key_here`

### Option 3: Cielo Finance (Recommended for Solana - Better PNL data)
- Sign up at: https://cielo.finance/
- Get your API key from the dashboard
- Add to `.env`: `VITE_CIELO_API_KEY=your_key_here`

### Option 4: CoinGecko (Optional, for better rate limits)
- Sign up at: https://www.coingecko.com/en/api
- Add to `.env`: `VITE_COINGECKO_API_KEY=your_key_here`

3. **Restart your dev server** after adding API keys:
```bash
npm run dev
```

## Testing Without API Keys

If you don't have API keys yet, the app will automatically fall back to mock/demo data. You'll see a warning message but the app will still work.

## Testing With Real Data

1. Enter a real wallet address (Solana or Ethereum)
2. Select the network
3. Click "Get My Wrapped"
4. The app will fetch real transaction data from the APIs

## Free Tier Limits

- **Covalent**: 100k requests/month (free tier)
- **Helius**: 10k requests/month (free tier)
- **Cielo**: Check their pricing at https://cielo.finance/
- **CoinGecko**: 50 calls/minute (free tier)

## Troubleshooting

- **"API key not configured"**: Make sure your `.env` file exists and has the correct variable names (must start with `VITE_`)
- **CORS errors**: Some APIs may require backend proxy - we'll add that if needed
- **Rate limit errors**: You've hit the free tier limit, wait or upgrade your plan


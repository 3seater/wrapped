# API Setup Guide

## Quick Start

1. **Get Cielo Finance API Key** (Required):
   - Sign up at: https://cielo.finance/
   - Get your API key from the dashboard
   - Add to your environment variables (Netlify or `.env` file):
     ```
     VITE_CIELO_API_KEY=your_key_here
     ```

2. **For Local Development**:
   - Create a `.env` file in the root directory
   - Add: `VITE_CIELO_API_KEY=your_key_here`
   - Restart your dev server: `npm run dev`

3. **For Production (Netlify)**:
   - Go to Netlify Dashboard → Site Settings → Environment Variables
   - Add: `VITE_CIELO_API_KEY` with your API key value
   - Redeploy your site

## How It Works

This app now uses **Cielo Finance's PNL API** directly (same approach as trenches-wrapped):
- ✅ **No complex PNL calculations** - Cielo does all the heavy lifting
- ✅ **Accurate profit/loss tracking** - Uses Cielo's proven calculation methods
- ✅ **Fast and reliable** - Direct API calls, no transaction processing needed
- ✅ **Simple setup** - Only one API key required

## Supported Networks

- ✅ **Solana** - Fully supported via Cielo API
- ⚠️ **EVM Chains** - Not yet supported (coming soon)

## Testing

1. Enter a Solana wallet address
2. Select "Solana" network
3. Click "Get My Wrapped"
4. The app will fetch PNL data directly from Cielo

## API Limits

- **Cielo**: Check their pricing at https://cielo.finance/
- The app makes minimal API calls (2-3 per wallet lookup)

## Troubleshooting

- **"Cielo API key not configured"**: 
  - Make sure your `.env` file exists (for local dev) or Netlify environment variable is set (for production)
  - Variable name must be exactly: `VITE_CIELO_API_KEY`
  
- **"No trading activity found"**: 
  - The wallet may not have any trades
  - The wallet address might be incorrect
  - Cielo may still be processing the wallet data (try again in a few minutes)

- **Rate limit errors**: 
  - You've hit Cielo's rate limit
  - Wait a few minutes and try again
  - Consider upgrading your Cielo plan if needed

## Migration Notes

This version has been completely rewritten to use Cielo's PNL API directly, removing:
- ❌ Complex transaction fetching from Helius/Covalent
- ❌ Manual PNL calculation logic
- ❌ Price fetching from multiple sources
- ❌ FIFO cost basis tracking

All of this is now handled by Cielo's API, making the codebase much simpler and more reliable.

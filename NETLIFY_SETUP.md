# Netlify Environment Variables Setup

## Quick Setup Steps:

1. **Get at least ONE API key** (Helius is recommended for Solana):
   - **Helius** (Best for Solana): https://www.helius.dev/ → Sign up → Get API key
   - **Cielo** (Alternative for Solana): https://cielo.finance/ → Sign up → Get API key
   - **Covalent** (For EVM chains): https://www.covalenthq.com/platform/auth/register/ → Get API key

2. **Create a `.env` file** in your project root with your keys:
   ```
   VITE_HELIUS_API_KEY=your_actual_key_here
   VITE_CIELO_API_KEY=your_actual_key_here
   VITE_COVALENT_API_KEY=your_actual_key_here
   VITE_COINGECKO_API_KEY=your_actual_key_here
   ```

3. **Import into Netlify**:
   - Go to your Netlify site dashboard
   - Navigate to: **Site settings** → **Environment variables**
   - Click **"Import from .env file"**
   - Upload your `.env` file
   - Click **"Import"**

4. **Redeploy**:
   - Go to **Deploys** tab
   - Click **"Trigger deploy"** → **"Deploy site"**
   - Wait for build to complete

## Minimum Required:

For **Solana wallets**: You need at least `VITE_HELIUS_API_KEY` OR `VITE_CIELO_API_KEY`

For **EVM wallets** (Ethereum, BNB, Base): You need `VITE_COVALENT_API_KEY`

## Notes:

- The `.env` file is gitignored, so it won't be committed to GitHub
- Environment variables are only available after redeploying
- You can add/update keys anytime and trigger a new deploy



# Netlify Environment Variables Setup

## Quick Setup Steps:

1. **Get your Cielo API key**:
   - Go to: https://cielo.finance/
   - Sign up and get your API key from the dashboard

2. **Add to Netlify**:
   - Go to your Netlify site dashboard
   - Navigate to: **Site settings** → **Environment variables**
   - Click **"Add a variable"**
   - **Key**: `VITE_CIELO_API_KEY`
   - **Value**: `2efee406-a898-406a-8d22-ea310e4fc63c` (or your own key)
   - Click **"Save"**

3. **Redeploy**:
   - Go to **Deploys** tab
   - Click **"Trigger deploy"** → **"Deploy site"**
   - Wait for build to complete

## For Local Development:

Create a `.env` file in your project root:
```
VITE_CIELO_API_KEY=2efee406-a898-406a-8d22-ea310e4fc63c
```

Then restart your dev server:
```bash
npm run dev
```

## Notes:

- The `.env` file is gitignored, so it won't be committed to GitHub
- Environment variables are only available after redeploying
- You can add/update keys anytime and trigger a new deploy
- **Never commit your API keys to GitHub!**

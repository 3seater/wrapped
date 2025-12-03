# Netlify Environment Variables Setup

## Quick Setup Steps:

1. **Get your Cielo API key**:
   - Go to: https://cielo.finance/
   - Sign up and get your API key from the dashboard
   - Make sure you have a paid plan (Builder plan or higher) that includes PNL endpoints
   - Your API key: `56f4fad1-eefb-4f92-b505-f1681afa8abc`

2. **Add to Netlify** (CRITICAL FOR PRODUCTION):
   - Go to your Netlify site dashboard: https://app.netlify.com
   - Select your site
   - Navigate to: **Site settings** → **Environment variables** (in the left sidebar)
   - Click **"Add a variable"** button
   - **Key**: `CIELO_API_KEY` (recommended) or `VITE_CIELO_API_KEY`
   - **Value**: `56f4fad1-eefb-4f92-b505-f1681afa8abc`
   - **Scopes**: Make sure it's available for "Production", "Deploy previews", and "Branch deploys"
   - Click **"Save"**
   - **IMPORTANT**: You can set both `CIELO_API_KEY` and `VITE_CIELO_API_KEY` to the same value for compatibility

3. **Redeploy** (REQUIRED after adding env var):
   - Go to **Deploys** tab
   - Click **"Trigger deploy"** → **"Deploy site"**
   - OR click the **"Clear cache and deploy site"** button (this is recommended)
   - Wait for build to complete (usually 1-3 minutes)

## Why This Is Needed:

- **Local development**: Uses Vite proxy (works automatically)
- **Production (Netlify)**: Uses Netlify functions which need the environment variable
- The function runs server-side and needs the API key to authenticate with Cielo
- **Serverless functions** use `CIELO_API_KEY` (without VITE_ prefix)
- **Client-side code** uses `VITE_CIELO_API_KEY` (with VITE_ prefix for Vite builds)

## For Local Development:

Create a `.env` file in your project root:
```
VITE_CIELO_API_KEY=2efee406-a898-406a-8d22-ea310e4fc63c
```

Then restart your dev server:
```bash
npm run dev
```

## Troubleshooting 403 Errors:

If you're getting a 403 Forbidden error:

1. **Check that the environment variable is set correctly**:
   - Go to Netlify Dashboard → Site Settings → Environment Variables
   - Verify `CIELO_API_KEY` (or `VITE_CIELO_API_KEY`) exists and has the correct value
   - The value should be: `56f4fad1-eefb-4f92-b505-f1681afa8abc`

2. **Verify the API key is valid**:
   - Check your Cielo Finance dashboard at https://cielo.finance/
   - Make sure your subscription plan includes PNL endpoint access
   - Verify the API key hasn't been regenerated or revoked

3. **Redeploy after adding/updating the variable**:
   - Netlify functions only pick up new environment variables after a redeploy
   - Use "Clear cache and deploy site" to ensure a clean deployment

4. **Check function logs**:
   - Go to Netlify Dashboard → Functions → cielo-pnl
   - View the logs to see detailed error messages
   - Look for "API key not found" or "403 error" messages

## Notes:

- The `.env` file is gitignored, so it won't be committed to GitHub
- Environment variables are only available after redeploying
- You can add/update keys anytime and trigger a new deploy
- **Never commit your API keys to GitHub!**
- For Netlify functions, use `CIELO_API_KEY` (without VITE_ prefix) for clarity

# 🚀 Quick Netlify Setup - Fix 403 Error

## Your Cielo API Key
```
56f4fad1-eefb-4f92-b505-f1681afa8abc
```

## Step-by-Step Instructions

### 1. Go to Netlify Dashboard
- Visit: https://app.netlify.com
- Sign in to your account
- Find and click on your site (solanawrapped.wtf)

### 2. Navigate to Environment Variables
- In the left sidebar, click **"Site settings"**
- Scroll down and click **"Environment variables"** (under "Build & deploy")

### 3. Add the API Key
- Click the **"Add a variable"** button (top right)
- **Key**: `CIELO_API_KEY`
- **Value**: `56f4fad1-eefb-4f92-b505-f1681afa8abc`
- **Scopes**: Check all three boxes:
  - ✅ Production
  - ✅ Deploy previews
  - ✅ Branch deploys
- Click **"Save"**

### 4. (Optional) Add VITE_ version too
- Click **"Add a variable"** again
- **Key**: `VITE_CIELO_API_KEY`
- **Value**: `56f4fad1-eefb-4f92-b505-f1681afa8abc`
- **Scopes**: Check all three boxes
- Click **"Save"**

### 5. Redeploy Your Site (CRITICAL!)
- Go to the **"Deploys"** tab (top navigation)
- Click the **"..."** menu (three dots) next to the latest deploy
- Click **"Clear cache and deploy site"**
- Wait for the deployment to complete (usually 1-3 minutes)

## ✅ Verify It's Working

1. Wait for the deploy to finish
2. Visit your site: https://solanawrapped.wtf
3. Try entering a wallet address
4. Check the browser console (F12) - the 403 error should be gone

## 🔍 Check Function Logs

If you still get errors:

1. Go to Netlify Dashboard → **Functions** tab
2. Click on **cielo-pnl**
3. View the logs to see what's happening
4. Look for messages about the API key

## ⚠️ Common Issues

### Issue: Still getting 403 after redeploy
**Solution**: 
- Double-check the API key value is correct (no extra spaces)
- Verify your Cielo subscription includes PNL endpoints
- Check Cielo dashboard: https://cielo.finance/

### Issue: "API key not configured" error
**Solution**:
- Make sure you redeployed AFTER adding the environment variable
- Check that the variable name is exactly `CIELO_API_KEY` (case-sensitive)
- Verify the variable is set for "Production" scope

### Issue: API key exists but still not working
**Solution**:
- Try "Clear cache and deploy site" again
- Check Netlify function logs for detailed error messages
- Verify the API key is valid at https://cielo.finance/

## 📝 Need Help?

- Check the full documentation: `NETLIFY_SETUP.md`
- Check function logs in Netlify Dashboard
- Verify API key at: https://cielo.finance/


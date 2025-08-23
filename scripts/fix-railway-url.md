# How to Fix Railway URL Configuration

## Quick Fix Steps

### 1. Find Your Railway Public URL

1. Go to [railway.app](https://railway.app) and login
2. Navigate to your project
3. Click on your service (jadwal-backend)
4. Look for the **"Domains"** section
5. Copy the generated domain (it looks like: `something-production-xxxx.up.railway.app`)

### 2. Update BASE_URL Environment Variable

1. In Railway dashboard, go to **"Variables"** tab
2. Find `BASE_URL` variable
3. Update it to: `https://your-copied-domain.up.railway.app`
4. **Remove** the `http://localhost:5000` value
5. Click **"Save"**

### 3. Redeploy

1. Go to **"Deployments"** tab
2. Click **"Deploy"** or push a new commit to trigger redeploy
3. Wait for deployment to complete

### 4. Test

1. Visit: `https://your-domain.up.railway.app/health`
2. Should return: `{"status":"OK","timestamp":"..."}`
3. Check logs for successful cron job execution

## Example Configuration

If your Railway domain is: `jadwal-backend-production-a1b2.up.railway.app`

Then set:
```
BASE_URL=https://jadwal-backend-production-a1b2.up.railway.app
```

## Troubleshooting

### If you can't find the domain:
1. Make sure your service is deployed
2. Check if there are any deployment errors
3. Look in the "Settings" > "Domains" section

### If the domain doesn't work:
1. Wait a few minutes after deployment
2. Try accessing `/health` endpoint first
3. Check Railway logs for any startup errors

### If cron jobs still fail:
1. Verify `CRON_AUTH_USERNAME` and `CRON_AUTH_PASSWORD` are correct
2. Test manual login with those credentials
3. Check if the user exists in your database

## Current Issue Analysis

Based on your error logs, the problem is:
- `BASE_URL=http://localhost:5000` (❌ Wrong for production)
- Should be: `BASE_URL=https://your-railway-domain.up.railway.app` (✅ Correct)

The cron service tries to authenticate by calling the login endpoint, but `localhost:5000` doesn't exist in Railway's production environment.
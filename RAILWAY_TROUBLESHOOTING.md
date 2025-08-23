# Railway Deployment Troubleshooting Guide

## Problem: Invalid URL Error in Cron Jobs

### Error Description
```
Authentication failed for cronjob: Invalid URL
TypeError [ERR_INVALID_URL]: Invalid URL
```

### Root Cause
The cron service cannot determine the correct public URL for your Railway deployment, causing authentication requests to fail.

## Solution Steps

### Step 1: Find Your Railway Public URL

1. **Go to your Railway Dashboard**
   - Visit [railway.app](https://railway.app)
   - Navigate to your project
   - Click on your service

2. **Find the Public Domain**
   - Look for "Domains" section
   - Copy the generated domain (e.g., `your-service-name.up.railway.app`)
   - Or use your custom domain if configured

### Step 2: Update Environment Variables

In your Railway dashboard, update these environment variables:

```bash
# Replace with your actual Railway domain
BASE_URL=https://your-actual-domain.up.railway.app

# Remove localhost references
# BASE_URL=http://localhost:5000  # ❌ Remove this
```

### Step 3: Verify Other Environment Variables

Ensure these are correctly set:

```bash
NODE_ENV=production
PORT=5000
CRON_AUTH_USERNAME=2405047
CRON_AUTH_PASSWORD=@qwerty12345
ATTENDANCE_CRON_ENABLED=true
```

### Step 4: Test the Configuration

1. **Deploy your changes**
2. **Check the logs** for successful URL detection
3. **Test manually** by visiting: `https://your-domain.up.railway.app/health`
4. **Trigger cron manually**: `POST https://your-domain.up.railway.app/api/v1/cron/trigger/attendance-fetch`

## Debugging Commands

### Check Current Environment (Local)
```bash
node scripts/get-railway-url.js
```

### Check Railway Environment Variables
In Railway dashboard, go to Variables tab and verify:
- `BASE_URL` is set to your public domain
- No `localhost` references in production
- All required variables are present

## Common Issues and Solutions

### Issue 1: BASE_URL still contains localhost
**Solution**: Update `BASE_URL` to your Railway public domain

### Issue 2: Railway domain not accessible
**Solution**: 
- Check if your service is deployed and running
- Verify the domain in Railway dashboard
- Test the health endpoint: `https://your-domain.up.railway.app/health`

### Issue 3: Authentication fails even with correct URL
**Solution**:
- Verify `CRON_AUTH_USERNAME` and `CRON_AUTH_PASSWORD`
- Check if the user exists in your database
- Test login manually with the same credentials

### Issue 4: Cron jobs not running
**Solution**:
- Ensure `ATTENDANCE_CRON_ENABLED=true`
- Check cron schedule format
- Verify timezone settings

## Environment Variable Template for Railway

```bash
# Server Configuration
PORT=5000
NODE_ENV=production

# Database
MONGO_URI=your_mongodb_connection_string

# Authentication
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
JWT_ISSUER=jadwal-api

# External APIs
ATTENDANCE_API_URL=http://attendance-api.shabuhachi.id/service

# ImageKit
IMAGEKIT_PUBLIC_KEY=your_public_key
IMAGEKIT_PRIVATE_KEY=your_private_key
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your_endpoint

# CORS
CORS_ORIGINS=https://yourapp.com,https://www.yourapp.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000

# Logging
LOG_LEVEL=info
TZ=Asia/Jakarta

# Cron Configuration
ATTENDANCE_CRON_SCHEDULE=0 7,8,13,18 * * *
ATTENDANCE_CRON_SCHEDULE_NIGHT=25 22 * * *
ATTENDANCE_CRON_TIMEZONE=Asia/Jakarta
ATTENDANCE_CRON_ENABLED=true

# ⚠️ IMPORTANT: Replace with your actual Railway domain
BASE_URL=https://your-actual-domain.up.railway.app

# Cron Authentication
CRON_AUTH_USERNAME=2405047
CRON_AUTH_PASSWORD=@qwerty12345
```

## Testing Checklist

- [ ] Railway service is deployed and running
- [ ] Health endpoint responds: `GET /health`
- [ ] Authentication works: `POST /api/v1/auth/login`
- [ ] Manual cron trigger works: `POST /api/v1/cron/trigger/attendance-fetch`
- [ ] Scheduled cron jobs run without errors
- [ ] Logs show successful URL detection

## Getting Help

If you're still experiencing issues:

1. **Check Railway logs** for detailed error messages
2. **Verify your domain** is accessible from external networks
3. **Test API endpoints** manually using Postman or curl
4. **Review environment variables** for typos or missing values

## Additional Notes

- Railway automatically assigns domains to deployed services
- The domain format is usually: `service-name-project-name.up.railway.app`
- Custom domains can be configured in Railway dashboard
- Always use HTTPS for production URLs
- Avoid hardcoding localhost in production environment variables
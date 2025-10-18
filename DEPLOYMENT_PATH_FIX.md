# Deployment Path Fix Documentation

## Problem
The webhook deployment was failing on production VPS with the error:
```
bash: /shiftly/jadwal-backend/scripts/deploy.sh: No such file or directory
```

This occurred because the `webhookController.ts` was using a hardcoded path `/shiftly/jadwal-backend` instead of the correct path `$HOME/shiftly/jadwal-backend` (which resolves to `/home/anggi/shiftly/jadwal-backend` on the VPS).

## Root Cause Analysis
1. **Hardcoded Path**: The `projectPath` in `webhookController.ts` was set to `/shiftly/jadwal-backend`
2. **Missing Home Directory**: The path didn't include the user's home directory
3. **No Working Directory**: The script execution didn't set the correct working directory
4. **Missing Environment Configuration**: No environment variable for flexible path configuration

## Solution Implemented

### 1. Dynamic Path Resolution
Updated `webhookController.ts` to use environment variable with fallback:
```typescript
private projectPath = process.env.PROJECT_PATH || `${process.env.HOME || process.env.USERPROFILE}/shiftly/jadwal-backend`;
```

### 2. Working Directory Configuration
Added `cwd` option to script execution:
```typescript
const { stdout, stderr } = await execAsync(`bash ${deployScript}`, {
  timeout: 600000,
  cwd: this.projectPath, // Set working directory to project root
  env: { ...process.env, PATH: '/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin' }
});
```

### 3. Environment Variable Documentation
Added to `.env.example`:
```env
# Deployment Configuration
# Project path on VPS (for webhook deployment)
# Default: $HOME/shiftly/jadwal-backend
PROJECT_PATH=/home/username/shiftly/jadwal-backend

# GitHub Webhook Configuration
GITHUB_WEBHOOK_SECRET=your-github-webhook-secret
```

### 4. Enhanced Logging
Added project path logging for debugging:
```typescript
logger.info(`Project path: ${this.projectPath}`);
```

## Configuration for Production VPS

### Option 1: Using Environment Variable (Recommended)
Add to your production `.env` file:
```env
PROJECT_PATH=/home/anggi/shiftly/jadwal-backend
```

### Option 2: Using Default (Automatic)
If no `PROJECT_PATH` is set, it will automatically use:
- Linux/Mac: `$HOME/shiftly/jadwal-backend`
- Windows: `%USERPROFILE%/shiftly/jadwal-backend`

## Verification Steps

1. **Check Current Path**: The webhook will now log the resolved project path
2. **Test Deployment**: Trigger a webhook and check logs for path resolution
3. **Manual Verification**: Ensure the path matches your actual project location

## Expected Behavior

### Development (Windows)
- Uses simulation mode (no actual deployment)
- Path resolves to Windows user profile directory

### Production (Linux VPS)
- Uses actual deployment script
- Path resolves to `/home/anggi/shiftly/jadwal-backend` (or configured path)
- Script executes from the correct working directory

## Troubleshooting

If deployment still fails:

1. **Verify Path**: Check webhook logs for the resolved project path
2. **Check Permissions**: Ensure the script has execute permissions
3. **Verify Environment**: Confirm `NODE_ENV` is not set to 'development' on production
4. **Manual Test**: Run the deployment script manually from the project directory

## Files Modified
- `controllers/webhookController.ts` - Dynamic path resolution and working directory
- `.env.example` - Added PROJECT_PATH configuration documentation
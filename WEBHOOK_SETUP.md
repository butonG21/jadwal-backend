# GitHub Webhook Deployment Setup

This document explains how to set up the GitHub webhook for automatic deployment to your VPS.

## Webhook Endpoints

The following webhook endpoints are available:

### 1. GitHub Webhook
- **Endpoint**: `POST /webhook/github`
- **Purpose**: Handles GitHub push events for automatic deployment
- **GitHub Setup**: Configure this URL in your GitHub repository settings

### 2. Manual Deployment
- **Endpoint**: `POST /webhook/deploy`
- **Purpose**: Trigger manual deployment (for testing/admin use)
- **Authentication**: Should be protected in production

### 3. Deployment Status
- **Endpoint**: `GET /webhook/status`
- **Purpose**: Check current deployment status

## Setup Instructions

### 1. Environment Variables

Add these variables to your `.env` file:

```bash
# Optional: GitHub webhook secret for security (recommended)
GITHUB_WEBHOOK_SECRET=your_webhook_secret_here

# Optional: Custom project path (default: /shiftly/jadwal-backend)
PROJECT_PATH=/shiftly/jadwal-backend
```

### 2. GitHub Repository Configuration

1. Go to your GitHub repository settings
2. Navigate to "Webhooks" → "Add webhook"
3. Configure the webhook:
   - **Payload URL**: `https://your-domain.com/webhook/github`
   - **Content type**: `application/json`
   - **Secret**: (Optional but recommended) Add your webhook secret
   - **Events**: Select "Just the push event"
   - **Active**: Check this box

### 3. VPS Setup

1. **Make deployment script executable:**
   ```bash
   chmod +x /shiftly/jadwal-backend/scripts/deploy.sh
   ```

2. **Create log directory:**
   ```bash
   sudo mkdir -p /var/log
   sudo touch /var/log/jadwal-deployment.log
   sudo chown your-user:your-user /var/log/jadwal-deployment.log
   ```

3. **Ensure PM2 is installed and configured:**
   ```bash
   npm install -g pm2
   pm2 startup
   pm2 save
   ```

### 4. Testing

#### Manual Deployment Test
```bash
curl -X POST https://your-domain.com/webhook/deploy
```

#### Check Deployment Status
```bash
curl https://your-domain.com/webhook/status
```

#### GitHub Webhook Test
1. Push a commit to the `master` branch
2. Check GitHub webhook delivery status in repository settings
3. Check deployment logs: `tail -f /var/log/jadwal-deployment.log`

## Deployment Process

When a push event is received, the following steps are executed:

1. **Validation**: Verify webhook signature (if configured)
2. **Branch Check**: Only deploy pushes to `master` or `main` branch
3. **Concurrency Control**: Prevent multiple simultaneous deployments
4. **Execution**: Run the deployment script which:
   - Changes to project directory
   - Pulls latest changes from git
   - Installs npm dependencies
   - Builds the project
   - Restarts all PM2 processes
5. **Logging**: All output is logged for debugging

## Security Considerations

1. **Webhook Secret**: Always use a webhook secret in production
2. **Rate Limiting**: The webhook endpoint is subject to the global rate limiter
3. **Branch Protection**: Only `master`/`main` branch pushes trigger deployment
4. **Concurrent Deployment**: Prevents multiple deployments running simultaneously

## Troubleshooting

### Common Issues

1. **Permission Denied**: Ensure the deployment script is executable
2. **Git Pull Fails**: Check SSH keys and git credentials on the VPS
3. **PM2 Not Found**: Ensure PM2 is installed globally and in PATH
4. **Build Fails**: Check Node.js version compatibility
5. **Webhook Not Working**: Check GitHub webhook delivery logs

### Logs

- **Deployment logs**: `/var/log/jadwal-deployment.log`
- **Application logs**: Check PM2 logs with `pm2 logs`
- **GitHub webhook logs**: In repository settings → Webhooks → Recent deliveries

### Manual Recovery

If automatic deployment fails, you can manually deploy:

```bash
cd /shiftly/jadwal-backend
git pull origin master
npm install
npm run build
pm2 restart all
```

## API Response Format

All webhook endpoints return responses in this format:

```json
{
  "success": true,
  "message": "Deployment started successfully",
  "data": {}
}
```

For errors:

```json
{
  "success": false,
  "error": "Error message"
}
```
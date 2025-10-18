#!/bin/bash

# Deployment script for jadwal-backend
# This script handles the deployment process on VPS

set -e  # Exit on any error

PROJECT_PATH="$HOME/shiftly/jadwal-backend"
LOG_FILE="/var/log/jadwal-deployment.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Function to log messages
log() {
    echo "[$TIMESTAMP] $1" | tee -a "$LOG_FILE"
}

# Function to handle errors
error_exit() {
    log "ERROR: $1"
    exit 1
}

log "Starting deployment process..."

# Change to project directory
cd "$PROJECT_PATH" || error_exit "Failed to change to project directory"

# Git pull latest changes
log "Pulling latest changes from git..."
git pull origin master || error_exit "Git pull failed"

# Install dependencies
log "Installing npm dependencies..."
npm install || error_exit "npm install failed"

# Build the project
log "Building the project..."
npm run build || error_exit "Build failed"

# Restart PM2 processes
log "Restarting PM2 processes..."
pm2 restart all || error_exit "PM2 restart failed"

# Check PM2 status
log "Checking PM2 status..."
pm2 status || log "Warning: Could not get PM2 status"

log "Deployment completed successfully!"

# Optional: Send notification (uncomment and configure as needed)
# curl -X POST -H 'Content-type: application/json' \
#   --data '{"text":"Deployment completed successfully!"}' \
#   YOUR_WEBHOOK_URL
#!/bin/bash

echo "🚀 Restarting PM2 processes with memory optimization..."

# Stop current processes
echo "📋 Stopping current PM2 processes..."
pm2 stop all

# Delete current processes
echo "🗑️  Deleting current PM2 processes..."
pm2 delete all

# Start with new ecosystem config
echo "🔄 Starting processes with new memory settings..."
pm2 start ecosystem.config.js

# Save PM2 configuration
echo "💾 Saving PM2 configuration..."
pm2 save

# Show status
echo "📊 Current PM2 status:"
pm2 status

echo "✅ Restart complete! Your application now has:"
echo "   - 4GB heap size (--max-old-space-size=4096)"
echo "   - Enabled garbage collection (--expose-gc)"
echo "   - Memory optimization (--optimize-for-size)"
echo "   - Auto-restart on memory limit (3GB)"
echo ""
echo "🔍 Monitor memory usage with: pm2 monit"
echo "📝 View logs with: pm2 logs repotrack-backend"

#!/bin/bash

# Deployment script for Cloudflare Pages
# This script ensures production environment variables are used

echo "🚀 Starting deployment to Cloudflare Pages..."

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf out .next

# Build with production environment
# Unset localhost URLs to force runtime detection
echo "🔨 Building with production environment..."
NEXT_PUBLIC_API_URL=https://jecrc-dating-backend.onrender.com \
NEXT_PUBLIC_SOCKET_URL=https://jecrc-dating-backend.onrender.com \
NODE_ENV=production npm run build

# Deploy to Cloudflare Pages
echo "☁️  Deploying to Cloudflare Pages..."
npx wrangler pages deploy out --project-name=dayalcolonizers

echo "✅ Deployment complete!"

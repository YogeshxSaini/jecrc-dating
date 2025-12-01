#!/bin/bash

# Deployment script for Cloudflare Pages
# This script ensures production environment variables are used

echo "🚀 Starting deployment to Cloudflare Pages..."

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf out .next

# Build with production environment
echo "🔨 Building with production environment..."
NODE_ENV=production npm run build

# Deploy to Cloudflare Pages
echo "☁️  Deploying to Cloudflare Pages..."
npx wrangler pages deploy out --project-name=dayalcolonizers

echo "✅ Deployment complete!"

#!/bin/bash

# Script to help set up GitHub secrets for automated deployment
# This script provides instructions and commands to set secrets

echo "🔐 GitHub Secrets Setup Helper"
echo "================================"
echo ""

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed."
    echo "📦 Install it from: https://cli.github.com/"
    echo ""
    echo "After installing, run: gh auth login"
    echo ""
    exit 1
fi

# Check if user is authenticated
if ! gh auth status &> /dev/null; then
    echo "❌ You are not authenticated with GitHub CLI"
    echo "🔑 Run: gh auth login"
    echo ""
    exit 1
fi

echo "✅ GitHub CLI is installed and authenticated"
echo ""

# Get repository info
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
echo "📦 Repository: $REPO"
echo ""

# Function to set a secret
set_secret() {
    local secret_name=$1
    local secret_description=$2
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Setting: $secret_name"
    echo "Description: $secret_description"
    echo ""
    read -sp "Enter value (input hidden): " secret_value
    echo ""
    
    if [ -z "$secret_value" ]; then
        echo "⚠️  Skipped (empty value)"
        echo ""
        return
    fi
    
    echo "$secret_value" | gh secret set "$secret_name"
    
    if [ $? -eq 0 ]; then
        echo "✅ $secret_name set successfully"
    else
        echo "❌ Failed to set $secret_name"
    fi
    echo ""
}

echo "Let's set up your deployment secrets!"
echo ""

# Backend secrets
echo "🔧 BACKEND DEPLOYMENT (Render)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "To get your Render Deploy Hook URL:"
echo "1. Go to https://dashboard.render.com"
echo "2. Select your backend service"
echo "3. Go to Settings → Deploy Hook"
echo "4. Copy the deploy hook URL"
echo ""
read -p "Press Enter to continue..."
echo ""

set_secret "RENDER_DEPLOY_HOOK_URL" "Render deploy hook URL for backend"

# Frontend secrets
echo "🌐 FRONTEND DEPLOYMENT (Cloudflare Pages)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "To get your Cloudflare API Token:"
echo "1. Go to https://dash.cloudflare.com"
echo "2. Navigate to My Profile → API Tokens"
echo "3. Click 'Create Token'"
echo "4. Use 'Edit Cloudflare Workers' template"
echo "5. Copy the token"
echo ""
read -p "Press Enter to continue..."
echo ""

set_secret "CLOUDFLARE_API_TOKEN" "Cloudflare API token for Pages deployment"

echo "To get your Cloudflare Account ID:"
echo "1. Go to https://dash.cloudflare.com"
echo "2. Select Workers & Pages"
echo "3. Copy Account ID from the right sidebar"
echo ""
read -p "Press Enter to continue..."
echo ""

set_secret "CLOUDFLARE_ACCOUNT_ID" "Cloudflare account ID"

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 Setup Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Verify your secrets:"
echo "   gh secret list"
echo ""
echo "🧪 Test the automation:"
echo "   1. Make a change to backend/src/index.ts"
echo "   2. Commit and push to main branch"
echo "   3. Check GitHub Actions tab"
echo ""
echo "📚 For more info, see: .github/DEPLOYMENT_SETUP.md"
echo ""

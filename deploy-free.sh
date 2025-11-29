#!/bin/bash

# JECRC Dating App - Free Hosting Deployment Script

echo "🆓 Deploying JECRC Dating App to FREE hosting services..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

show_hosting_options() {
    echo "🆓 FREE HOSTING OPTIONS FOR YOUR BACKEND:"
    echo ""
    echo "1. 🚀 Render (Recommended)"
    echo "   - 750 hours/month free (24/7 for 1 month)"
    echo "   - Free PostgreSQL + Redis included"
    echo "   - Easy Docker deployment"
    echo "   - Sleeps after 15min inactivity"
    echo ""
    echo "2. 🪰 Fly.io"
    echo "   - 3 VMs with 256MB RAM free"
    echo "   - Always on (no sleeping)"
    echo "   - Docker support"
    echo "   - Need external database"
    echo ""
    echo "3. 🌐 Back4App"
    echo "   - 25,000 requests/month"
    echo "   - Database included"
    echo "   - No sleeping"
    echo ""
    echo "💾 FREE DATABASE OPTIONS:"
    echo ""
    echo "1. Neon - PostgreSQL (10GB free)"
    echo "2. Supabase - PostgreSQL (500MB free)"
    echo "3. CockroachDB - PostgreSQL compatible"
    echo "4. Upstash - Redis (10K commands/day free)"
    echo ""
}

deploy_to_render() {
    print_status "Setting up Render deployment..."
    print_warning "Manual steps required:"
    echo ""
    echo "1. Go to https://render.com and sign up with GitHub"
    echo "2. Click 'New +' → 'Blueprint'"
    echo "3. Connect your GitHub repository: YogeshxSaini/jecrc-dating"
    echo "4. Use render.yaml configuration (already created)"
    echo "5. Deploy - it will automatically create:"
    echo "   - Web service (backend)"
    echo "   - PostgreSQL database"
    echo "   - Redis instance"
    echo ""
    print_success "render.yaml configuration is ready in your repo!"
    print_warning "After deployment, update FRONTEND_URL to your actual Cloudflare Pages URL"
}

deploy_to_fly() {
    print_status "Setting up Fly.io deployment..."
    
    # Check if flyctl is installed
    if ! command -v flyctl &> /dev/null; then
        print_warning "Fly CLI not installed. Installing..."
        curl -L https://fly.io/install.sh | sh
        echo 'export PATH="$HOME/.fly/bin:$PATH"' >> ~/.bashrc
        source ~/.bashrc
    fi
    
    cd backend
    
    print_status "Initializing Fly app..."
    flyctl auth login
    
    # fly.toml already exists, so just deploy
    flyctl deploy
    
    print_success "Fly.io deployment started!"
    print_warning "You'll need to set up external database (Neon or Supabase)"
    
    cd ..
}

setup_free_databases() {
    print_status "FREE DATABASE SETUP GUIDE:"
    echo ""
    print_warning "1. NEON POSTGRESQL (Recommended):"
    echo "   - Go to https://neon.tech"
    echo "   - Sign up with GitHub"
    echo "   - Create new project"
    echo "   - Copy connection string"
    echo "   - Add as DATABASE_URL in your hosting service"
    echo ""
    print_warning "2. UPSTASH REDIS:"
    echo "   - Go to https://upstash.com"
    echo "   - Create Redis database"
    echo "   - Copy connection string"
    echo "   - Add as REDIS_URL in your hosting service"
    echo ""
    print_warning "3. CLOUDFLARE R2 (File Storage):"
    echo "   - Go to Cloudflare Dashboard → R2"
    echo "   - Create bucket"
    echo "   - Generate API tokens"
    echo "   - Update S3 config in backend env vars"
}

deploy_frontend_cloudflare() {
    print_status "Deploying frontend to Cloudflare Pages..."
    
    cd frontend
    
    # Build static site
    print_status "Building static site..."
    npm run build
    
    if [ $? -eq 0 ]; then
        print_success "Build successful!"
        print_warning "Manual steps for Cloudflare Pages:"
        echo "1. Go to https://dash.cloudflare.com/pages"
        echo "2. Connect to Git → Select your repository"
        echo "3. Build settings:"
        echo "   - Framework: Next.js (Static HTML Export)"
        echo "   - Build command: npm run build"
        echo "   - Build output: out"
        echo "   - Root directory: frontend"
        echo "4. Environment variables:"
        echo "   - NEXT_PUBLIC_API_URL=https://your-backend-url"
        echo "   - NEXT_PUBLIC_SOCKET_URL=https://your-backend-url"
    else
        print_error "Build failed"
    fi
    
    cd ..
}

main() {
    print_status "🆓 FREE HOSTING DEPLOYMENT FOR JECRC DATING APP"
    echo ""
    
    show_hosting_options
    
    echo "What would you like to do?"
    echo "1) Deploy to Render (Recommended - Easiest)"
    echo "2) Deploy to Fly.io (Always on, but need external DB)"
    echo "3) Set up free databases (Neon, Upstash, etc.)"
    echo "4) Deploy frontend to Cloudflare Pages"
    echo "5) Show all free hosting options"
    echo "6) Complete setup guide"
    
    read -p "Enter your choice (1-6): " choice
    
    case $choice in
        1)
            deploy_to_render
            ;;
        2)
            deploy_to_fly
            ;;
        3)
            setup_free_databases
            ;;
        4)
            deploy_frontend_cloudflare
            ;;
        5)
            show_hosting_options
            ;;
        6)
            deploy_to_render
            echo ""
            setup_free_databases
            echo ""
            deploy_frontend_cloudflare
            ;;
        *)
            print_error "Invalid choice"
            exit 1
            ;;
    esac
    
    echo ""
    print_success "🎉 Your JECRC Dating App can be hosted 100% FREE!"
    print_warning "💡 Recommended stack: Render + Neon + Upstash + Cloudflare Pages"
    echo ""
    print_status "📚 Check FREE_HOSTING.md for detailed setup instructions"
}

main
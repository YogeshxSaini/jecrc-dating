#!/bin/bash

# JECRC Dating App - Cloudflare Deployment Script

echo "🚀 Deploying JECRC Dating App to Cloudflare..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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

# Check if required commands exist
check_dependencies() {
    print_status "Checking dependencies..."
    
    if ! command -v wrangler &> /dev/null; then
        print_error "Wrangler CLI not found. Please install with: npm install -g wrangler"
        exit 1
    fi
    
    if ! command -v railway &> /dev/null; then
        print_warning "Railway CLI not found. Install with: npm install -g @railway/cli"
        print_warning "You'll need to deploy the backend manually"
    fi
    
    print_success "Dependencies check complete"
}

# Deploy backend to Railway
deploy_backend() {
    print_status "Deploying backend to Railway..."
    
    cd backend
    
    if command -v railway &> /dev/null; then
        print_status "Using Railway CLI to deploy backend..."
        railway login
        railway link
        railway up
        print_success "Backend deployed to Railway!"
        
        # Get the Railway URL
        RAILWAY_URL=$(railway status --json | jq -r '.deployments[0].url')
        print_success "Backend URL: $RAILWAY_URL"
    else
        print_warning "Railway CLI not available. Please:"
        print_warning "1. Go to railway.app and create a new project"
        print_warning "2. Connect your GitHub repository"
        print_warning "3. Set the root directory to 'backend'"
        print_warning "4. Add the environment variables from backend/.env.production"
    fi
    
    cd ..
}

# Deploy frontend to Cloudflare Pages
deploy_frontend() {
    print_status "Deploying frontend to Cloudflare Pages..."
    
    cd frontend
    
    # Build the static site
    print_status "Building Next.js static site..."
    npm run build
    
    if [ $? -eq 0 ]; then
        print_success "Build completed successfully!"
        
        # Deploy to Cloudflare Pages
        print_status "Deploying to Cloudflare Pages..."
        
        # Check if wrangler is logged in
        if ! wrangler whoami &> /dev/null; then
            print_status "Please log in to Cloudflare..."
            wrangler login
        fi
        
        # Deploy the static files
        wrangler pages publish out --project-name=jecrc-dating
        
        if [ $? -eq 0 ]; then
            print_success "Frontend deployed to Cloudflare Pages!"
            print_success "Your app should be available at: https://jecrc-dating.pages.dev"
        else
            print_error "Cloudflare Pages deployment failed"
            exit 1
        fi
    else
        print_error "Frontend build failed"
        exit 1
    fi
    
    cd ..
}

# Update environment variables
update_env_vars() {
    print_status "Environment variable configuration:"
    print_warning "Don't forget to update the following in Cloudflare Pages dashboard:"
    echo "  - NEXT_PUBLIC_API_URL=https://your-backend.railway.app"
    echo "  - NEXT_PUBLIC_SOCKET_URL=https://your-backend.railway.app"
    echo ""
    print_warning "And in Railway dashboard for backend:"
    echo "  - DATABASE_URL=<your-postgres-url>"
    echo "  - REDIS_URL=<your-redis-url>"
    echo "  - JWT_SECRET=<generate-secure-secret>"
    echo "  - All other vars from backend/.env.production"
}

# Main deployment process
main() {
    print_status "Starting JECRC Dating App deployment..."
    echo ""
    
    check_dependencies
    echo ""
    
    # Ask user what to deploy
    echo "What would you like to deploy?"
    echo "1) Backend only (Railway)"
    echo "2) Frontend only (Cloudflare Pages)"
    echo "3) Both backend and frontend"
    echo "4) Show environment variables guide"
    
    read -p "Enter your choice (1-4): " choice
    
    case $choice in
        1)
            deploy_backend
            ;;
        2)
            deploy_frontend
            ;;
        3)
            deploy_backend
            echo ""
            deploy_frontend
            ;;
        4)
            update_env_vars
            ;;
        *)
            print_error "Invalid choice. Please run the script again."
            exit 1
            ;;
    esac
    
    echo ""
    print_success "Deployment process completed!"
    echo ""
    update_env_vars
}

# Run main function
main
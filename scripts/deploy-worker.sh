#!/bin/bash

#################################################
# LexChat Worker Deployment Script
# Purpose: نشر Worker إلى Cloudflare
# Security: جميع الأسرار من متغيرات البيئة
#################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if wrangler is installed
check_wrangler() {
    if ! command -v wrangler &> /dev/null; then
        log_error "Wrangler is not installed. Installing..."
        npm install -g wrangler
    else
        log_info "Wrangler is installed: $(wrangler --version)"
    fi
}

# Validate environment
validate_env() {
    log_info "Validating environment..."
    
    if [ -z "$CLOUDFLARE_API_TOKEN" ] && [ -z "$CLOUDFLARE_ACCOUNT_ID" ]; then
        log_warn "CLOUDFLARE_API_TOKEN or CLOUDFLARE_ACCOUNT_ID not set"
        log_warn "You may need to authenticate with: wrangler login"
    fi
    
    # Check if required files exist
    if [ ! -f "workers/lexchat/wrangler.toml" ]; then
        log_error "wrangler.toml not found in workers/lexchat/"
        exit 1
    fi
    
    if [ ! -f "workers/lexchat/workflows/image-processing.ts" ]; then
        log_error "image-processing.ts not found in workers/lexchat/workflows/"
        exit 1
    fi
    
    log_info "Environment validation passed"
}

# Deploy to production
deploy_production() {
    log_info "🚀 Deploying to Production..."
    
    cd workers/lexchat
    
    # Deploy worker
    npx wrangler deploy --env production --name lexchat
    
    cd ../..
    
    log_info "✅ Production deployment completed!"
    log_info "Worker URL: https://lexchat.moteb.uk"
}

# Deploy to staging
deploy_staging() {
    log_info "🚀 Deploying to Staging..."
    
    cd workers/lexchat
    
    npx wrangler deploy --env staging --name lexchat-staging
    
    cd ../..
    
    log_info "✅ Staging deployment completed!"
}

# Deploy to development
deploy_dev() {
    log_info "🚀 Deploying to Development..."
    
    cd workers/lexchat
    
    npx wrangler deploy --env development --name lexchat-dev
    
    cd ../..
    
    log_info "✅ Development deployment completed!"
}

# Setup secrets (one-time setup)
setup_secrets() {
    log_info "Setting up secrets..."
    log_warn "⚠️  You will be prompted to enter sensitive values"
    log_warn "⚠️  These values will be encrypted and stored securely by Cloudflare"
    
    cd workers/lexchat
    
    # Check if secrets already exist
    read -p "Do you want to set OPENAI_API_KEY? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        npx wrangler secret put OPENAI_API_KEY --env production
    fi
    
    read -p "Do you want to set ADMIN_TOKEN? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        npx wrangler secret put ADMIN_TOKEN --env production
    fi
    
    cd ../..
    
    log_info "✅ Secrets setup completed!"
}

# Create R2 buckets
create_buckets() {
    log_info "Creating R2 buckets..."
    
    cd workers/lexchat
    
    npx wrangler r2 bucket create lexchat-images || log_warn "Bucket may already exist"
    npx wrangler r2 bucket create lexchat-images-preview || log_warn "Bucket may already exist"
    npx wrangler r2 bucket create lexchat-images-staging || log_warn "Bucket may already exist"
    npx wrangler r2 bucket create lexchat-images-dev || log_warn "Bucket may already exist"
    
    cd ../..
    
    log_info "✅ R2 buckets created!"
}

# Tail logs
tail_logs() {
    log_info "Tailing logs for production worker..."
    cd workers/lexchat
    npx wrangler tail --env production
    cd ../..
}

# Main script
main() {
    log_info "==================================="
    log_info "LexChat Worker Deployment"
    log_info "==================================="
    
    # Parse arguments
    COMMAND=${1:-"help"}
    
    case $COMMAND in
        production|prod)
            check_wrangler
            validate_env
            deploy_production
            ;;
        staging)
            check_wrangler
            validate_env
            deploy_staging
            ;;
        development|dev)
            check_wrangler
            validate_env
            deploy_dev
            ;;
        secrets)
            check_wrangler
            setup_secrets
            ;;
        buckets)
            check_wrangler
            create_buckets
            ;;
        logs)
            check_wrangler
            tail_logs
            ;;
        setup)
            check_wrangler
            validate_env
            create_buckets
            setup_secrets
            log_info "✅ Initial setup completed! You can now deploy with: $0 production"
            ;;
        help|*)
            echo "Usage: $0 {production|staging|development|secrets|buckets|logs|setup|help}"
            echo ""
            echo "Commands:"
            echo "  production, prod   - Deploy to production (lexchat.moteb.uk)"
            echo "  staging           - Deploy to staging environment"
            echo "  development, dev  - Deploy to development environment"
            echo "  secrets           - Setup worker secrets (one-time)"
            echo "  buckets           - Create R2 buckets (one-time)"
            echo "  logs              - Tail production logs"
            echo "  setup             - Run initial setup (buckets + secrets)"
            echo "  help              - Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0 setup              # First-time setup"
            echo "  $0 production         # Deploy to production"
            echo "  $0 logs               # View production logs"
            ;;
    esac
}

# Run main script
main "$@"

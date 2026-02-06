#!/bin/bash

#################################################
# Cloudflare Pages Deployment Script
# Purpose: نشر تطبيق الواجهة الأمامية إلى Pages
# Security: لا أسرار في الواجهة الأمامية
#################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

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

# Prepare app directory
prepare_app() {
    log_info "Preparing app directory..."
    
    # Create app directory if not exists
    mkdir -p app
    
    # Copy frontend files
    if [ -d "src/chat" ]; then
        log_info "Copying chat app files..."
        cp -r src/chat/* app/
    fi
    
    # Create or update index.html with proper base path
    if [ ! -f "app/index.html" ]; then
        log_warn "app/index.html not found, creating basic template"
        create_index_html
    fi
    
    # Ensure no secrets in frontend code
    check_for_secrets
    
    log_info "App directory prepared"
}

# Create basic index.html
create_index_html() {
    cat > app/index.html << 'EOF'
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="LexChat - محادثة ذكية مدعومة بالذكاء الاصطناعي">
    <title>LexChat - محادثة ذكية</title>
    <link rel="stylesheet" href="/styles.css">
</head>
<body>
    <div id="app">
        <header>
            <h1>LexChat</h1>
            <p>محادثة ذكية مدعومة بالذكاء الاصطناعي</p>
        </header>
        <main>
            <div id="chat-container">
                <!-- Chat UI will be loaded here -->
            </div>
        </main>
    </div>
    <script src="/app.js"></script>
</body>
</html>
EOF
}

# Check for exposed secrets in frontend files
check_for_secrets() {
    log_info "Checking for exposed secrets..."
    
    # Patterns that should NOT be in frontend code
    SECRET_PATTERNS=(
        "API_KEY"
        "OPENAI_BSM_KEY"
        "OPENAI_BRINDER_KEY"
        "OPENAI_LEXNEXUS_KEY"
        "ADMIN_TOKEN"
        "SECRET"
        "PRIVATE_KEY"
    )
    
    FOUND_SECRETS=0
    
    for pattern in "${SECRET_PATTERNS[@]}"; do
        if grep -r "$pattern" app/ 2>/dev/null | grep -v "API_ENDPOINT" | grep -v "// API_" > /dev/null; then
            log_warn "⚠️  Potential secret pattern found: $pattern"
            FOUND_SECRETS=1
        fi
    done
    
    if [ $FOUND_SECRETS -eq 1 ]; then
        log_error "❌ Secrets detected in frontend code!"
        log_error "Remove all API keys and secrets before deploying"
        read -p "Do you want to continue anyway? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    else
        log_info "✅ No secrets detected in frontend code"
    fi
}

# Build app (if build step needed)
build_app() {
    log_info "Building app..."
    
    # Check if package.json has build script
    if [ -f "package.json" ] && grep -q '"build"' package.json; then
        log_info "Running npm build..."
        npm run build
    else
        log_info "No build step required"
    fi
}

# Deploy to Cloudflare Pages
deploy_pages() {
    local PROJECT_NAME=${1:-"lexdo"}
    local BRANCH=${2:-"main"}
    
    log_info "🚀 Deploying to Cloudflare Pages..."
    log_info "Project: $PROJECT_NAME"
    log_info "Branch: $BRANCH"
    
    # Deploy using wrangler pages
    npx wrangler pages deploy app \
        --project-name="$PROJECT_NAME" \
        --branch="$BRANCH" \
        --commit-dirty=true
    
    log_info "✅ Pages deployment completed!"
    log_info "Your site should be available at: https://lexdo.uk"
}

# Create Pages project (first-time setup)
create_pages_project() {
    log_info "Creating Pages project..."
    
    read -p "Enter project name (default: lexdo): " PROJECT_NAME
    PROJECT_NAME=${PROJECT_NAME:-lexdo}
    
    npx wrangler pages project create "$PROJECT_NAME" \
        --production-branch=main
    
    log_info "✅ Pages project created: $PROJECT_NAME"
    log_info "Configure custom domain at: https://dash.cloudflare.com"
}

# Configure custom domain
configure_domain() {
    log_info "Custom Domain Configuration"
    log_info "=============================="
    log_info ""
    log_info "To configure lexdo.uk domain:"
    log_info "1. Go to: https://dash.cloudflare.com"
    log_info "2. Select your Pages project"
    log_info "3. Go to Custom domains"
    log_info "4. Add domain: lexdo.uk"
    log_info "5. Add www subdomain: www.lexdo.uk"
    log_info ""
    log_info "DNS records will be configured automatically by Cloudflare"
}

# Main script
main() {
    log_info "==================================="
    log_info "Cloudflare Pages Deployment"
    log_info "==================================="
    
    COMMAND=${1:-"help"}
    
    case $COMMAND in
        deploy)
            check_wrangler
            prepare_app
            build_app
            deploy_pages "lexdo" "main"
            ;;
        setup)
            check_wrangler
            create_pages_project
            configure_domain
            ;;
        prepare)
            prepare_app
            log_info "✅ App prepared in ./app directory"
            ;;
        check)
            prepare_app
            log_info "✅ Security check completed"
            ;;
        domain)
            configure_domain
            ;;
        help|*)
            echo "Usage: $0 {deploy|setup|prepare|check|domain|help}"
            echo ""
            echo "Commands:"
            echo "  deploy   - Deploy app to Cloudflare Pages (lexdo.uk)"
            echo "  setup    - Create Pages project (first-time)"
            echo "  prepare  - Prepare app directory without deploying"
            echo "  check    - Check for security issues (exposed secrets)"
            echo "  domain   - Show custom domain configuration instructions"
            echo "  help     - Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0 setup     # First-time setup"
            echo "  $0 deploy    # Deploy to production"
            echo "  $0 check     # Security check"
            ;;
    esac
}

# Run main script
main "$@"

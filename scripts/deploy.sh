#!/bin/bash
# BSM-AgentOS Deployment Script
# Quick deployment for development and production

set -e

echo "╔════════════════════════════════════════════════════╗"
echo "║    BSM-AgentOS Deployment Script                  ║"
echo "║    The Smartest AI Agent Platform                 ║"
echo "╚════════════════════════════════════════════════════╝"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  No .env file found. Creating from .env.example..."
    cp .env.example .env
    echo "✅ Created .env file. Please update it with your credentials."
    echo ""
fi

# Function to deploy with Docker Compose
deploy_docker() {
    echo "🐳 Deploying with Docker Compose..."
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        echo "❌ Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    # Check if Docker Compose is installed
    if ! command -v docker-compose &> /dev/null; then
        echo "❌ Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    # Build and start containers
    echo "🔨 Building containers..."
    docker-compose build
    
    echo "🚀 Starting services..."
    docker-compose up -d
    
    # Wait for services to be healthy
    echo "⏳ Waiting for services to be ready..."
    sleep 10
    
    # Check health
    echo "🏥 Checking service health..."
    docker-compose ps
    
    echo ""
    echo "✅ Deployment complete!"
    echo ""
    echo "📊 Services:"
    echo "   - API Server: http://localhost:3000"
    echo "   - Dashboard: http://localhost:8501"
    echo "   - PostgreSQL: localhost:5432"
    echo "   - Redis: localhost:6379"
    echo ""
    echo "📝 Logs: docker-compose logs -f"
    echo "🛑 Stop: docker-compose down"
}

# Function to deploy locally
deploy_local() {
    echo "💻 Deploying locally..."
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        echo "❌ Node.js is not installed. Please install Node.js 22+ first."
        exit 1
    fi
    
    # Install dependencies
    echo "📦 Installing dependencies..."
    npm install
    
    # Run migrations
    echo "🗄️  Running database migrations..."
    npm run migrate || echo "⚠️  Migrations failed. Ensure PostgreSQL is running."
    
    # Start the server
    echo "🚀 Starting server..."
    npm start
}

# Main menu
echo "Select deployment method:"
echo "1) Docker Compose (Recommended)"
echo "2) Local (Development)"
echo "3) Exit"
echo ""
read -p "Enter choice [1-3]: " choice

case $choice in
    1)
        deploy_docker
        ;;
    2)
        deploy_local
        ;;
    3)
        echo "Exiting..."
        exit 0
        ;;
    *)
        echo "❌ Invalid choice. Exiting..."
        exit 1
        ;;
esac

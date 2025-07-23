#!/bin/bash

# PharmaRx Development Workflow Script
# Starts all necessary services for local development

set -e

echo "🚀 Starting PharmaRx Development Environment"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if we're in the correct directory
if [ ! -f "package.json" ] || [ ! -d "apps" ]; then
    print_error "This script must be run from the project root directory"
    exit 1
fi

# Check if Firebase project is configured
check_firebase_config() {
    print_status "Checking Firebase configuration..."
    
    if [ ! -f "apps/web/.env.dev" ]; then
        print_warning "Firebase environment files not found"
        print_status "Run the setup script first: ./infra/scripts/setup-firebase.sh"
        
        read -p "Do you want to use demo configuration for now? (y/N): " use_demo
        if [[ $use_demo =~ ^[Yy]$ ]]; then
            print_status "Using demo Firebase configuration"
            return 0
        else
            print_error "Firebase configuration required"
            exit 1
        fi
    fi
    
    print_success "Firebase configuration found"
}

# Start Firebase emulators
start_emulators() {
    print_status "Starting Firebase emulators..."
    
    # Check if firebase.json exists
    if [ ! -f "firebase.json" ]; then
        print_status "Initializing Firebase emulators..."
        firebase init emulators --project demo-pharmarx
    fi
    
    # Start emulators in background
    print_status "Starting Firebase emulators in background..."
    firebase emulators:start --only firestore,auth,storage &
    FIREBASE_PID=$!
    
    # Wait for emulators to start
    print_status "Waiting for emulators to start..."
    sleep 5
    
    # Check if emulators are running
    if curl -s http://localhost:4400/emulators > /dev/null; then
        print_success "Firebase emulators started successfully"
        echo "  🔐 Auth Emulator: http://localhost:9099"
        echo "  🔥 Firestore Emulator: http://localhost:8080"
        echo "  📁 Storage Emulator: http://localhost:9199"
        echo "  📊 Emulator UI: http://localhost:4000"
    else
        print_error "Failed to start Firebase emulators"
        kill $FIREBASE_PID 2>/dev/null || true
        exit 1
    fi
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    
    if [ ! -d "node_modules" ]; then
        print_status "Installing root dependencies..."
        npm install
    fi
    
    if [ ! -d "apps/web/node_modules" ]; then
        print_status "Installing web app dependencies..."
        cd apps/web && npm install && cd ../..
    fi
    
    if [ ! -d "apps/api/node_modules" ]; then
        print_status "Installing API dependencies..."
        cd apps/api && npm install && cd ../..
    fi
    
    print_success "Dependencies installed"
}

# Start development servers
start_dev_servers() {
    print_status "Starting development servers..."
    
    # Start API server
    print_status "Starting API server..."
    cd apps/api
    npm run dev &
    API_PID=$!
    cd ../..
    
    # Wait for API to start
    sleep 3
    
    # Start web app
    print_status "Starting web application..."
    cd apps/web
    npm run dev &
    WEB_PID=$!
    cd ../..
    
    # Wait for web app to start
    sleep 3
    
    print_success "Development servers started"
    echo "  🌐 Web App: http://localhost:5173"
    echo "  🔌 API Server: http://localhost:3001"
}

# Run tests
run_tests() {
    print_status "Running tests..."
    
    # Run API tests
    print_status "Running API tests..."
    cd apps/api && npm test && cd ../..
    
    # Run web app tests  
    print_status "Running web app tests..."
    cd apps/web && npm test run && cd ../..
    
    print_success "All tests passed"
}

# Development menu
dev_menu() {
    echo ""
    echo "Development Environment Options:"
    echo "1) Full development setup (emulators + servers)"
    echo "2) Start Firebase emulators only"
    echo "3) Start development servers only"
    echo "4) Run tests"
    echo "5) Stop all services"
    echo "6) Exit"
    
    read -p "Enter your choice (1-6): " choice
    
    case $choice in
        1)
            check_firebase_config
            install_dependencies
            start_emulators
            start_dev_servers
            print_success "🎉 Development environment is ready!"
            monitor_services
            ;;
        2)
            start_emulators
            print_success "Firebase emulators started"
            ;;
        3)
            install_dependencies
            start_dev_servers
            print_success "Development servers started"
            monitor_services
            ;;
        4)
            run_tests
            ;;
        5)
            stop_services
            ;;
        6)
            print_success "👋 Goodbye!"
            exit 0
            ;;
        *)
            print_error "Invalid choice"
            dev_menu
            ;;
    esac
}

# Monitor services
monitor_services() {
    echo ""
    print_success "🎯 Development environment is running!"
    echo ""
    echo "Available services:"
    echo "  🌐 Web App: http://localhost:5173"
    echo "  🔌 API Server: http://localhost:3001"
    echo "  🔥 Firestore Emulator: http://localhost:8080"
    echo "  🔐 Auth Emulator: http://localhost:9099"
    echo "  📊 Firebase UI: http://localhost:4000"
    echo ""
    echo "Press Ctrl+C to stop all services"
    
    # Wait for interrupt
    trap stop_services INT
    wait
}

# Stop all services
stop_services() {
    print_status "Stopping all services..."
    
    # Kill development servers
    if [ ! -z "$WEB_PID" ]; then
        kill $WEB_PID 2>/dev/null || true
        print_status "Web app stopped"
    fi
    
    if [ ! -z "$API_PID" ]; then
        kill $API_PID 2>/dev/null || true
        print_status "API server stopped"
    fi
    
    # Kill Firebase emulators
    if [ ! -z "$FIREBASE_PID" ]; then
        kill $FIREBASE_PID 2>/dev/null || true
        print_status "Firebase emulators stopped"
    fi
    
    # Kill any remaining processes
    pkill -f "firebase emulators" 2>/dev/null || true
    pkill -f "vite" 2>/dev/null || true
    pkill -f "tsx watch" 2>/dev/null || true
    
    print_success "All services stopped"
}

# Health check
health_check() {
    print_status "Running health checks..."
    
    # Check API
    if curl -s http://localhost:3001/health > /dev/null; then
        print_success "API server is healthy"
    else
        print_error "API server is not responding"
    fi
    
    # Check Firebase emulators
    if curl -s http://localhost:4400/emulators > /dev/null; then
        print_success "Firebase emulators are healthy"
    else
        print_error "Firebase emulators are not responding"
    fi
    
    # Check web app
    if curl -s http://localhost:5173 > /dev/null; then
        print_success "Web app is healthy"
    else
        print_error "Web app is not responding"
    fi
}

# Quick start (no menu)
quick_start() {
    print_status "🚀 Quick starting development environment..."
    check_firebase_config
    install_dependencies
    start_emulators
    start_dev_servers
    print_success "🎉 Development environment is ready!"
    monitor_services
}

# Main execution
main() {
    # Check for quick start flag
    if [ "$1" = "--quick" ] || [ "$1" = "-q" ]; then
        quick_start
    else
        dev_menu
    fi
}

# Cleanup on exit
cleanup() {
    stop_services
    exit 0
}

trap cleanup EXIT

# Run main function
main "$@" 
#!/bin/bash

# PharmaRx Firebase DevOps Post-Start Script
# This script runs every time the codespace starts

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

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

print_status "🚀 Starting PharmaRx Firebase DevOps environment..."

# Update npm packages if needed (in background)
print_status "Checking for package updates..."
npm update --silent > /dev/null 2>&1 &

# Verify all tools are still available
print_status "Verifying development tools..."

# Function to check tool availability
check_tool() {
    local tool=$1
    local command=$2
    
    if $command > /dev/null 2>&1; then
        print_success "$tool is available"
        return 0
    else
        print_error "$tool is not available"
        return 1
    fi
}

# Check all required tools
check_tool "Node.js" "node --version"
check_tool "npm" "npm --version"
check_tool "Firebase CLI" "firebase --version"
check_tool "Google Cloud CLI" "gcloud --version"
check_tool "Terraform" "terraform --version"
check_tool "jq" "jq --version"

# Check if user is authenticated with Google Cloud
print_status "Checking Google Cloud authentication..."
if gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    ACTIVE_ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format="value(account)")
    print_success "Authenticated with Google Cloud as: $ACTIVE_ACCOUNT"
else
    print_warning "Not authenticated with Google Cloud"
    print_status "Run 'gcloud auth login' to authenticate"
fi

# Check if Firebase project is configured
print_status "Checking Firebase configuration..."
if [ -f ".firebaserc" ]; then
    print_success "Firebase project configuration found"
else
    print_warning "Firebase project not configured"
    print_status "Run 'firebase use --add' to configure project"
fi

# Check Terraform configuration
print_status "Checking Terraform configuration..."
if [ -f "infra/terraform/terraform.tfvars" ]; then
    print_success "Terraform configuration found"
    
    # Check if it's still using example values
    if grep -q "your-main-gcp-project-id" infra/terraform/terraform.tfvars; then
        print_warning "Terraform configuration uses example values"
        print_status "Edit infra/terraform/terraform.tfvars with your actual GCP project details"
    else
        print_success "Terraform configuration appears to be customized"
    fi
else
    print_warning "Terraform configuration not found"
    print_status "Copy infra/terraform/terraform.tfvars.example to terraform.tfvars and configure"
fi

# Check if environment files exist
print_status "Checking environment configuration..."
if [ -f "apps/web/.env.dev" ] && [ -f "apps/api/.env.dev" ]; then
    print_success "Environment configuration files found"
else
    print_warning "Environment configuration files not found"
    print_status "Run the setup script to generate environment files"
fi

# Show helpful information
echo ""
print_success "🎯 PharmaRx Firebase DevOps Environment Ready!"
echo ""
print_status "📋 Available quick commands:"
echo "  setup    - Run Firebase setup script"
echo "  dev      - Start development environment"
echo "  tf       - Terraform shortcut"
echo "  fb       - Firebase shortcut"
echo "  gc       - Google Cloud shortcut"
echo ""
print_status "🚀 Next steps to get started:"
echo "  1. Configure your GCP project: edit infra/terraform/terraform.tfvars"
echo "  2. Authenticate: gcloud auth login"
echo "  3. Set up Firebase: ./infra/scripts/setup-firebase.sh"
echo "  4. Start development: ./infra/scripts/dev-workflow.sh"
echo ""
print_status "📚 Documentation:"
echo "  - Firebase Setup Guide: docs/firebase-setup.md"
echo "  - Development Workflow: infra/scripts/dev-workflow.sh --help"
echo ""

# Check if ports are available for development
print_status "Checking development ports..."
check_port() {
    local port=$1
    local service=$2
    
    if lsof -i:$port > /dev/null 2>&1; then
        print_warning "Port $port ($service) is already in use"
    else
        print_success "Port $port ($service) is available"
    fi
}

check_port 3001 "API Server"
check_port 5173 "Web App"
check_port 8080 "Firestore Emulator"
check_port 9099 "Auth Emulator"
check_port 4000 "Firebase UI"

# Wait for npm update to complete
wait

print_success "🎉 Environment startup complete!" 
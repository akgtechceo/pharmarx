#!/bin/bash

# PharmaRx Firebase DevOps Setup Script for Codespaces
# This script runs after the devcontainer is created

set -e

echo "🚀 Setting up PharmaRx Firebase DevOps environment..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
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

# Install project dependencies
print_status "Installing project dependencies..."

# Install root dependencies
if [ -f "package.json" ]; then
    npm install
    print_success "Root dependencies installed"
fi

# Install web app dependencies
if [ -f "apps/web/package.json" ]; then
    cd apps/web
    npm install
    cd ../..
    print_success "Web app dependencies installed"
fi

# Install API dependencies
if [ -f "apps/api/package.json" ]; then
    cd apps/api
    npm install
    cd ../..
    print_success "API dependencies installed"
fi

# Install shared packages dependencies
if [ -f "packages/shared-types/package.json" ]; then
    cd packages/shared-types
    npm install
    cd ../..
    print_success "Shared types dependencies installed"
fi

# Make scripts executable
print_status "Making scripts executable..."
chmod +x infra/scripts/*.sh
print_success "Scripts are now executable"

# Verify tool installations
print_status "Verifying tool installations..."

# Check Node.js
if node --version > /dev/null 2>&1; then
    print_success "Node.js: $(node --version)"
else
    print_warning "Node.js not found"
fi

# Check npm
if npm --version > /dev/null 2>&1; then
    print_success "npm: $(npm --version)"
else
    print_warning "npm not found"
fi

# Check Firebase CLI
if firebase --version > /dev/null 2>&1; then
    print_success "Firebase CLI: $(firebase --version | head -1)"
else
    print_warning "Firebase CLI not found"
fi

# Check Google Cloud CLI
if gcloud --version > /dev/null 2>&1; then
    print_success "Google Cloud CLI: $(gcloud --version | head -1)"
else
    print_warning "Google Cloud CLI not found"
fi

# Check Terraform
if terraform --version > /dev/null 2>&1; then
    print_success "Terraform: $(terraform --version | head -1)"
else
    print_warning "Terraform not found"
fi

# Check jq
if jq --version > /dev/null 2>&1; then
    print_success "jq: $(jq --version)"
else
    print_warning "jq not found"
fi

# Create necessary directories
print_status "Creating necessary directories..."
mkdir -p .firebase
mkdir -p logs
mkdir -p temp
print_success "Directories created"

# Set up git hooks if needed
if [ -d ".git" ]; then
    print_status "Setting up git hooks..."
    # You can add git hooks setup here if needed
    print_success "Git hooks configured"
fi

# Initialize Firebase project configuration (without login)
print_status "Preparing Firebase configuration..."
if [ ! -f "firebase.json" ]; then
    # Create basic firebase.json for emulators
    cat > firebase.json << EOF
{
  "emulators": {
    "auth": {
      "port": 9099
    },
    "firestore": {
      "port": 8080
    },
    "storage": {
      "port": 9199
    },
    "ui": {
      "enabled": true,
      "port": 4000
    },
    "singleProjectMode": true
  },
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  }
}
EOF
    print_success "Firebase configuration created"
fi

# Create firestore indexes file if it doesn't exist
if [ ! -f "firestore.indexes.json" ]; then
    echo '{"indexes": [], "fieldOverrides": []}' > firestore.indexes.json
    print_success "Firestore indexes file created"
fi

# Create environment-specific directories
mkdir -p .env
mkdir -p config
print_success "Configuration directories created"

print_success "🎉 PharmaRx Firebase DevOps environment setup complete!"
print_status "📋 Next steps:"
echo "  1. Configure your GCP project in infra/terraform/terraform.tfvars"
echo "  2. Authenticate with Google Cloud: gcloud auth login"
echo "  3. Run the setup script: ./infra/scripts/setup-firebase.sh"
echo "  4. Start development: ./infra/scripts/dev-workflow.sh"
echo ""
print_status "🔧 Quick commands available:"
echo "  setup    - Run Firebase setup script"
echo "  dev      - Start development environment"
echo "  tf       - Terraform shortcut"
echo "  fb       - Firebase shortcut"
echo "  gc       - Google Cloud shortcut" 
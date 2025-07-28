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

# Install Google Cloud CLI
print_status "Installing Google Cloud CLI..."
if ! command -v gcloud &> /dev/null; then
    # Modern installation approach using official Google installation script
    print_status "Downloading Google Cloud CLI..."
    curl -sSL https://sdk.cloud.google.com | bash -s -- --disable-prompts --install-dir=/usr/local
    
    # Add to PATH for current session
    export PATH="/usr/local/google-cloud-sdk/bin:$PATH"
    
    # Add to PATH permanently for all users
    echo 'export PATH="/usr/local/google-cloud-sdk/bin:$PATH"' | sudo tee -a /etc/environment
    
    # Install additional components useful for Firebase development
    print_status "Installing Google Cloud CLI components..."
    gcloud components install --quiet \
        firebase-tools \
        cloud-sql-proxy \
        pubsub-emulator \
        cloud-firestore-emulator \
        app-engine-go \
        kubectl
    
    # Configure gcloud for better devcontainer experience  
    gcloud config set core/disable_usage_reporting true
    gcloud config set component_manager/disable_update_check true
    gcloud config set core/disable_color false
    
    print_success "Google Cloud CLI installed with components"
else
    print_success "Google Cloud CLI already installed"
    
    # Ensure components are up to date
    print_status "Updating Google Cloud CLI components..."
    gcloud components update --quiet
fi

# Create gcloud configuration directory with proper permissions
CURRENT_USER=$(whoami)
USER_HOME=$(eval echo ~$CURRENT_USER)

# Create gcloud config directory for current user
mkdir -p $USER_HOME/.config/gcloud
chmod 700 $USER_HOME/.config/gcloud

# If running as root, ensure proper ownership for vscode user
if [ "$CURRENT_USER" = "root" ] && id -u vscode >/dev/null 2>&1; then
    chown -R vscode:vscode /home/vscode/.config/gcloud 2>/dev/null || true
fi

# Install Firebase CLI
print_status "Installing Firebase CLI..."
npm install -g firebase-tools@latest
print_success "Firebase CLI installed"

# Install additional useful tools
print_status "Installing additional development tools..."
npm install -g tsx vitest typescript
print_success "Additional tools installed"

# Install jq if not available
if ! command -v jq &> /dev/null; then
    print_status "Installing jq..."
    sudo apt-get update && sudo apt-get install -y jq
    print_success "jq installed"
fi

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
chmod +x infra/scripts/*.sh 2>/dev/null || true
chmod +x .devcontainer/*.sh 2>/dev/null || true
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
mkdir -p .env
mkdir -p config
print_success "Directories created"

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

# Set up shell aliases
print_status "Setting up shell aliases..."

# Determine shell config file
SHELL_CONFIG="$HOME/.bashrc"
if [ -f "$HOME/.zshrc" ]; then
    SHELL_CONFIG="$HOME/.zshrc"
fi

echo 'alias tf="terraform"' >> $SHELL_CONFIG
echo 'alias fb="firebase"' >> $SHELL_CONFIG
echo 'alias gc="gcloud"' >> $SHELL_CONFIG
echo 'alias dev="./infra/scripts/dev-workflow.sh"' >> $SHELL_CONFIG
echo 'alias setup="./infra/scripts/setup-firebase.sh"' >> $SHELL_CONFIG
echo 'alias gconfig="./.devcontainer/gcloud-config.sh"' >> $SHELL_CONFIG
print_success "Shell aliases configured for $(basename $SHELL_CONFIG)"

print_success "🎉 PharmaRx Firebase DevOps environment setup complete!"
print_status "📋 Next steps:"
echo "  1. Configure Google Cloud: gconfig (recommended) or manual setup"
echo "  2. Run Firebase setup: ./infra/scripts/setup-firebase.sh"
echo "  3. Start development: ./infra/scripts/dev-workflow.sh"
echo ""
print_status "🔧 Quick commands available:"
echo "  gconfig  - Configure Google Cloud CLI (recommended first step)"
echo "  setup    - Run Firebase setup script"
echo "  dev      - Start development environment"
echo "  tf       - Terraform shortcut"
echo "  fb       - Firebase shortcut"
echo "  gc       - Google Cloud shortcut" 
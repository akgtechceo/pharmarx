#!/bin/bash

# Google Cloud CLI Configuration Script for PharmaRx
# This script helps configure Google Cloud CLI for Firebase development

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

echo "🔧 Google Cloud CLI Configuration for PharmaRx"
echo "=============================================="
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    print_error "Google Cloud CLI is not installed!"
    print_status "Run the devcontainer setup first: .devcontainer/setup.sh"
    exit 1
fi

# Authentication
print_status "Step 1: Authentication"
if gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    ACTIVE_ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format="value(account)")
    print_success "Already authenticated as: $ACTIVE_ACCOUNT"
    
    read -p "Do you want to authenticate with a different account? (y/N): " auth_choice
    if [[ $auth_choice == "y" || $auth_choice == "Y" ]]; then
        gcloud auth login --no-launch-browser
    fi
else
    print_warning "Not authenticated with Google Cloud"
    print_status "Starting authentication process..."
    gcloud auth login --no-launch-browser
fi

echo ""

# Project Selection/Creation
print_status "Step 2: Project Configuration"

# List existing projects
print_status "Available Google Cloud Projects:"
gcloud projects list --format="table(projectId,name,projectNumber)" || true

echo ""
read -p "Enter your Google Cloud Project ID (or 'new' to create one): " PROJECT_ID

if [[ $PROJECT_ID == "new" ]]; then
    print_status "Creating a new Google Cloud Project..."
    read -p "Enter project ID for new project: " NEW_PROJECT_ID
    read -p "Enter project name: " PROJECT_NAME
    
    gcloud projects create $NEW_PROJECT_ID --name="$PROJECT_NAME"
    PROJECT_ID=$NEW_PROJECT_ID
    print_success "Project created: $PROJECT_ID"
fi

# Set the default project
gcloud config set project $PROJECT_ID
print_success "Set default project to: $PROJECT_ID"

echo ""

# Enable necessary APIs
print_status "Step 3: Enabling Required APIs"
print_status "Enabling APIs for Firebase and PharmaRx development..."

APIS=(
    "firebase.googleapis.com"
    "firestore.googleapis.com"
    "cloudfunctions.googleapis.com"
    "cloudresourcemanager.googleapis.com"
    "serviceusage.googleapis.com"
    "identitytoolkit.googleapis.com"
    "securetoken.googleapis.com"
    "cloudkms.googleapis.com" 
    "cloudbuild.googleapis.com"
    "container.googleapis.com"
)

for api in "${APIS[@]}"; do
    print_status "Enabling $api..."
    gcloud services enable $api --quiet
done

print_success "Required APIs enabled"

echo ""

# Configure Application Default Credentials
print_status "Step 4: Application Default Credentials"
print_status "Setting up Application Default Credentials for local development..."
gcloud auth application-default login --no-launch-browser

echo ""

# Firebase CLI Integration
print_status "Step 5: Firebase Integration"

# Check if Firebase CLI is available
if command -v firebase &> /dev/null; then
    print_status "Logging into Firebase CLI..."
    firebase login --no-localhost
    
    print_status "Setting Firebase project..."
    firebase use $PROJECT_ID --add
    
    print_success "Firebase CLI configured with project: $PROJECT_ID"
else
    print_warning "Firebase CLI not found - will be handled by npm global install"
fi

echo ""

# Update Terraform configuration
print_status "Step 6: Terraform Configuration"
TERRAFORM_VARS="infra/terraform/terraform.tfvars"

if [ -f "$TERRAFORM_VARS" ]; then
    print_status "Updating Terraform configuration..."
    
    # Backup existing file
    cp "$TERRAFORM_VARS" "$TERRAFORM_VARS.backup"
    
    # Update project ID in terraform.tfvars
    sed -i "s/your-main-gcp-project-id/$PROJECT_ID/g" "$TERRAFORM_VARS"
    
    print_success "Terraform configuration updated"
    print_warning "Please review and complete: $TERRAFORM_VARS"
else
    print_warning "Terraform variables file not found"
    print_status "Copy infra/terraform/terraform.tfvars.example to terraform.tfvars"
fi

echo ""

# Configuration Summary
print_success "🎉 Google Cloud CLI Configuration Complete!"
echo ""
print_status "📋 Configuration Summary:"
echo "  ✅ Project ID: $PROJECT_ID"
echo "  ✅ Authentication: $(gcloud config get-value account)"
echo "  ✅ Default Region: $(gcloud config get-value compute/region || echo 'Not set')"
echo "  ✅ APIs: Enabled for Firebase development"
echo ""

print_status "🚀 Next Steps:"
echo "  1. Review Terraform configuration: $TERRAFORM_VARS"
echo "  2. Set default region: gcloud config set compute/region us-central1"
echo "  3. Run Firebase setup: ./infra/scripts/setup-firebase.sh"
echo "  4. Initialize Terraform: cd infra/terraform && terraform init"
echo ""

print_status "🔧 Useful Commands:"
echo "  gcloud config list              - Show current configuration"
echo "  gcloud projects list            - List your projects"
echo "  gcloud auth list                - Show authenticated accounts"
echo "  firebase projects:list          - List Firebase projects"
echo "  terraform plan                  - Review infrastructure changes"
echo "" 
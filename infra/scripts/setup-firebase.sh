#!/bin/bash

# PharmaRx Firebase Setup Script
# This script automates Firebase project creation and configuration

set -e  # Exit on any error

echo "🚀 PharmaRx Firebase Setup Script"
echo "=================================="

# Check required tools
check_dependencies() {
    echo "📋 Checking dependencies..."
    
    if ! command -v terraform &> /dev/null; then
        echo "❌ Terraform is not installed. Please install Terraform first."
        exit 1
    fi
    
    if ! command -v firebase &> /dev/null; then
        echo "❌ Firebase CLI is not installed. Please run: npm install -g firebase-tools"
        exit 1
    fi
    
    if ! command -v gcloud &> /dev/null; then
        echo "❌ Google Cloud CLI is not installed. Please install gcloud first."
        exit 1
    fi
    
    echo "✅ All dependencies are installed"
}

# Authenticate with Google Cloud and Firebase
authenticate() {
    echo "🔐 Authenticating with Google Cloud and Firebase..."
    
    # Check if already authenticated
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
        echo "Please authenticate with Google Cloud:"
        gcloud auth login
        gcloud auth application-default login
    fi
    
    # Set default project if not set
    if ! gcloud config get-value project &> /dev/null; then
        echo "Please set your default GCP project:"
        read -p "Enter your main GCP project ID: " main_project
        gcloud config set project "$main_project"
    fi
    
    # Firebase authentication
    if ! firebase projects:list &> /dev/null; then
        echo "Please authenticate with Firebase:"
        firebase login
    fi
    
    echo "✅ Authentication complete"
}

# Setup Terraform backend
setup_terraform_backend() {
    echo "🏗️  Setting up Terraform backend..."
    
    local main_project=$(gcloud config get-value project)
    local bucket_name="pharmarx-terraform-state"
    
    # Create bucket if it doesn't exist
    if ! gsutil ls -b gs://"$bucket_name" &> /dev/null; then
        echo "Creating Terraform state bucket..."
        gsutil mb gs://"$bucket_name"
        gsutil versioning set on gs://"$bucket_name"
        echo "✅ Terraform state bucket created"
    else
        echo "✅ Terraform state bucket already exists"
    fi
}

# Initialize Terraform
init_terraform() {
    echo "🔧 Initializing Terraform..."
    
    cd "$(dirname "$0")/../terraform"
    
    # Check if terraform.tfvars exists
    if [ ! -f "terraform.tfvars" ]; then
        echo "❌ terraform.tfvars not found. Please copy terraform.tfvars.example to terraform.tfvars and configure it."
        exit 1
    fi
    
    terraform init
    echo "✅ Terraform initialized"
}

# Plan and apply Terraform
deploy_infrastructure() {
    local environment=${1:-dev}
    
    echo "🚀 Deploying infrastructure for environment: $environment"
    
    cd "$(dirname "$0")/../terraform"
    
    # Plan
    terraform plan -var="environment=$environment"
    
    # Ask for confirmation
    read -p "Do you want to apply these changes? (y/N): " confirm
    if [[ $confirm =~ ^[Yy]$ ]]; then
        terraform apply -var="environment=$environment" -auto-approve
        echo "✅ Infrastructure deployed successfully"
    else
        echo "❌ Deployment cancelled"
        exit 1
    fi
}

# Generate environment files
generate_env_files() {
    local environment=${1:-dev}
    
    echo "📝 Generating environment configuration files..."
    
    cd "$(dirname "$0")/../terraform"
    
    # Get Terraform outputs
    local frontend_config=$(terraform output -json frontend_env_vars)
    local backend_config=$(terraform output -json backend_env_vars)
    
    # Create frontend .env file
    echo "# Generated Firebase configuration for $environment" > "../../apps/web/.env.$environment"
    echo "$frontend_config" | jq -r 'to_entries[] | "\(.key)=\(.value)"' >> "../../apps/web/.env.$environment"
    
    # Create backend .env file
    echo "# Generated Firebase configuration for $environment" > "../../apps/api/.env.$environment"
    echo "$backend_config" | jq -r 'to_entries[] | "\(.key)=\(.value)"' >> "../../apps/api/.env.$environment"
    
    echo "✅ Environment files generated:"
    echo "   - apps/web/.env.$environment"
    echo "   - apps/api/.env.$environment"
}

# Deploy Firestore rules
deploy_firestore_rules() {
    local environment=${1:-dev}
    
    echo "🔥 Deploying Firestore security rules..."
    
    cd "$(dirname "$0")/../.."
    
    # Get project ID from Terraform
    local project_id=$(cd infra/terraform && terraform output -raw current_project_id)
    
    # Deploy rules
    firebase use "$project_id"
    firebase deploy --only firestore:rules
    
    echo "✅ Firestore rules deployed"
}

# Setup Firebase emulators for development
setup_emulators() {
    echo "🧪 Setting up Firebase emulators..."
    
    cd "$(dirname "$0")/../.."
    
    # Initialize Firebase if not already done
    if [ ! -f "firebase.json" ]; then
        echo "Initializing Firebase project..."
        firebase init emulators
    fi
    
    echo "✅ Firebase emulators configured"
    echo "Run 'firebase emulators:start' to start the emulators"
}

# Main menu
main_menu() {
    echo ""
    echo "Select an option:"
    echo "1) Full setup (recommended for first time)"
    echo "2) Deploy infrastructure only"
    echo "3) Generate environment files"
    echo "4) Deploy Firestore rules"
    echo "5) Setup emulators"
    echo "6) Exit"
    
    read -p "Enter your choice (1-6): " choice
    
    case $choice in
        1)
            environment_menu "full"
            ;;
        2)
            environment_menu "infrastructure"
            ;;
        3)
            environment_menu "env"
            ;;
        4)
            environment_menu "rules"
            ;;
        5)
            setup_emulators
            ;;
        6)
            echo "👋 Goodbye!"
            exit 0
            ;;
        *)
            echo "❌ Invalid choice"
            main_menu
            ;;
    esac
}

# Environment selection menu
environment_menu() {
    local action=$1
    
    echo ""
    echo "Select environment:"
    echo "1) Development"
    echo "2) Staging"
    echo "3) Production"
    
    read -p "Enter your choice (1-3): " env_choice
    
    case $env_choice in
        1) environment="dev" ;;
        2) environment="staging" ;;
        3) environment="prod" ;;
        *)
            echo "❌ Invalid choice"
            environment_menu "$action"
            return
            ;;
    esac
    
    case $action in
        "full")
            authenticate
            setup_terraform_backend
            init_terraform
            deploy_infrastructure "$environment"
            generate_env_files "$environment"
            deploy_firestore_rules "$environment"
            setup_emulators
            echo "🎉 Full setup completed for $environment environment!"
            ;;
        "infrastructure")
            deploy_infrastructure "$environment"
            ;;
        "env")
            generate_env_files "$environment"
            ;;
        "rules")
            deploy_firestore_rules "$environment"
            ;;
    esac
}

# Main execution
main() {
    check_dependencies
    main_menu
}

# Run main function
main "$@" 
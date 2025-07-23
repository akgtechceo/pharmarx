# PharmaRx Firebase Setup Script (PowerShell)
# This script automates Firebase project creation and configuration on Windows

$ErrorActionPreference = "Stop"

Write-Host "🚀 PharmaRx Firebase Setup Script (PowerShell)" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green

# Check required tools
function Test-Dependencies {
    Write-Host "📋 Checking dependencies..." -ForegroundColor Yellow
    
    $missingTools = @()
    
    if (-not (Get-Command terraform -ErrorAction SilentlyContinue)) {
        $missingTools += "Terraform"
    }
    
    if (-not (Get-Command firebase -ErrorAction SilentlyContinue)) {
        $missingTools += "Firebase CLI (npm install -g firebase-tools)"
    }
    
    if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
        $missingTools += "Google Cloud CLI"
    }
    
    if (-not (Get-Command jq -ErrorAction SilentlyContinue)) {
        Write-Host "⚠️  jq is not installed. Installing via chocolatey..." -ForegroundColor Yellow
        if (Get-Command choco -ErrorAction SilentlyContinue) {
            choco install jq -y
        } else {
            $missingTools += "jq (install via chocolatey: choco install jq)"
        }
    }
    
    if ($missingTools.Count -gt 0) {
        Write-Host "❌ Missing dependencies:" -ForegroundColor Red
        $missingTools | ForEach-Object { Write-Host "   - $_" -ForegroundColor Red }
        exit 1
    }
    
    Write-Host "✅ All dependencies are installed" -ForegroundColor Green
}

# Authenticate with Google Cloud and Firebase
function Initialize-Authentication {
    Write-Host "🔐 Authenticating with Google Cloud and Firebase..." -ForegroundColor Yellow
    
    # Check if already authenticated
    $activeAccount = gcloud auth list --filter="status:ACTIVE" --format="value(account)" 2>$null
    if (-not $activeAccount) {
        Write-Host "Please authenticate with Google Cloud:" -ForegroundColor Cyan
        gcloud auth login
        gcloud auth application-default login
    }
    
    # Set default project if not set
    $currentProject = gcloud config get-value project 2>$null
    if (-not $currentProject) {
        Write-Host "Please set your default GCP project:" -ForegroundColor Cyan
        $mainProject = Read-Host "Enter your main GCP project ID"
        gcloud config set project $mainProject
    }
    
    # Firebase authentication
    $firebaseProjects = firebase projects:list 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Please authenticate with Firebase:" -ForegroundColor Cyan
        firebase login
    }
    
    Write-Host "✅ Authentication complete" -ForegroundColor Green
}

# Setup Terraform backend
function Initialize-TerraformBackend {
    Write-Host "🏗️  Setting up Terraform backend..." -ForegroundColor Yellow
    
    $mainProject = gcloud config get-value project
    $bucketName = "pharmarx-terraform-state"
    
    # Check if bucket exists
    $bucketExists = gsutil ls -b "gs://$bucketName" 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Creating Terraform state bucket..." -ForegroundColor Cyan
        gsutil mb "gs://$bucketName"
        gsutil versioning set on "gs://$bucketName"
        Write-Host "✅ Terraform state bucket created" -ForegroundColor Green
    } else {
        Write-Host "✅ Terraform state bucket already exists" -ForegroundColor Green
    }
}

# Initialize Terraform
function Initialize-Terraform {
    Write-Host "🔧 Initializing Terraform..." -ForegroundColor Yellow
    
    $scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
    $terraformPath = Join-Path $scriptPath "../terraform"
    Push-Location $terraformPath
    
    try {
        # Check if terraform.tfvars exists
        if (-not (Test-Path "terraform.tfvars")) {
            Write-Host "❌ terraform.tfvars not found. Please copy terraform.tfvars.example to terraform.tfvars and configure it." -ForegroundColor Red
            exit 1
        }
        
        terraform init
        Write-Host "✅ Terraform initialized" -ForegroundColor Green
    }
    finally {
        Pop-Location
    }
}

# Plan and apply Terraform
function Deploy-Infrastructure {
    param(
        [string]$Environment = "dev"
    )
    
    Write-Host "🚀 Deploying infrastructure for environment: $Environment" -ForegroundColor Yellow
    
    $scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
    $terraformPath = Join-Path $scriptPath "../terraform"
    Push-Location $terraformPath
    
    try {
        # Plan
        terraform plan -var="environment=$Environment"
        
        # Ask for confirmation
        $confirm = Read-Host "Do you want to apply these changes? (y/N)"
        if ($confirm -match '^[Yy]$') {
            terraform apply -var="environment=$Environment" -auto-approve
            Write-Host "✅ Infrastructure deployed successfully" -ForegroundColor Green
        } else {
            Write-Host "❌ Deployment cancelled" -ForegroundColor Red
            exit 1
        }
    }
    finally {
        Pop-Location
    }
}

# Generate environment files
function New-EnvironmentFiles {
    param(
        [string]$Environment = "dev"
    )
    
    Write-Host "📝 Generating environment configuration files..." -ForegroundColor Yellow
    
    $scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
    $terraformPath = Join-Path $scriptPath "../terraform"
    $webEnvPath = Join-Path $scriptPath "../../apps/web/.env.$Environment"
    $apiEnvPath = Join-Path $scriptPath "../../apps/api/.env.$Environment"
    
    Push-Location $terraformPath
    
    try {
        # Get Terraform outputs
        $frontendConfig = terraform output -json frontend_env_vars | ConvertFrom-Json
        $backendConfig = terraform output -json backend_env_vars | ConvertFrom-Json
        
        # Create frontend .env file
        "# Generated Firebase configuration for $Environment" | Out-File -FilePath $webEnvPath -Encoding UTF8
        $frontendConfig.PSObject.Properties | ForEach-Object {
            "$($_.Name)=$($_.Value)" | Out-File -FilePath $webEnvPath -Append -Encoding UTF8
        }
        
        # Create backend .env file
        "# Generated Firebase configuration for $Environment" | Out-File -FilePath $apiEnvPath -Encoding UTF8
        $backendConfig.PSObject.Properties | ForEach-Object {
            "$($_.Name)=$($_.Value)" | Out-File -FilePath $apiEnvPath -Append -Encoding UTF8
        }
        
        Write-Host "✅ Environment files generated:" -ForegroundColor Green
        Write-Host "   - apps/web/.env.$Environment" -ForegroundColor Cyan
        Write-Host "   - apps/api/.env.$Environment" -ForegroundColor Cyan
    }
    finally {
        Pop-Location
    }
}

# Deploy Firestore rules
function Deploy-FirestoreRules {
    param(
        [string]$Environment = "dev"
    )
    
    Write-Host "🔥 Deploying Firestore security rules..." -ForegroundColor Yellow
    
    $scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
    $projectPath = Join-Path $scriptPath "../.."
    $terraformPath = Join-Path $scriptPath "../terraform"
    
    Push-Location $projectPath
    
    try {
        # Get project ID from Terraform
        Push-Location $terraformPath
        $projectId = terraform output -raw current_project_id
        Pop-Location
        
        # Deploy rules
        firebase use $projectId
        firebase deploy --only firestore:rules
        
        Write-Host "✅ Firestore rules deployed" -ForegroundColor Green
    }
    finally {
        Pop-Location
    }
}

# Setup Firebase emulators for development
function Initialize-Emulators {
    Write-Host "🧪 Setting up Firebase emulators..." -ForegroundColor Yellow
    
    $scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
    $projectPath = Join-Path $scriptPath "../.."
    Push-Location $projectPath
    
    try {
        # Initialize Firebase if not already done
        if (-not (Test-Path "firebase.json")) {
            Write-Host "Initializing Firebase project..." -ForegroundColor Cyan
            firebase init emulators
        }
        
        Write-Host "✅ Firebase emulators configured" -ForegroundColor Green
        Write-Host "Run 'firebase emulators:start' to start the emulators" -ForegroundColor Cyan
    }
    finally {
        Pop-Location
    }
}

# Main menu
function Show-MainMenu {
    Write-Host ""
    Write-Host "Select an option:" -ForegroundColor Cyan
    Write-Host "1) Full setup (recommended for first time)" -ForegroundColor White
    Write-Host "2) Deploy infrastructure only" -ForegroundColor White
    Write-Host "3) Generate environment files" -ForegroundColor White
    Write-Host "4) Deploy Firestore rules" -ForegroundColor White
    Write-Host "5) Setup emulators" -ForegroundColor White
    Write-Host "6) Exit" -ForegroundColor White
    
    $choice = Read-Host "Enter your choice (1-6)"
    
    switch ($choice) {
        1 { Show-EnvironmentMenu -Action "full" }
        2 { Show-EnvironmentMenu -Action "infrastructure" }
        3 { Show-EnvironmentMenu -Action "env" }
        4 { Show-EnvironmentMenu -Action "rules" }
        5 { Initialize-Emulators }
        6 { 
            Write-Host "👋 Goodbye!" -ForegroundColor Green
            exit 0
        }
        default {
            Write-Host "❌ Invalid choice" -ForegroundColor Red
            Show-MainMenu
        }
    }
}

# Environment selection menu
function Show-EnvironmentMenu {
    param(
        [string]$Action
    )
    
    Write-Host ""
    Write-Host "Select environment:" -ForegroundColor Cyan
    Write-Host "1) Development" -ForegroundColor White
    Write-Host "2) Staging" -ForegroundColor White
    Write-Host "3) Production" -ForegroundColor White
    
    $envChoice = Read-Host "Enter your choice (1-3)"
    
    $environment = switch ($envChoice) {
        1 { "dev" }
        2 { "staging" }
        3 { "prod" }
        default {
            Write-Host "❌ Invalid choice" -ForegroundColor Red
            Show-EnvironmentMenu -Action $Action
            return
        }
    }
    
    switch ($Action) {
        "full" {
            Initialize-Authentication
            Initialize-TerraformBackend
            Initialize-Terraform
            Deploy-Infrastructure -Environment $environment
            New-EnvironmentFiles -Environment $environment
            Deploy-FirestoreRules -Environment $environment
            Initialize-Emulators
            Write-Host "🎉 Full setup completed for $environment environment!" -ForegroundColor Green
        }
        "infrastructure" {
            Deploy-Infrastructure -Environment $environment
        }
        "env" {
            New-EnvironmentFiles -Environment $environment
        }
        "rules" {
            Deploy-FirestoreRules -Environment $environment
        }
    }
}

# Main execution
function Main {
    Test-Dependencies
    Show-MainMenu
}

# Run main function
Main 
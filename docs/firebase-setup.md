# Firebase Project Creation & Configuration Guide

This guide walks you through setting up Firebase projects for the **PharmaRx** application using Infrastructure-as-Code (Terraform) and automated setup scripts.

## 🏗️ Architecture Overview

Our Firebase setup creates **three separate projects** for isolation and security:

- **pharmarx-dev-XXXX**: Development environment with emulators
- **pharmarx-staging-XXXX**: Staging environment for pre-production testing  
- **pharmarx-prod-XXXX**: Production environment for live users

Each project includes:
- 🔥 **Firestore Database**: NoSQL document database
- 🔐 **Firebase Authentication**: Multi-role user authentication
- 📁 **Cloud Storage**: File storage for prescription images
- 🚀 **Firebase Hosting**: Frontend hosting with global CDN
- ⚡ **Cloud Functions**: Serverless backend API
- 👁️ **Cloud Vision API**: OCR for prescription processing

## 📋 Prerequisites

### Required Tools

1. **Google Cloud CLI** ([Install Guide](https://cloud.google.com/sdk/docs/install))
   ```bash
   gcloud --version
   ```

2. **Firebase CLI** 
   ```bash
   npm install -g firebase-tools
   firebase --version
   ```

3. **Terraform** ([Install Guide](https://developer.hashicorp.com/terraform/install))
   ```bash
   terraform --version
   ```

4. **jq** (JSON processor)
   ```bash
   # macOS
   brew install jq
   # Windows (Chocolatey)
   choco install jq
   # Linux
   apt-get install jq
   ```

### Google Cloud Setup

1. **Create or Select a Main GCP Project**:
   ```bash
   gcloud projects create your-main-project-id
   gcloud config set project your-main-project-id
   ```

2. **Enable Billing**:
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Enable billing for your project
   - Note your **Billing Account ID** (format: `XXXXXX-YYYYYY-ZZZZZZ`)

3. **Authenticate**:
   ```bash
   gcloud auth login
   gcloud auth application-default login
   firebase login
   ```

## 🚀 Quick Setup (Recommended)

### 1. Configure Terraform Variables

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars`:
```hcl
# Your configuration
project_id         = "your-main-gcp-project-id"
billing_account_id = "XXXXXX-YYYYYY-ZZZZZZ"
region            = "us-central1"
environment       = "dev"

# Notification email for alerts
notification_email = "your-email@example.com"

# CORS origins (add your domains)
cors_allowed_origins = [
  "http://localhost:5173",
  "https://your-domain.com"
]
```

### 2. Run Automated Setup

**Linux/macOS**:
```bash
chmod +x infra/scripts/setup-firebase.sh
./infra/scripts/setup-firebase.sh
```

**Windows PowerShell**:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\infra\scripts\setup-firebase.ps1
```

### 3. Select Setup Options

The script will guide you through:
1. **Full setup** (recommended for first time)
2. Deploy infrastructure only
3. Generate environment files  
4. Deploy Firestore rules
5. Setup emulators

## 🔧 Manual Setup (Advanced)

### Step 1: Initialize Terraform Backend

```bash
# Create Terraform state bucket
gsutil mb gs://pharmarx-terraform-state
gsutil versioning set on gs://pharmarx-terraform-state

cd infra/terraform
terraform init
```

### Step 2: Deploy Infrastructure

```bash
# Plan deployment
terraform plan -var="environment=dev"

# Apply changes
terraform apply -var="environment=dev" -auto-approve
```

### Step 3: Generate Environment Files

```bash
# Get Terraform outputs
terraform output -json frontend_env_vars > frontend_config.json
terraform output -json backend_env_vars > backend_config.json

# Generate .env files (using jq)
jq -r 'to_entries[] | "\(.key)=\(.value)"' frontend_config.json > ../../apps/web/.env.dev
jq -r 'to_entries[] | "\(.key)=\(.value)"' backend_config.json > ../../apps/api/.env.dev
```

### Step 4: Deploy Firestore Rules

```bash
cd ../..  # Back to project root

# Get project ID from Terraform
PROJECT_ID=$(cd infra/terraform && terraform output -raw current_project_id)

# Use project and deploy rules
firebase use $PROJECT_ID
firebase deploy --only firestore:rules
```

### Step 5: Setup Development Emulators

```bash
# Initialize Firebase emulators
firebase init emulators

# Start emulators
firebase emulators:start
```

## 📁 Generated Files

After successful setup, you'll have:

```
apps/web/.env.dev          # Frontend environment variables
apps/api/.env.dev          # Backend environment variables
firebase.json              # Firebase configuration
.firebaserc               # Firebase project settings
```

## 🌍 Multi-Environment Setup

### Development Environment
```bash
./infra/scripts/setup-firebase.sh
# Select: Full setup → Development
```

### Staging Environment
```bash
cd infra/terraform
terraform apply -var="environment=staging" -auto-approve
```

### Production Environment
```bash
cd infra/terraform
terraform apply -var="environment=prod" -auto-approve
```

## 🧪 Firebase Emulators

### Start Emulators
```bash
firebase emulators:start
```

### Emulator Ports
- **Authentication**: http://localhost:9099
- **Firestore**: http://localhost:8080  
- **Firebase Hosting**: http://localhost:5000
- **Cloud Functions**: http://localhost:5001

### Frontend Configuration
```typescript
// Automatically connects to emulators in development
const isEmulator = import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true'
```

### Backend Configuration
```typescript
// Uses FIRESTORE_EMULATOR_HOST environment variable
const firestoreEmulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
```

## 🔐 Security Configuration

### Firestore Security Rules
Located in `firestore.rules`:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null 
                         && request.auth.uid == userId;
    }
  }
}
```

### CORS Configuration
Configure allowed origins in `terraform.tfvars`:
```hcl
cors_allowed_origins = [
  "http://localhost:5173",    # Development
  "https://staging.pharmc.app", # Staging
  "https://app.pharmc.app"    # Production  
]
```

## 📊 Monitoring & Alerts

### Cloud Monitoring
- **Error Rate Alerts**: Triggers at >5% error rate
- **Performance Monitoring**: Tracks function execution times
- **Uptime Monitoring**: Monitors API endpoints

### Log Aggregation
```bash
# View Cloud Function logs
gcloud functions logs read pharmarx-api-dev --limit 50

# View Firestore logs  
gcloud logging read "resource.type=firestore_database" --limit 10
```

## 🐛 Troubleshooting

### Common Issues

#### 1. "Project ID already exists"
**Solution**: Terraform adds random suffix to prevent conflicts. Check outputs:
```bash
terraform output firebase_project_ids
```

#### 2. "Billing account not found"
**Solution**: Verify billing account ID:
```bash
gcloud billing accounts list
```

#### 3. "Insufficient permissions"
**Solution**: Enable required APIs:
```bash
gcloud services enable firebase.googleapis.com
gcloud services enable firestore.googleapis.com
gcloud services enable cloudfunctions.googleapis.com
```

#### 4. "Emulator connection failed"
**Solution**: Check if emulators are running:
```bash
firebase emulators:start --only firestore,auth
```

#### 5. "Environment variables not loaded"
**Solution**: Verify .env files exist and are properly formatted:
```bash
cat apps/web/.env.dev
cat apps/api/.env.dev
```

### Debug Commands

```bash
# Check Firebase projects
firebase projects:list

# Verify Terraform state
terraform show

# Test Firestore connection
firebase firestore:data

# Check emulator status
curl http://localhost:4400/emulators
```

## 🔄 CI/CD Integration

### GitHub Actions Setup

1. **Add Repository Secrets**:
   ```
   FIREBASE_PROJECT_ID_DEV     = "pharmarx-dev-XXXX"
   FIREBASE_PROJECT_ID_STAGING = "pharmarx-staging-XXXX"  
   FIREBASE_PROJECT_ID_PROD    = "pharmarx-prod-XXXX"
   GCP_SERVICE_ACCOUNT_KEY     = "base64-encoded-key"
   ```

2. **Deploy Workflow**:
   ```yaml
   - name: Deploy to Firebase
     run: |
       echo $GCP_SERVICE_ACCOUNT_KEY | base64 -d > gcp-key.json
       export GOOGLE_APPLICATION_CREDENTIALS=gcp-key.json
       firebase use $FIREBASE_PROJECT_ID_PROD
       firebase deploy
   ```

## 📚 Additional Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Terraform Google Provider](https://registry.terraform.io/providers/hashicorp/google/latest/docs)
- [Google Cloud Functions](https://cloud.google.com/functions/docs)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)

## 🆘 Support

If you encounter issues:

1. **Check the logs**: `firebase emulators:start --debug`
2. **Verify configuration**: Run setup script in debug mode
3. **Consult documentation**: Links provided above
4. **Create an issue**: Include logs and configuration details

---

**Next Steps**: Once Firebase is configured, proceed to [API Development Guide](./api-development.md) and [Frontend Setup Guide](./frontend-setup.md). 
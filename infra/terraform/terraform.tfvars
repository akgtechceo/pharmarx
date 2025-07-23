# PharmaRx Terraform Configuration Example
# Copy this file to terraform.tfvars and update the values

# Google Cloud Project Configuration
project_id         = "your-main-gcp-project-id"
billing_account_id = "XXXXXX-YYYYYY-ZZZZZZ"  # Your GCP billing account ID
region            = "us-central1"

# Firebase Configuration
firestore_location = "us-central"  # Choose: us-central, us-east1, europe-west1, asia-northeast1
storage_location   = "US"          # Choose: US, EU, ASIA

# Environment
environment = "dev"  # dev, staging, or prod

# Security Configuration
cors_allowed_origins = [
  "http://localhost:5173",    # Vite dev server
  "http://localhost:3000",    # Alternative dev port
  "https://your-domain.com"   # Production domain
]

# Development Configuration
firebase_emulator_enabled = true

# Monitoring Configuration
enable_monitoring  = true
notification_email = "your-email@example.com"

# Example production values:
# environment = "prod"
# cors_allowed_origins = [
#   "https://app.pharmc.app",
#   "https://pharmc.app"
# ]
# firebase_emulator_enabled = false 
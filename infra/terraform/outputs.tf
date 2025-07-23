# Terraform Outputs for PharmaRx Infrastructure
# These outputs provide configuration values for application deployment

# Project Information
output "firebase_project_ids" {
  description = "Firebase project IDs for each environment"
  value = {
    dev     = google_project.pharmarx_dev.project_id
    staging = google_project.pharmarx_staging.project_id
    prod    = google_project.pharmarx_prod.project_id
  }
}

output "current_project_id" {
  description = "Current environment Firebase project ID"
  value = var.environment == "prod" ? google_project.pharmarx_prod.project_id : (var.environment == "staging" ? google_project.pharmarx_staging.project_id : google_project.pharmarx_dev.project_id)
}

# Firebase Web App Configurations
output "firebase_web_config_dev" {
  description = "Firebase web app configuration for development"
  value = {
    apiKey            = data.google_firebase_web_app_config.pharmarx_web_dev.api_key
    authDomain        = data.google_firebase_web_app_config.pharmarx_web_dev.auth_domain
    projectId         = google_project.pharmarx_dev.project_id
    storageBucket     = "${google_project.pharmarx_dev.project_id}.appspot.com"
    messagingSenderId = data.google_firebase_web_app_config.pharmarx_web_dev.messaging_sender_id
    appId             = data.google_firebase_web_app_config.pharmarx_web_dev.app_id
  }
}

output "firebase_web_config_staging" {
  description = "Firebase web app configuration for staging"
  value = {
    apiKey            = data.google_firebase_web_app_config.pharmarx_web_staging.api_key
    authDomain        = data.google_firebase_web_app_config.pharmarx_web_staging.auth_domain
    projectId         = google_project.pharmarx_staging.project_id
    storageBucket     = "${google_project.pharmarx_staging.project_id}.appspot.com"
    messagingSenderId = data.google_firebase_web_app_config.pharmarx_web_staging.messaging_sender_id
    appId             = data.google_firebase_web_app_config.pharmarx_web_staging.app_id
  }
}

output "firebase_web_config_prod" {
  description = "Firebase web app configuration for production"
  value = {
    apiKey            = data.google_firebase_web_app_config.pharmarx_web_prod.api_key
    authDomain        = data.google_firebase_web_app_config.pharmarx_web_prod.auth_domain
    projectId         = google_project.pharmarx_prod.project_id
    storageBucket     = "${google_project.pharmarx_prod.project_id}.appspot.com"
    messagingSenderId = data.google_firebase_web_app_config.pharmarx_web_prod.messaging_sender_id
    appId             = data.google_firebase_web_app_config.pharmarx_web_prod.app_id
  }
}

# Service Account Information
output "service_account_emails" {
  description = "Service account emails for each environment"
  value = {
    dev     = google_service_account.pharmarx_backend_dev.email
    staging = google_service_account.pharmarx_backend_staging.email
    prod    = google_service_account.pharmarx_backend_prod.email
  }
}

# Service Account Keys (Base64 encoded)
output "service_account_keys" {
  description = "Service account keys for backend authentication"
  sensitive   = true
  value = {
    dev     = google_service_account_key.pharmarx_backend_dev_key.private_key
    staging = google_service_account_key.pharmarx_backend_staging_key.private_key
    prod    = google_service_account_key.pharmarx_backend_prod_key.private_key
  }
}

# Storage Bucket Names
output "storage_buckets" {
  description = "Cloud Storage bucket names for file uploads"
  value = {
    uploads_dev     = google_storage_bucket.pharmarx_uploads_dev.name
    uploads_staging = google_storage_bucket.pharmarx_uploads_staging.name
    uploads_prod    = google_storage_bucket.pharmarx_uploads_prod.name
    functions       = google_storage_bucket.pharmarx_functions.name
  }
}

# Cloud Functions URLs
output "api_urls" {
  description = "API endpoint URLs for each environment"
  value = {
    dev     = "http://localhost:3001"  # Local development
    staging = var.environment == "staging" ? "https://${var.region}-${google_project.pharmarx_staging.project_id}.cloudfunctions.net/pharmarx-api-staging" : null
    prod    = var.environment == "prod" ? "https://${var.region}-${google_project.pharmarx_prod.project_id}.cloudfunctions.net/pharmarx-api-prod" : null
  }
}

# Firebase Hosting URLs
output "hosting_urls" {
  description = "Firebase Hosting URLs for each environment"
  value = {
    dev     = "http://localhost:5173"  # Local development
    staging = var.environment == "staging" ? "https://pharmarx-staging-web.web.app" : null
    prod    = var.environment == "prod" ? "https://pharmarx-prod-web.web.app" : null
  }
}

# Environment Variables for Applications
output "frontend_env_vars" {
  description = "Environment variables for frontend application"
  value = {
    VITE_FIREBASE_API_KEY             = var.environment == "prod" ? data.google_firebase_web_app_config.pharmarx_web_prod.api_key : (var.environment == "staging" ? data.google_firebase_web_app_config.pharmarx_web_staging.api_key : data.google_firebase_web_app_config.pharmarx_web_dev.api_key)
    VITE_FIREBASE_AUTH_DOMAIN         = var.environment == "prod" ? data.google_firebase_web_app_config.pharmarx_web_prod.auth_domain : (var.environment == "staging" ? data.google_firebase_web_app_config.pharmarx_web_staging.auth_domain : data.google_firebase_web_app_config.pharmarx_web_dev.auth_domain)
    VITE_FIREBASE_PROJECT_ID          = var.environment == "prod" ? google_project.pharmarx_prod.project_id : (var.environment == "staging" ? google_project.pharmarx_staging.project_id : google_project.pharmarx_dev.project_id)
    VITE_FIREBASE_STORAGE_BUCKET      = var.environment == "prod" ? "${google_project.pharmarx_prod.project_id}.appspot.com" : (var.environment == "staging" ? "${google_project.pharmarx_staging.project_id}.appspot.com" : "${google_project.pharmarx_dev.project_id}.appspot.com")
    VITE_FIREBASE_MESSAGING_SENDER_ID = var.environment == "prod" ? data.google_firebase_web_app_config.pharmarx_web_prod.messaging_sender_id : (var.environment == "staging" ? data.google_firebase_web_app_config.pharmarx_web_staging.messaging_sender_id : data.google_firebase_web_app_config.pharmarx_web_dev.messaging_sender_id)
    VITE_FIREBASE_APP_ID              = var.environment == "prod" ? data.google_firebase_web_app_config.pharmarx_web_prod.app_id : (var.environment == "staging" ? data.google_firebase_web_app_config.pharmarx_web_staging.app_id : data.google_firebase_web_app_config.pharmarx_web_dev.app_id)
    VITE_API_URL                      = var.environment == "dev" ? "http://localhost:3001" : (var.environment == "staging" ? "https://${var.region}-${google_project.pharmarx_staging.project_id}.cloudfunctions.net/pharmarx-api-staging" : "https://${var.region}-${google_project.pharmarx_prod.project_id}.cloudfunctions.net/pharmarx-api-prod")
  }
}

output "backend_env_vars" {
  description = "Environment variables for backend application"
  sensitive   = true
  value = {
    NODE_ENV                      = var.environment
    FIREBASE_PROJECT_ID          = var.environment == "prod" ? google_project.pharmarx_prod.project_id : (var.environment == "staging" ? google_project.pharmarx_staging.project_id : google_project.pharmarx_dev.project_id)
    FIREBASE_SERVICE_ACCOUNT_KEY = var.environment == "prod" ? google_service_account_key.pharmarx_backend_prod_key.private_key : (var.environment == "staging" ? google_service_account_key.pharmarx_backend_staging_key.private_key : google_service_account_key.pharmarx_backend_dev_key.private_key)
    CORS_ALLOWED_ORIGINS         = join(",", var.cors_allowed_origins)
    STORAGE_BUCKET_NAME          = var.environment == "prod" ? google_storage_bucket.pharmarx_uploads_prod.name : (var.environment == "staging" ? google_storage_bucket.pharmarx_uploads_staging.name : google_storage_bucket.pharmarx_uploads_dev.name)
  }
}

# Deployment Information
output "deployment_info" {
  description = "Deployment configuration information"
  value = {
    environment         = var.environment
    region             = var.region
    firestore_location = var.firestore_location
    storage_location   = var.storage_location
    monitoring_enabled = var.enable_monitoring
  }
} 
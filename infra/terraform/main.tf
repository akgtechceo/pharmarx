# PharmaRx Infrastructure - Google Cloud Platform
# This file contains the main infrastructure configuration

terraform {
  required_version = ">= 1.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.1"
    }
  }
  
  # Backend configuration for state management
  backend "gcs" {
    bucket = "pharmarx-terraform-state"
    prefix = "terraform/state"
  }
}

# Configure Google Cloud Provider
provider "google" {
  project = var.project_id
  region  = var.region
}

# Configure Google Beta Provider (required for Firebase resources)
provider "google-beta" {
  project = var.project_id
  region  = var.region
}

# Cloud Functions for API backend
resource "google_cloudfunctions_function" "pharmarx_api" {
  count = var.environment == "dev" ? 0 : 1  # Skip in dev for local development
  
  name        = "pharmarx-api-${var.environment}"
  description = "PharmaRx API Backend"
  runtime     = "nodejs20"
  
  available_memory_mb   = 256
  source_archive_bucket = google_storage_bucket.pharmarx_functions.name
  source_archive_object = google_storage_bucket_object.pharmarx_api_source.name
  trigger {
    https_trigger {
      url = "https://${var.region}-${var.project_id}.cloudfunctions.net/pharmarx-api-${var.environment}"
    }
  }
  
  entry_point = "app"
  
  environment_variables = {
    NODE_ENV                    = var.environment
    FIREBASE_PROJECT_ID        = var.environment == "prod" ? google_project.pharmarx_prod.project_id : (var.environment == "staging" ? google_project.pharmarx_staging.project_id : google_project.pharmarx_dev.project_id)
    CORS_ALLOWED_ORIGINS       = join(",", var.cors_allowed_origins)
  }
  
  depends_on = [
    google_project_service.apis,
    google_storage_bucket_object.pharmarx_api_source
  ]
}

# Cloud Storage bucket for Cloud Functions source code
resource "google_storage_bucket" "pharmarx_functions" {
  name     = "${var.project_id}-functions-source"
  location = var.storage_location
  
  uniform_bucket_level_access = true
  
  versioning {
    enabled = true
  }
}

# Placeholder for API source code (in real deployment, this would be uploaded by CI/CD)
resource "google_storage_bucket_object" "pharmarx_api_source" {
  name   = "pharmarx-api-${var.environment}-source.zip"
  bucket = google_storage_bucket.pharmarx_functions.name
  source = "../../apps/api/dist/api.zip"  # This would be created by build process
  
  # For now, create a placeholder
  content = "placeholder"
}

# Firebase Hosting for frontend deployment
resource "google_firebase_hosting_site" "pharmarx_web_dev" {
  count      = var.environment == "dev" ? 1 : 0
  provider   = google-beta
  project    = google_project.pharmarx_dev.project_id
  site_id    = "pharmarx-dev-web"
  
  depends_on = [google_project_service.apis]
}

resource "google_firebase_hosting_site" "pharmarx_web_staging" {
  count      = var.environment == "staging" ? 1 : 0
  provider   = google-beta
  project    = google_project.pharmarx_staging.project_id
  site_id    = "pharmarx-staging-web"
  
  depends_on = [google_project_service.apis]
}

resource "google_firebase_hosting_site" "pharmarx_web_prod" {
  count      = var.environment == "prod" ? 1 : 0
  provider   = google-beta
  project    = google_project.pharmarx_prod.project_id
  site_id    = "pharmarx-prod-web"
  
  depends_on = [google_project_service.apis]
}

# Cloud Monitoring for application performance
resource "google_monitoring_alert_policy" "high_error_rate" {
  count        = var.enable_monitoring ? 1 : 0
  display_name = "High Error Rate - ${var.environment}"
  combiner     = "OR"
  
  conditions {
    display_name = "Cloud Function Error Rate"
    
    condition_threshold {
      filter          = "resource.type=\"cloud_function\""
      comparison      = "COMPARISON_GT"
      threshold_value = 0.05  # 5% error rate
      duration        = "300s"
      
      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_RATE"
      }
    }
  }
  
  notification_channels = var.notification_email != "" ? [google_monitoring_notification_channel.email[0].id] : []
}

resource "google_monitoring_notification_channel" "email" {
  count        = var.enable_monitoring && var.notification_email != "" ? 1 : 0
  display_name = "Email Notification Channel"
  type         = "email"
  
  labels = {
    email_address = var.notification_email
  }
} 
# Firebase Project & Services Configuration
# This creates and configures Firebase projects for each environment

# Development Firebase Project
resource "google_project" "pharmarx_dev" {
  name            = "PharmaRx Development"
  project_id      = "pharmarx-dev-${random_id.project_suffix.hex}"
  billing_account = var.billing_account_id
  
  labels = {
    environment = "development"
    project     = "pharmarx"
  }
}

# Staging Firebase Project  
resource "google_project" "pharmarx_staging" {
  name            = "PharmaRx Staging"
  project_id      = "pharmarx-staging-${random_id.project_suffix.hex}"
  billing_account = var.billing_account_id
  
  labels = {
    environment = "staging"
    project     = "pharmarx"
  }
}

# Production Firebase Project
resource "google_project" "pharmarx_prod" {
  name            = "PharmaRx Production"
  project_id      = "pharmarx-prod-${random_id.project_suffix.hex}"
  billing_account = var.billing_account_id
  
  labels = {
    environment = "production"
    project     = "pharmarx"
  }
}

# Random suffix for unique project IDs
resource "random_id" "project_suffix" {
  byte_length = 4
}

# Enable required APIs for all environments
locals {
  projects = {
    dev     = google_project.pharmarx_dev.project_id
    staging = google_project.pharmarx_staging.project_id 
    prod    = google_project.pharmarx_prod.project_id
  }
  
  required_apis = [
    "firebase.googleapis.com",
    "firestore.googleapis.com", 
    "cloudfunctions.googleapis.com",
    "cloudvision.googleapis.com",
    "storage.googleapis.com",
    "identitytoolkit.googleapis.com",
    "iam.googleapis.com"
  ]
}

# Enable APIs for each project
resource "google_project_service" "apis" {
  for_each = {
    for pair in setproduct(keys(local.projects), local.required_apis) :
    "${pair[0]}-${replace(pair[1], ".", "-")}" => {
      project = local.projects[pair[0]]
      service = pair[1]
    }
  }
  
  project = each.value.project
  service = each.value.service
  
  disable_dependent_services = true
}

# Firebase Web Apps
resource "google_firebase_web_app" "pharmarx_web_dev" {
  provider     = google-beta
  project      = google_project.pharmarx_dev.project_id
  display_name = "PharmaRx Web App (Development)"
  
  depends_on = [google_project_service.apis]
}

resource "google_firebase_web_app" "pharmarx_web_staging" {
  provider     = google-beta
  project      = google_project.pharmarx_staging.project_id
  display_name = "PharmaRx Web App (Staging)"
  
  depends_on = [google_project_service.apis]
}

resource "google_firebase_web_app" "pharmarx_web_prod" {
  provider     = google-beta
  project      = google_project.pharmarx_prod.project_id
  display_name = "PharmaRx Web App (Production)"
  
  depends_on = [google_project_service.apis]
}

# Firebase Web App Configurations
data "google_firebase_web_app_config" "pharmarx_web_dev" {
  provider   = google-beta
  web_app_id = google_firebase_web_app.pharmarx_web_dev.app_id
}

data "google_firebase_web_app_config" "pharmarx_web_staging" {
  provider   = google-beta
  web_app_id = google_firebase_web_app.pharmarx_web_staging.app_id
}

data "google_firebase_web_app_config" "pharmarx_web_prod" {
  provider   = google-beta
  web_app_id = google_firebase_web_app.pharmarx_web_prod.app_id
}

# Firestore Databases
resource "google_firestore_database" "pharmarx_dev" {
  project     = google_project.pharmarx_dev.project_id
  name        = "(default)"
  location_id = var.firestore_location
  type        = "FIRESTORE_NATIVE"
  
  depends_on = [google_project_service.apis]
}

resource "google_firestore_database" "pharmarx_staging" {
  project     = google_project.pharmarx_staging.project_id
  name        = "(default)"
  location_id = var.firestore_location
  type        = "FIRESTORE_NATIVE"
  
  depends_on = [google_project_service.apis]
}

resource "google_firestore_database" "pharmarx_prod" {
  project     = google_project.pharmarx_prod.project_id
  name        = "(default)"
  location_id = var.firestore_location
  type        = "FIRESTORE_NATIVE"
  
  depends_on = [google_project_service.apis]
}

# Cloud Storage Buckets for file uploads
resource "google_storage_bucket" "pharmarx_uploads_dev" {
  name     = "${google_project.pharmarx_dev.project_id}-uploads"
  project  = google_project.pharmarx_dev.project_id
  location = var.storage_location
  
  uniform_bucket_level_access = true
  
  versioning {
    enabled = true
  }
  
  lifecycle_rule {
    condition {
      age = 30
    }
    action {
      type = "Delete"
    }
  }
  
  depends_on = [google_project_service.apis]
}

resource "google_storage_bucket" "pharmarx_uploads_staging" {
  name     = "${google_project.pharmarx_staging.project_id}-uploads"
  project  = google_project.pharmarx_staging.project_id
  location = var.storage_location
  
  uniform_bucket_level_access = true
  
  versioning {
    enabled = true
  }
  
  lifecycle_rule {
    condition {
      age = 90
    }
    action {
      type = "Delete"
    }
  }
  
  depends_on = [google_project_service.apis]
}

resource "google_storage_bucket" "pharmarx_uploads_prod" {
  name     = "${google_project.pharmarx_prod.project_id}-uploads"
  project  = google_project.pharmarx_prod.project_id
  location = var.storage_location
  
  uniform_bucket_level_access = true
  
  versioning {
    enabled = true
  }
  
  lifecycle_rule {
    condition {
      age = 365
    }
    action {
      type = "Delete"
    }
  }
  
  depends_on = [google_project_service.apis]
}

# Service Accounts for Backend Authentication
resource "google_service_account" "pharmarx_backend_dev" {
  project      = google_project.pharmarx_dev.project_id
  account_id   = "pharmarx-backend"
  display_name = "PharmaRx Backend Service Account"
  description  = "Service account for PharmaRx backend operations"
}

resource "google_service_account" "pharmarx_backend_staging" {
  project      = google_project.pharmarx_staging.project_id
  account_id   = "pharmarx-backend"
  display_name = "PharmaRx Backend Service Account"
  description  = "Service account for PharmaRx backend operations"
}

resource "google_service_account" "pharmarx_backend_prod" {
  project      = google_project.pharmarx_prod.project_id
  account_id   = "pharmarx-backend"
  display_name = "PharmaRx Backend Service Account"
  description  = "Service account for PharmaRx backend operations"
}

# IAM Roles for Service Accounts
resource "google_project_iam_member" "pharmarx_backend_dev_roles" {
  for_each = toset([
    "roles/firebase.admin",
    "roles/datastore.user",
    "roles/storage.admin",
    "roles/cloudvision.user"
  ])
  
  project = google_project.pharmarx_dev.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.pharmarx_backend_dev.email}"
}

resource "google_project_iam_member" "pharmarx_backend_staging_roles" {
  for_each = toset([
    "roles/firebase.admin",
    "roles/datastore.user", 
    "roles/storage.admin",
    "roles/cloudvision.user"
  ])
  
  project = google_project.pharmarx_staging.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.pharmarx_backend_staging.email}"
}

resource "google_project_iam_member" "pharmarx_backend_prod_roles" {
  for_each = toset([
    "roles/firebase.admin",
    "roles/datastore.user",
    "roles/storage.admin", 
    "roles/cloudvision.user"
  ])
  
  project = google_project.pharmarx_prod.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.pharmarx_backend_prod.email}"
}

# Service Account Keys (for CI/CD and local development)
resource "google_service_account_key" "pharmarx_backend_dev_key" {
  service_account_id = google_service_account.pharmarx_backend_dev.name
}

resource "google_service_account_key" "pharmarx_backend_staging_key" {
  service_account_id = google_service_account.pharmarx_backend_staging.name
}

resource "google_service_account_key" "pharmarx_backend_prod_key" {
  service_account_id = google_service_account.pharmarx_backend_prod.name
} 
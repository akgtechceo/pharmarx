# PharmaRx Infrastructure - Google Cloud Platform
# This file will contain the main infrastructure configuration

terraform {
  required_version = ">= 1.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

# Configure Google Cloud Provider
provider "google" {
  project = var.project_id
  region  = var.region
}

# TODO: Add Cloud Functions for API backend
# TODO: Add Firebase Hosting for frontend
# TODO: Add Firestore database
# TODO: Add Cloud Storage buckets
# TODO: Add Firebase Authentication
# TODO: Add Cloud Vision API enablement 
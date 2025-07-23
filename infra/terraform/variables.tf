# Infrastructure Variables

variable "project_id" {
  description = "The GCP project ID"
  type        = string
}

variable "region" {
  description = "The GCP region"
  type        = string
  default     = "us-central1"
}

# Firebase-specific variables
variable "billing_account_id" {
  description = "The billing account ID for Firebase projects"
  type        = string
}

variable "firestore_location" {
  description = "The location for Firestore databases"
  type        = string
  default     = "us-central"
}

variable "storage_location" {
  description = "The location for Cloud Storage buckets"
  type        = string
  default     = "US"
}

variable "environment" {
  description = "The environment (dev, staging, prod)"
  type        = string
  default     = "dev"
  
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

# Security and authentication variables
variable "cors_allowed_origins" {
  description = "List of allowed CORS origins for the API"
  type        = list(string)
  default = [
    "http://localhost:5173",  # Development frontend
    "http://localhost:3000"   # Alternative dev port
  ]
}

variable "firebase_emulator_enabled" {
  description = "Whether to use Firebase emulators in development"
  type        = bool
  default     = true
}

# Monitoring and alerting
variable "enable_monitoring" {
  description = "Enable monitoring and alerting"
  type        = bool
  default     = true
}

variable "notification_email" {
  description = "Email address for infrastructure notifications"
  type        = string
  default     = ""
} 
# OmniClaw GCP Infrastructure Terraform

terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
  required_version = ">= 1.0"
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# Cloud Run Services
resource "google_cloud_run_v2_service" "alexa_handler" {
  name     = "alexa-handler"
  location = var.region
  
  template {
    service_account = google_service_account.omniclaw.email
    
    containers {
      image = "asia-south1-docker.pkg.dev/${var.project_id}/cloud-run-source-deploy/alexa-handler"
      resources {
        limits = {
          cpu    = "2"
          memory = "512Mi"
        }
      }
    }
  }
}

# Service Account
resource "google_service_account" "omniclaw" {
  account_id   = "omniclaw-sa"
  display_name = "OmniClaw Service Account"
}

# Storage Bucket
resource "google_storage_bucket" "omniclaw" {
  name     = "${var.project_id}-bucket"
  location = var.region
  versioning { enabled = true }
}

variable "project_id" {
  default = "omniclaw-personal-assistant"
}

variable "region" {
  default = "asia-south1"
}

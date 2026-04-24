terraform {
  required_version = ">= 1.5.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 5.0.0, < 6.0.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = ">= 5.0.0, < 6.0.0"
    }
    random = {
      source  = "hashicorp/random"
      version = ">= 3.5.0"
    }
  }

  # Remote backend configuration
  backend "gcs" {
    bucket = "omniclaw-terraform-state"
    prefix = "terraform/state"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
  zone    = var.zone

  user_project_override = false

  timeouts {
    create = "30m"
    update = "30m"
    delete = "30m"
  }
}

provider "google-beta" {
  project = var.project_id
  region  = var.region

  user_project_override = false

  timeouts {
    create = "30m"
    update = "30m"
    delete = "30m"
  }
}

provider "random" {
  # No configuration needed
}

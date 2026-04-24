# Google Cloud Provider Configuration
# OmniClaw Enhanced - Production Infrastructure

provider "google" {
  project = var.project_id
  region  = var.region

  # User agent for identification
  user_project = true

  # Timeout settings
  timeout = {
    create = "30m"
    update = "30m"
    delete = "30m"
  }

  # Retry settings for transient failures
  retry_transient_errors = true

  # Logging configuration
  logging {
    effective_log_level = var.provider_log_level
  }

  # Monitoring configuration
  monitoring {
    effective_log_level = var.provider_log_level
  }
}

provider "google-beta" {
  project = var.project_id
  region  = var.region

  # Required for Cloud Functions Gen 2
  user_project = true

  timeout = {
    create = "30m"
    update = "30m"
    delete = "30m"
  }

  retry_transient_errors = true
}

# Random provider for generating unique identifiers
provider "random" {
  # No configuration needed
}

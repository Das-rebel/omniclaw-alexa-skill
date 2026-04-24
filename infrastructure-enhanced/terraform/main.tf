terraform {
  required_version = ">= 1.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }

  backend "gcs" {
    bucket = "omniclaw-terraform-state"
    prefix = "production"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

locals {
  environment = terraform.workspace
}

# Data sources
data "google_project" "project" {
  project_id = var.project_id
}

# Module: Cloud Functions Gen 2
module "cloud_functions" {
  source = "./modules/cloud-functions"

  project_id      = var.project_id
  region          = var.region
  environment     = local.environment

  functions = {
    alexa_handler = {
      source_dir = "../cloud-functions"
      entry_point = "alexaHandler"
      runtime     = "nodejs20"
      memory     = "512Mi"
      timeout    = "60s"
      max_instances = 100
      environment_vars = {
        NODE_ENV = "production"
        LOG_LEVEL = "info"
      }
      secret_vars = [
        "OPENAI_API_KEY",
        "ANTHROPIC_API_KEY",
        "ELEVENLABS_API_KEY",
        "SARVAM_API_KEY"
      ]
    }

    email_processor = {
      source_dir = "../cloud-functions"
      entry_point = "emailProcessor"
      runtime     = "nodejs20"
      memory     = "1Gi"
      timeout    = "120s"
      max_instances = 50
      environment_vars = {
        NODE_ENV = "production"
      }
      secret_vars = [
        "GMAIL_OAUTH_CLIENT_ID",
        "GMAIL_OAUTH_CLIENT_SECRET"
      ]
    }

    price_checker = {
      source_dir = "../cloud-functions"
      entry_point = "priceChecker"
      runtime     = "nodejs20"
      memory     = "1Gi"
      timeout    = "180s"
      max_instances = 30
      environment_vars = {
        NODE_ENV = "production"
      }
      secret_vars = [
        "PROXY_SERVICE_API_KEY"
      ]
    }

    media_controller = {
      source_dir = "../cloud-functions"
      entry_point = "mediaController"
      runtime     = "nodejs20"
      memory     = "512Mi"
      timeout    = "60s"
      max_instances = 50
      environment_vars = {
        NODE_ENV = "production"
      }
      secret_vars = [
        "SPOTIFY_CLIENT_ID",
        "SPOTIFY_CLIENT_SECRET",
        "YOUTUBE_API_KEY"
      ]
    }

    story_narrator = {
      source_dir = "../cloud-functions"
      entry_point = "storyNarrator"
      runtime     = "nodejs20"
      memory     = "1Gi"
      timeout    = "300s"
      max_instances = 20
      environment_vars = {
        NODE_ENV = "production"
      }
      secret_vars = [
        "ELEVENLABS_API_KEY",
        "ELEVENLABS_VOICE_ID"
      ]
    }
  }
}

# Module: Firestore Database
module "firestore" {
  source = "./modules/firestore"

  project_id  = var.project_id
  region      = var.region

  collections = {
    users = {
      indexes = [
        { fields = ["email"], query_scope = "COLLECTION" },
        { fields = ["created_at"], query_scope = "COLLECTION" }
      ]
    }

    emails = {
      indexes = [
        { fields = ["user_id", "created_at"], query_scope = "COLLECTION" },
        { fields = ["priority", "created_at"], query_scope = "COLLECTION" }
      ]
    }

    price_history = {
      indexes = [
        { fields = ["product_id", "timestamp"], query_scope = "COLLECTION" },
        { fields = ["user_id", "priority"], query_scope = "COLLECTION" }
      ]
    }

    media_queue = {
      indexes = [
        { fields = ["user_id", "status"], query_scope = "COLLECTION" },
        { fields = ["created_at"], query_scope = "COLLECTION" }
      ]
    }

    stories = {
      indexes = [
        { fields = ["user_id", "created_at"], query_scope = "COLLECTION" },
        { fields = ["genre", "language"], query_scope = "COLLECTION" }
      ]
    }

    conversations = {
      indexes = [
        { fields = ["user_id", "session_id"], query_scope = "COLLECTION" },
        { fields = ["timestamp"], query_scope = "COLLECTION" }
      ]
    }

    circuit_breaker_state = {
      indexes = [
        { fields = ["service_name", "last_failure_time"], query_scope = "COLLECTION" }
      ]
    }

    cache_entries = {
      indexes = [
        { fields = ["key", "expires_at"], query_scope = "COLLECTION" },
        { fields = ["expires_at"], query_scope = "COLLECTION" }
      ]
    }
  }
}

# Module: Redis (Memorystore)
module "redis" {
  source = "./modules/redis"

  project_id  = var.project_id
  region      = var.region
  environment = local.environment

  redis_instances = {
    cache = {
      tier             = "STANDARD_HA"
      memory_size_gb   = 1
      replica_count    = 2
      redis_version    = "7.2"
      retention_policy = "7d"
    }
  }
}

# Module: Cloud Scheduler
module "scheduler" {
  source = "./modules/scheduler"

  project_id  = var.project_id
  region      = var.region

  jobs = {
    price_check_high_priority = {
      schedule     = "*/2 * * * *"  # Every 2 hours
      time_zone    = "Asia/Kolkata"
      http_target = {
        uri      = module.cloud_functions.function_uris["price_checker"]
        http_method = "POST"
        body = {
          priority = "high"
        }
      }
    }

    price_check_standard = {
      schedule     = "*/6 * * * *"  # Every 6 hours
      time_zone    = "Asia/Kolkata"
      http_target = {
        uri      = module.cloud_functions.function_uris["price_checker"]
        http_method = "POST"
        body = {
          priority = "standard"
        }
      }
    }

    price_check_low = {
      schedule     = "0 0 * * *"  # Daily at midnight
      time_zone    = "Asia/Kolkata"
      http_target = {
        uri      = module.cloud_functions.function_uris["price_checker"]
        http_method = "POST"
        body = {
          priority = "low"
        }
      }
    }

    cache_cleanup = {
      schedule     = "0 */6 * * *"  # Every 6 hours
      time_zone    = "Asia/Kolkata"
      http_target = {
        uri      = module.cloud_functions.function_uris["alexa_handler"]
        http_method = "POST"
        body = {
          action = "cleanup_cache"
        }
      }
    }

    health_check = {
      schedule     = "*/5 * * * *"  # Every 5 minutes
      time_zone    = "Asia/Kolkata"
      http_target = {
        uri      = module.cloud_functions.function_uris["alexa_handler"]
        http_method = "GET"
        body = {
          action = "health_check"
        }
      }
    }
  }
}

# Module: Secret Manager
module "secrets" {
  source = "./modules/secrets"

  project_id  = var.project_id

  secrets = {
    # LLM Provider Keys
    OPENAI_API_KEY           = {}
    ANTHROPIC_API_KEY        = {}
    CEREBRAS_API_KEY         = {}
    GROQ_API_KEY            = {}
    SARVAM_API_KEY          = {}

    # Email Services
    GMAIL_OAUTH_CLIENT_ID    = {}
    GMAIL_OAUTH_CLIENT_SECRET = {}
    OUTLOOK_CLIENT_ID        = {}
    OUTLOOK_CLIENT_SECRET    = {}

    # Media Services
    SPOTIFY_CLIENT_ID        = {}
    SPOTIFY_CLIENT_SECRET    = {}
    YOUTUBE_API_KEY         = {}

    # TTS Services
    ELEVENLABS_API_KEY       = {}
    ELEVENLABS_VOICE_ID      = { default_value = "eleven_multilingual_v2" }

    # Price Tracking
    PROXY_SERVICE_API_KEY    = {}

    # Database
    REDIS_CONNECTION_STRING  = {}
    FIRESTORE_CREDENTIALS   = {}
  }
}

# Module: VPC Networking
module "vpc" {
  source = "./modules/vpc"

  project_id  = var.project_id
  region      = var.region
  environment = local.environment

  vpc_config = {
    name = "omniclaw-vpc"
    cidr = "10.0.0.0/16"

    subnets = {
      private = {
        cidr = "10.0.1.0/24"
        enable_private_ip_google_access = true
      }

      public = {
        cidr = "10.0.2.0/24"
        enable_private_ip_google_access = false
      }
    }
  }
}

# Module: Cloud Build (CI/CD)
module "cloudbuild" {
  source = "./modules/cloudbuild"

  project_id = var.project_id

  triggers = {
    pr-validation = {
      trigger_template {
        branch_name = ".*"
        repo_name   = "github-owner-omniclaw-personal-assistant"
      }

      build {
        step {
          name = "node:20"
          entrypoint = "npm"
          args = ["ci"]
        }

        step {
          name = "node:20"
          entrypoint = "npm"
          args = ["test"]
        }

        step {
          name = "node:20"
          entrypoint = "npm"
          args = ["run", "test:integration"]
        }
      }
    }

    deploy-production = {
      trigger_template {
        branch_name = "main"
        repo_name   = "github-owner-omniclaw-personal-assistant"
      }

      build {
        step {
          name = "node:20"
          entrypoint = "npm"
          args = ["ci"]
        }

        step {
          name = "node:20"
          entrypoint = "npm"
          args = ["test"]
        }

        step {
          name = "gcr.io/cloud-builders/gcloud"
          entrypoint = "bash"
          args = ["../scripts/deploy-functions.sh"]
        }

        step {
          name = "gcr.io/cloud-builders/gcloud"
          entrypoint = "bash"
          args = ["../scripts/rollback-on-failure.sh"]
        }
      }
    }
  }
}

# Module: Monitoring
module "monitoring" {
  source = "./modules/monitoring"

  project_id = var.project_id

  dashboards = {
    main = {
      display_name = "OmniClaw Main Dashboard"
      charts = [
        {
          title = "Request Rate"
          metrics = ["cloudfunctions.googleapis.com/function/execution_times"]
        },
        {
          title = "Error Rate"
          metrics = ["cloudfunctions.googleapis.com/function/execution_count"]
        },
        {
          title = "Latency"
          metrics = ["cloudfunctions.googleapis.com/function/user_memory_bytes"]
        }
      ]
    }
  }

  alert_policies = {
    high_error_rate = {
      display_name = "High Error Rate Alert"
      conditions = [
        {
          display_name = "Error rate > 1%"
          condition_threshold {
            filter = 'resource.type="cloud_function" AND metric.type="cloudfunctions.googleapis.com/function/execution_count"'
            comparison = "COMPARISON_GT"
            threshold_value = 0.01
            duration = "300s"
          }
        }
      ]
      notification_channels = var.notification_channels
    }

    high_latency = {
      display_name = "High Latency Alert"
      conditions = [
        {
          display_name = "P95 latency > 3s"
          condition_threshold {
            filter = 'resource.type="cloud_function" AND metric.type="cloudfunctions.googleapis.com/function/execution_times"'
            comparison = "COMPARISON_GT"
            threshold_value = 3000
            duration = "300s"
            aggregations = {
              alignment_period = "300s"
              per_series_aligner = "ALIGN_PERCENTILE_95"
            }
          }
        }
      ]
      notification_channels = var.notification_channels
    }

    circuit_breaker_open = {
      display_name = "Circuit Breaker Open Alert"
      conditions = [
        {
          display_name = "Circuit breaker OPEN state"
          condition_threshold {
            filter = 'resource.type="cloud_function" AND metric.type="custom.googleapis.com/circuit_breaker_state"'
            comparison = "COMPARISON_GT"
            threshold_value = 0
            duration = "60s"
          }
        }
      ]
      notification_channels = var.notification_channels
    }
  }
}

# Module: IAM
module "iam" {
  source = "./modules/iam"

  project_id = var.project_id

  service_accounts = {
    cloud_functions = {
      display_name = "Cloud Functions Service Account"
      roles = [
        "roles/cloudfunctions.invoker",
        "roles/secretmanager.secretAccessor",
        "roles/datastore.user",
        "roles/redis.user",
        "roles/monitoring.metricWriter",
        "roles/logging.logWriter"
      ]
    }

    scheduler = {
      display_name = "Cloud Scheduler Service Account"
      roles = [
        "roles/cloudscheduler.serviceAgent",
        "roles/cloudfunctions.invoker"
      ]
    }

    cloudbuild = {
      display_name = "Cloud Build Service Account"
      roles = [
        "roles/cloudbuild.builds.builder",
        "roles/cloudfunctions.developer",
        "roles/secretmanager.secretAccessor",
        "roles/iam.serviceAccountUser"
      ]
    }
  }
}

# Variables
variable "project_id" {
  type        = string
  description = "GCP Project ID"
  default     = "omniclaw-personal-assistant"
}

variable "region" {
  type        = string
  description = "GCP Region"
  default     = "asia-south1"
}

variable "billing_account" {
  type        = string
  description = "Billing account ID"
}

variable "notification_channels" {
  type        = list(string)
  description = "List of notification channel IDs for alerts"
  default     = []
}

# Outputs
output "cloud_function_uris" {
  description = "Cloud Function URIs"
  value       = module.cloud_functions.function_uris
}

output "firestore_database" {
  description = "Firestore database details"
  value       = module.firestore.database_id
}

output "redis_host" {
  description = "Redis host"
  value       = module.redis.host
}

output "vpc_network" {
  description = "VPC network name"
  value       = module.vpc.network_name
}

output "project_id" {
  description = "Project ID"
  value       = var.project_id
}

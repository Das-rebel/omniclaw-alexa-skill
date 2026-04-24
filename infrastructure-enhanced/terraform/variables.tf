# Input Variables for OmniClaw Enhanced Infrastructure
# These variables allow customization across environments

variable "project_id" {
  description = "GCP Project ID for OmniClaw Enhanced"
  type        = string
  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{3,29}$", var.project_id))
    error_message = "Project ID must be 4-30 characters, lowercase, start with a letter, and contain only letters, numbers, and hyphens."
  }
}

variable "region" {
  description = "Default region for resources"
  type        = string
  default     = "us-central1"
}

variable "zone" {
  description = "Default zone for zonal resources"
  type        = string
  default     = "us-central1-a"
}

variable "environment" {
  description = "Environment name (dev, staging, production)"
  type        = string
  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Environment must be one of: dev, staging, production"
  }
}

variable "provider_log_level" {
  description = "Log level for provider operations"
  type        = string
  default     = "WARN"
}

variable "functions" {
  description = "Cloud Functions configuration"
  type = map(object({
    description          = string
    runtime              = string
    memory               = string
    timeout              = string
    min_instances        = number
    max_instances        = number
    available_memory     = string
    ingress_settings     = string
    service_account_email = optional(string)
    environment_variables = map(string)
  }))
  default = {
    omniclaw-price = {
      description          = "Product price tracking and monitoring service"
      runtime              = "nodejs20"
      memory               = "512Mi"
      timeout              = "60s"
      min_instances        = 0
      max_instances        = 100
      available_memory     = "512Mi"
      ingress_settings     = "ALLOW_ALL"
      environment_variables = {
        FUNCTION_NAME = "omniclaw-price"
      }
    }
    omniclaw-story = {
      description          = "AI-powered story generation with TTS"
      runtime              = "nodejs20"
      memory               = "2048Mi"
      timeout              = "60s"
      min_instances        = 0
      max_instances        = 50
      available_memory     = "2048Mi"
      ingress_settings     = "ALLOW_ALL"
      environment_variables = {
        FUNCTION_NAME = "omniclaw-story"
      }
    }
    omniclaw-media = {
      description          = "Unified media control service"
      runtime              = "nodejs20"
      memory               = "256Mi"
      timeout              = "30s"
      min_instances        = 0
      max_instances        = 100
      available_memory     = "256Mi"
      ingress_settings     = "ALLOW_ALL"
      environment_variables = {
        FUNCTION_NAME = "omniclaw-media"
      }
    }
    omniclaw-analytics = {
      description          = "Usage analytics and insights service"
      runtime              = "nodejs20"
      memory               = "512Mi"
      timeout              = "60s"
      min_instances        = 0
      max_instances        = 100
      available_memory     = "512Mi"
      ingress_settings     = "ALLOW_INTERNAL"
      environment_variables = {
        FUNCTION_NAME = "omniclaw-analytics"
      }
    }
    omniclaw-health = {
      description          = "System health monitoring and checks"
      runtime              = "nodejs20"
      memory               = "256Mi"
      timeout              = "30s"
      min_instances        = 0
      max_instances        = 100
      available_memory     = "256Mi"
      ingress_settings     = "ALLOW_ALL"
      environment_variables = {
        FUNCTION_NAME = "omniclaw-health"
      }
    }
    omniclaw-email = {
      description          = "Email analytics and summarization service"
      runtime              = "nodejs20"
      memory               = "512Mi"
      timeout              = "60s"
      min_instances        = 0
      max_instances        = 50
      available_memory     = "512Mi"
      ingress_settings     = "ALLOW_ALL"
      environment_variables = {
        FUNCTION_NAME = "omniclaw-email"
      }
    }
    omniclaw-media-refresh = {
      description          = "Media token refresh service"
      runtime              = "nodejs20"
      memory               = "256Mi"
      timeout              = "30s"
      min_instances        = 0
      max_instances        = 100
      available_memory     = "256Mi"
      ingress_settings     = "ALLOW_INTERNAL"
      environment_variables = {
        FUNCTION_NAME = "omniclaw-media-refresh"
      }
    }
  }
}

variable "secrets" {
  description = "Secret Manager secrets configuration"
  type = map(object({
    description  = string
    secret_data  = optional(string, null)
    secret_manager_params = optional(object({
      replication = optional(object({
        auto = optional(object({
          customer_managed_replication = optional(map(object({
            location = string
          })))
        }))
        user_managed = optional(map(object({
          location = string
        })))
      }))
      topics = optional(map(object({
        name = string
        project = optional(string)
      })))
    }), {})
  }))
  default = {
    groq-api-key = {
      description = "Groq API key for LLM services"
    }
    cerebras-api-key = {
      description = "Cerebras API key for high-performance inference"
    }
    zai-api-key = {
      description = "Z.ai proxy API key for multi-provider LLM access"
    }
    anthropic-api-key = {
      description = "Anthropic API key for Claude models"
    }
    elevenlabs-api-key = {
      description = "ElevenLabs API key for TTS services"
    }
    sarvam-api-key = {
      description = "Sarvam AI API key for Indic language TTS"
    }
    spotify-client-id = {
      description = "Spotify client ID for media control"
    }
    spotify-client-secret = {
      description = "Spotify client secret for media control"
    }
    youtube-api-key = {
      description = "YouTube API key for video control"
    }
    redis-password = {
      description = "Redis authentication password"
    }
  }
}

variable "firestore" {
  description = "Firestore database configuration"
  type = object({
    database_id       = string
    location          = string
    type              = string
    concurrency_mode  = optional(string, "OPTIMISTIC")
    app_engine_mode   = optional(bool, false)
  })
  default = {
    database_id      = "omniclaw-firestore"
    location         = "us-central"
    type             = "FIRESTORE_NATIVE"
  }
}

variable "cloud_tasks" {
  description = "Cloud Tasks queues configuration"
  type = map(object({
    location         = string
    rate_limits = object({
      max_dispatches_per_second = optional(number, 10.0)
      max_burst_size           = optional(number, 100)
    })
    retry_config = object({
      max_attempts             = optional(number, 5)
      min_backoff              = optional(string, "0.100s")
      max_backoff              = optional(string, "3600s")
      max_doublings            = optional(number, 10)
      max_retry_duration       = optional(string, "0s")
    })
    queue_state_manager_enabled = optional(bool, true)
  }))
  default = {
    price-tracking-queue = {
      location = "us-central1"
      rate_limits = {
        max_dispatches_per_second = 5.0
        max_burst_size           = 50
      }
      retry_config = {
        max_attempts      = 5
        min_backoff       = "0.100s"
        max_backoff       = "3600s"
        max_doublings     = 10
        max_retry_duration = "0s"
      }
    }
    media-refresh-queue = {
      location = "us-central1"
      rate_limits = {
        max_dispatches_per_second = 1.0
        max_burst_size           = 10
      }
      retry_config = {
        max_attempts      = 3
        min_backoff       = "0.100s"
        max_backoff       = "300s"
        max_doublings     = 5
        max_retry_duration = "0s"
      }
    }
  }
}

variable "scheduler_jobs" {
  description = "Cloud Scheduler jobs configuration"
  type = map(object({
    description        = string
    schedule           = string
    time_zone          = string
    http_target = object({
      uri               = string
      http_method       = string
      headers           = optional(map(string), {})
      body              = optional(string, null)
    })
    retry_config = optional(object({
      retry_count        = optional(number, 3)
      min_backoff        = optional(string, "5s")
      max_backoff        = optional(string, "60s")
      max_doublings      = optional(number, 5)
      max_retry_duration = optional(string, "0s")
    }), {})
  }))
  default = {
    price-monitor-job = {
      description = "Scheduled price monitoring tasks"
      schedule    = "0 */4 * * *"
      time_zone   = "America/New_York"
      http_target = {
        uri         = ""  # Populated from function URL
        http_method = "POST"
        headers = {
          "Content-Type" = "application/json"
        }
      }
      retry_config = {
        retry_count       = 3
        min_backoff       = "10s"
        max_backoff       = "60s"
        max_doublings     = 3
        max_retry_duration = "0s"
      }
    }
    token-refresh-job = {
      description = "Refresh media service tokens"
      schedule    = "0 */1 * * *"
      time_zone   = "America/New_York"
      http_target = {
        uri         = ""  # Populated from function URL
        http_method = "POST"
        headers = {
          "Content-Type" = "application/json"
        }
      }
    }
  }
}

variable "monitoring" {
  description = "Monitoring and alerting configuration"
  type = object({
    enabled = bool
    notification_channels = list(object({
      type = string
      labels = map(string)
    }))
    dashboards = optional(map(object({
      display_name = string
      charts = list(object({
        title        = string
        type         = string
        metrics      = list(map(string))
      }))
    })), {})
  })
  default = {
    enabled = true
    notification_channels = [
      {
        type = "email"
        labels = {
          email_address = "alerts@omniclaw-enhanced.iam.gserviceaccount.com"
        }
      }
    ]
  }
}

variable "vpc_config" {
  description = "VPC configuration for Cloud Functions"
  type = object({
    network_id = optional(string, null)
    subnet_id  = optional(string, null)
    ip_ranges  = optional(map(string), {})
  })
  default = {
    network_id = null
    subnet_id  = null
    ip_ranges  = {}
  }
}

variable "labels" {
  description = "Labels to apply to all resources"
  type        = map(string)
  default = {
    project     = "omniclaw-enhanced"
    managed-by  = "terraform"
    environment = "production"
  }
}

variable "enable_apis" {
  description = "Enable required GCP APIs"
  type        = bool
  default     = true
}

variable "api_endpoints" {
  description = "List of APIs to enable"
  type        = list(string)
  default = [
    "cloudfunctions.googleapis.com",
    "firestore.googleapis.com",
    "cloudtasks.googleapis.com",
    "cloudscheduler.googleapis.com",
    "secretmanager.googleapis.com",
    "pubsub.googleapis.com",
    "monitoring.googleapis.com",
    "logging.googleapis.com",
    "cloudresourcemanager.googleapis.com",
    "iam.googleapis.com",
    "cloudbuild.googleapis.com",
    "artifactregistry.googleapis.com",
  ]
}

variable "iam_roles" {
  description = "IAM roles to assign to service accounts"
  type = map(list(string))
  default = {
    "cloud-function-sa" = [
      "roles/cloudfunctions.invoker",
      "roles/secretmanager.secretAccessor",
      "roles/firestore.user",
      "roles/cloudtasks.enqueuer",
      "roles/monitoring.metricWriter",
      "roles/logging.logWriter",
      "roles/pubsub.publisher",
      "roles/pubsub.subscriber",
    ]
    "scheduler-sa" = [
      "roles/cloudscheduler.serviceAgent",
      "roles/cloudfunctions.invoker",
    ]
  }
}

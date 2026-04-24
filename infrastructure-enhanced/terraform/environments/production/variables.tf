# Production Environment Variables
# Override default variables for production environment

variable "project_id" {
  description = "GCP Project ID for Production"
  default     = "omniclaw-enhanced"
  type        = string
}

variable "region" {
  description = "Primary region for production"
  default     = "us-central1"
  type        = string
}

variable "environment" {
  description = "Environment name"
  default     = "production"
  type        = string
}

variable "monitoring" {
  description = "Monitoring configuration for production"
  default = {
    enabled = true
    notification_channels = [
      {
        type = "email"
        labels = {
          email_address = "production-alerts@omniclaw-enhanced.com"
        }
      },
      {
        type = "sms"
        labels = {
          phone_number = "+1234567890"
        }
      },
      {
        type = "pagerduty"
        labels = {
          integration_key = "prod-pagerduty-key"
        }
      }
    ]
    dashboards = {}
  }
  type = object({
    enabled = bool
    notification_channels = list(object({
      type = string
      labels = map(string)
    }))
    dashboards = map(object({
      display_name = string
      charts = list(object({
        title = string
        type = string
        metrics = list(map(string))
      }))
    }))
  })
}

variable "functions" {
  description = "Function configurations for production (maximum resources)"
  default = {
    omniclaw-price = {
      description          = "Product price tracking service (Production)"
      runtime              = "nodejs20"
      memory               = "512Mi"
      timeout              = "60s"
      min_instances        = 0
      max_instances        = 100
      available_memory     = "512Mi"
      ingress_settings     = "ALLOW_ALL"
      environment_variables = {
        FUNCTION_NAME = "omniclaw-price"
        LOG_LEVEL     = "info"
      }
    }
    omniclaw-story = {
      description          = "AI story generation (Production)"
      runtime              = "nodejs20"
      memory               = "2048Mi"
      timeout              = "60s"
      min_instances        = 0
      max_instances        = 50
      available_memory     = "2048Mi"
      ingress_settings     = "ALLOW_ALL"
      environment_variables = {
        FUNCTION_NAME = "omniclaw-story"
        LOG_LEVEL     = "info"
      }
    }
    omniclaw-media = {
      description          = "Media control service (Production)"
      runtime              = "nodejs20"
      memory               = "256Mi"
      timeout              = "30s"
      min_instances        = 0
      max_instances        = 100
      available_memory     = "256Mi"
      ingress_settings     = "ALLOW_ALL"
      environment_variables = {
        FUNCTION_NAME = "omniclaw-media"
        LOG_LEVEL     = "info"
      }
    }
    omniclaw-analytics = {
      description          = "Analytics service (Production)"
      runtime              = "nodejs20"
      memory               = "512Mi"
      timeout              = "60s"
      min_instances        = 0
      max_instances        = 100
      available_memory     = "512Mi"
      ingress_settings     = "ALLOW_INTERNAL"
      environment_variables = {
        FUNCTION_NAME = "omniclaw-analytics"
        LOG_LEVEL     = "info"
      }
    }
    omniclaw-health = {
      description          = "Health monitoring (Production)"
      runtime              = "nodejs20"
      memory               = "256Mi"
      timeout              = "30s"
      min_instances        = 0
      max_instances        = 100
      available_memory     = "256Mi"
      ingress_settings     = "ALLOW_ALL"
      environment_variables = {
        FUNCTION_NAME = "omniclaw-health"
        LOG_LEVEL     = "info"
      }
    }
    omniclaw-email = {
      description          = "Email analytics (Production)"
      runtime              = "nodejs20"
      memory               = "512Mi"
      timeout              = "60s"
      min_instances        = 0
      max_instances        = 50
      available_memory     = "512Mi"
      ingress_settings     = "ALLOW_ALL"
      environment_variables = {
        FUNCTION_NAME = "omniclaw-email"
        LOG_LEVEL     = "info"
      }
    }
    omniclaw-media-refresh = {
      description          = "Media token refresh (Production)"
      runtime              = "nodejs20"
      memory               = "256Mi"
      timeout              = "30s"
      min_instances        = 0
      max_instances        = 100
      available_memory     = "256Mi"
      ingress_settings     = "ALLOW_INTERNAL"
      environment_variables = {
        FUNCTION_NAME = "omniclaw-media-refresh"
        LOG_LEVEL     = "info"
      }
    }
  }
  type = map(object({
    description          = string
    runtime              = string
    memory               = string
    timeout              = string
    min_instances        = number
    max_instances        = number
    available_memory     = string
    ingress_settings     = string
    environment_variables = map(string)
  }))
}

variable "labels" {
  description = "Labels for production environment"
  default = {
    project     = "omniclaw-enhanced"
    managed-by  = "terraform"
    environment = "production"
    cost-center = "engineering"
    compliance  = "soc2"
  }
  type = map(string)
}

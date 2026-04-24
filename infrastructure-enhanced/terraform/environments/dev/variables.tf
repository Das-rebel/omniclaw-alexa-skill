# Development Environment Variables
# Override default variables for development environment

variable "project_id" {
  description = "GCP Project ID for Development"
  default     = "omniclaw-enhanced-dev"
  type        = string
}

variable "region" {
  description = "Primary region for development"
  default     = "us-central1"
  type        = string
}

variable "environment" {
  description = "Environment name"
  default     = "dev"
  type        = string
}

variable "monitoring" {
  description = "Monitoring configuration for dev"
  default = {
    enabled = false
    notification_channels = []
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
  description = "Function configurations for dev (lower resources)"
  default = {
    omniclaw-price = {
      description          = "Product price tracking service (Dev)"
      runtime              = "nodejs20"
      memory               = "256Mi"
      timeout              = "60s"
      min_instances        = 0
      max_instances        = 10
      available_memory     = "256Mi"
      ingress_settings     = "ALLOW_ALL"
      environment_variables = {
        FUNCTION_NAME = "omniclaw-price"
        LOG_LEVEL     = "debug"
      }
    }
    omniclaw-story = {
      description          = "AI story generation (Dev)"
      runtime              = "nodejs20"
      memory               = "1024Mi"
      timeout              = "60s"
      min_instances        = 0
      max_instances        = 5
      available_memory     = "1024Mi"
      ingress_settings     = "ALLOW_ALL"
      environment_variables = {
        FUNCTION_NAME = "omniclaw-story"
        LOG_LEVEL     = "debug"
      }
    }
    omniclaw-media = {
      description          = "Media control service (Dev)"
      runtime              = "nodejs20"
      memory               = "256Mi"
      timeout              = "30s"
      min_instances        = 0
      max_instances        = 10
      available_memory     = "256Mi"
      ingress_settings     = "ALLOW_ALL"
      environment_variables = {
        FUNCTION_NAME = "omniclaw-media"
        LOG_LEVEL     = "debug"
      }
    }
    omniclaw-analytics = {
      description          = "Analytics service (Dev)"
      runtime              = "nodejs20"
      memory               = "256Mi"
      timeout              = "60s"
      min_instances        = 0
      max_instances        = 10
      available_memory     = "256Mi"
      ingress_settings     = "ALLOW_INTERNAL"
      environment_variables = {
        FUNCTION_NAME = "omniclaw-analytics"
        LOG_LEVEL     = "debug"
      }
    }
    omniclaw-health = {
      description          = "Health monitoring (Dev)"
      runtime              = "nodejs20"
      memory               = "128Mi"
      timeout              = "30s"
      min_instances        = 0
      max_instances        = 10
      available_memory     = "128Mi"
      ingress_settings     = "ALLOW_ALL"
      environment_variables = {
        FUNCTION_NAME = "omniclaw-health"
        LOG_LEVEL     = "debug"
      }
    }
    omniclaw-email = {
      description          = "Email analytics (Dev)"
      runtime              = "nodejs20"
      memory               = "256Mi"
      timeout              = "60s"
      min_instances        = 0
      max_instances        = 5
      available_memory     = "256Mi"
      ingress_settings     = "ALLOW_ALL"
      environment_variables = {
        FUNCTION_NAME = "omniclaw-email"
        LOG_LEVEL     = "debug"
      }
    }
    omniclaw-media-refresh = {
      description          = "Media token refresh (Dev)"
      runtime              = "nodejs20"
      memory               = "128Mi"
      timeout              = "30s"
      min_instances        = 0
      max_instances        = 10
      available_memory     = "128Mi"
      ingress_settings     = "ALLOW_INTERNAL"
      environment_variables = {
        FUNCTION_NAME = "omniclaw-media-refresh"
        LOG_LEVEL     = "debug"
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
  description = "Labels for dev environment"
  default = {
    project     = "omniclaw-enhanced"
    managed-by  = "terraform"
    environment = "dev"
    cost-center = "engineering"
  }
  type = map(string)
}

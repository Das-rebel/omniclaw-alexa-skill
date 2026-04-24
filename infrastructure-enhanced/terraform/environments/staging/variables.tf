# Staging Environment Variables
# Override default variables for staging environment

variable "project_id" {
  description = "GCP Project ID for Staging"
  default     = "omniclaw-enhanced-staging"
  type        = string
}

variable "region" {
  description = "Primary region for staging"
  default     = "us-central1"
  type        = string
}

variable "environment" {
  description = "Environment name"
  default     = "staging"
  type        = string
}

variable "monitoring" {
  description = "Monitoring configuration for staging"
  default = {
    enabled = true
    notification_channels = [
      {
        type = "email"
        labels = {
          email_address = "staging-alerts@omniclaw-enhanced.com"
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
  description = "Function configurations for staging (moderate resources)"
  default = {
    omniclaw-price = {
      description          = "Product price tracking service (Staging)"
      runtime              = "nodejs20"
      memory               = "512Mi"
      timeout              = "60s"
      min_instances        = 0
      max_instances        = 50
      available_memory     = "512Mi"
      ingress_settings     = "ALLOW_ALL"
      environment_variables = {
        FUNCTION_NAME = "omniclaw-price"
        LOG_LEVEL     = "info"
      }
    }
    omniclaw-story = {
      description          = "AI story generation (Staging)"
      runtime              = "nodejs20"
      memory               = "2048Mi"
      timeout              = "60s"
      min_instances        = 0
      max_instances        = 25
      available_memory     = "2048Mi"
      ingress_settings     = "ALLOW_ALL"
      environment_variables = {
        FUNCTION_NAME = "omniclaw-story"
        LOG_LEVEL     = "info"
      }
    }
    omniclaw-media = {
      description          = "Media control service (Staging)"
      runtime              = "nodejs20"
      memory               = "256Mi"
      timeout              = "30s"
      min_instances        = 0
      max_instances        = 50
      available_memory     = "256Mi"
      ingress_settings     = "ALLOW_ALL"
      environment_variables = {
        FUNCTION_NAME = "omniclaw-media"
        LOG_LEVEL     = "info"
      }
    }
    omniclaw-analytics = {
      description          = "Analytics service (Staging)"
      runtime              = "nodejs20"
      memory               = "512Mi"
      timeout              = "60s"
      min_instances        = 0
      max_instances        = 50
      available_memory     = "512Mi"
      ingress_settings     = "ALLOW_INTERNAL"
      environment_variables = {
        FUNCTION_NAME = "omniclaw-analytics"
        LOG_LEVEL     = "info"
      }
    }
    omniclaw-health = {
      description          = "Health monitoring (Staging)"
      runtime              = "nodejs20"
      memory               = "256Mi"
      timeout              = "30s"
      min_instances        = 0
      max_instances        = 50
      available_memory     = "256Mi"
      ingress_settings     = "ALLOW_ALL"
      environment_variables = {
        FUNCTION_NAME = "omniclaw-health"
        LOG_LEVEL     = "info"
      }
    }
    omniclaw-email = {
      description          = "Email analytics (Staging)"
      runtime              = "nodejs20"
      memory               = "512Mi"
      timeout              = "60s"
      min_instances        = 0
      max_instances        = 25
      available_memory     = "512Mi"
      ingress_settings     = "ALLOW_ALL"
      environment_variables = {
        FUNCTION_NAME = "omniclaw-email"
        LOG_LEVEL     = "info"
      }
    }
    omniclaw-media-refresh = {
      description          = "Media token refresh (Staging)"
      runtime              = "nodejs20"
      memory               = "256Mi"
      timeout              = "30s"
      min_instances        = 0
      max_instances        = 50
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
  description = "Labels for staging environment"
  default = {
    project     = "omniclaw-enhanced"
    managed-by  = "terraform"
    environment = "staging"
    cost-center = "engineering"
  }
  type = map(string)
}

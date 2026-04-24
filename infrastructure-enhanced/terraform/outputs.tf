# Output values for OmniClaw Enhanced Infrastructure
# These outputs provide important information after deployment

output "project_id" {
  description = "GCP Project ID"
  value       = var.project_id
}

output "environment" {
  description = "Deployment environment"
  value       = var.environment
}

output "region" {
  description = "Primary region"
  value       = var.region
}

# Cloud Functions outputs
output "function_urls" {
  description = "Cloud Function HTTPS endpoints"
  value = {
    for name, config in module.cloud_functions : name => config.function_url
  }
}

output "function_names" {
  description = "Cloud Function names"
  value = {
    for name, config in module.cloud_functions : name => config.function_name
  }
}

output "function_service_accounts" {
  description = "Service account emails for each function"
  value = module.service_accounts.function_service_accounts
  sensitive = true
}

# Secret Manager outputs
output "secret_names" {
  description = "Secret Manager secret names"
  value = module.secrets.secret_names
  sensitive = true
}

# Firestore outputs
output "firestore_database_id" {
  description = "Firestore database ID"
  value       = module.firestore.database_id
}

output "firestore_database_name" {
  description = "Firestore database resource name"
  value       = module.firestore.database_name
}

# Cloud Tasks outputs
output "cloud_task_queues" {
  description = "Cloud Tasks queue names"
  value = {
    for name, config in module.cloud_tasks : name => config.queue_name
  }
}

output "cloud_task_queue_paths" {
  description = "Cloud Tasks queue resource paths"
  value = {
    for name, config in module.cloud_tasks : name => config.queue_path
  }
}

# Cloud Scheduler outputs
output "scheduler_jobs" {
  description = "Cloud Scheduler job names"
  value = {
    for name, config in module.cloud_scheduler : name => config.job_name
  }
}

# Monitoring outputs
output "monitoring_dashboard_urls" {
  description = "Monitoring dashboard URLs"
  value = module.monitoring.dashboard_urls
}

output "alert_policies" {
  description = "Alert policy names"
  value = module.monitoring.alert_policies
}

output "notification_channels" {
  description = "Notification channel IDs"
  value = module.monitoring.notification_channels
  sensitive = true
}

# Pub/Sub outputs
output "pubsub_topics" {
  description = "Pub/Sub topic names"
  value = module.pubsub.topic_names
}

output "pubsub_subscriptions" {
  description = "Pub/Sub subscription names"
  value = module.pubsub.subscription_names
}

# IAM outputs
output "service_account_emails" {
  description = "All service account emails"
  value = module.service_accounts.all_service_accounts
  sensitive = true
}

# VPC outputs
output "vpc_connector_name" {
  description = "VPC connector name (if configured)"
  value       = try(module.vpc.vpc_connector_name, null)
}

# Infrastructure summary
output "infrastructure_summary" {
  description = "Summary of deployed infrastructure"
  value = {
    functions        = length(module.cloud_functions)
    secrets          = length(module.secrets.secret_names)
    task_queues      = length(module.cloud_tasks)
    scheduler_jobs   = length(module.cloud_scheduler)
    topics           = length(module.pubsub.topic_names)
    dashboards       = length(module.monitoring.dashboard_urls)
    alert_policies   = length(module.monitoring.alert_policies)
  }
}

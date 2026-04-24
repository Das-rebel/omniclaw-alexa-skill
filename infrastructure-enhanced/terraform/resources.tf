# Cloud Resources Configuration
# OmniClaw Enhanced - Firestore, Cloud Tasks, Scheduler, Monitoring, Secrets, Pub/Sub

# =============================================================================
# Firestore Database Configuration
# =============================================================================
resource "google_firestore_database" "omniclaw_db" {
  project_id                     = var.project_id
  name                           = var.firestore.database_id
  location_id                    = var.firestore.location
  type                           = var.firestore.type
  concurrency_mode               = var.firestore.concurrency_mode
  app_engine_integration_mode    = var.firestore.app_engine_mode
  delete_protection_state        = "DELETE_PROTECTION_DISABLED"

  labels                         = merge(var.labels, {
    database_type = "main"
  })

  depends_on = [google_project_service.enabled_apis]
}

# Firestore Indexes
resource "google_firestore_index" "users_email" {
  project     = var.project_id
  collection  = "users"
  query_scope = "COLLECTION"

  fields {
    field_path = "email"
    order      = "ASCENDING"
  }

  fields {
    field_path = "created_at"
    order      = "DESCENDING"
  }
}

resource "google_firestore_index" "emails_user_priority" {
  project     = var.project_id
  collection  = "emails"
  query_scope = "COLLECTION"

  fields {
    field_path = "user_id"
    order      = "ASCENDING"
  }

  fields {
    field_path = "created_at"
    order      = "DESCENDING"
  }
}

resource "google_firestore_index" "price_history_product" {
  project     = var.project_id
  collection  = "price_history"
  query_scope = "COLLECTION"

  fields {
    field_path = "product_id"
    order      = "ASCENDING"
  }

  fields {
    field_path = "timestamp"
    order      = "DESCENDING"
  }
}

resource "google_firestore_index" "stories_user_genre" {
  project     = var.project_id
  collection  = "stories"
  query_scope = "COLLECTION"

  fields {
    field_path = "user_id"
    order      = "ASCENDING"
  }

  fields {
    field_path = "created_at"
    order      = "DESCENDING"
  }
}

resource "google_firestore_index" "circuit_breaker_state" {
  project     = var.project_id
  collection  = "circuit_breaker_state"
  query_scope = "COLLECTION"

  fields {
    field_path = "service_name"
    order      = "ASCENDING"
  }

  fields {
    field_path = "last_failure_time"
    order      = "DESCENDING"
  }
}

# =============================================================================
# Cloud Tasks Queues
# =============================================================================
resource "google_cloud_tasks_queue" "price_tracking_queue" {
  name       = "price-tracking-queue"
  location   = var.cloud_tasks["price-tracking-queue"].location
  project    = var.project_id

  rate_limits {
    max_dispatches_per_second = var.cloud_tasks["price-tracking-queue"].rate_limits.max_dispatches_per_second
    max_burst_size           = var.cloud_tasks["price-tracking-queue"].rate_limits.max_burst_size
  }

  retry_config {
    max_attempts             = var.cloud_tasks["price-tracking-queue"].retry_config.max_attempts
    min_backoff              = var.cloud_tasks["price-tracking-queue"].retry_config.min_backoff
    max_backoff              = var.cloud_tasks["price-tracking-queue"].retry_config.max_backoff
    max_doublings            = var.cloud_tasks["price-tracking-queue"].retry_config.max_doublings
    max_retry_duration       = var.cloud_tasks["price-tracking-queue"].retry_config.max_retry_duration
  }

  queue_state_manager_enabled = var.cloud_tasks["price-tracking-queue"].queue_state_manager_enabled

  labels = merge(var.labels, {
    queue_type = "price-tracking"
  })

  depends_on = [google_project_service.enabled_apis]
}

resource "google_cloud_tasks_queue" "media_refresh_queue" {
  name       = "media-refresh-queue"
  location   = var.cloud_tasks["media-refresh-queue"].location
  project    = var.project_id

  rate_limits {
    max_dispatches_per_second = var.cloud_tasks["media-refresh-queue"].rate_limits.max_dispatches_per_second
    max_burst_size           = var.cloud_tasks["media-refresh-queue"].rate_limits.max_burst_size
  }

  retry_config {
    max_attempts             = var.cloud_tasks["media-refresh-queue"].retry_config.max_attempts
    min_backoff              = var.cloud_tasks["media-refresh-queue"].retry_config.min_backoff
    max_backoff              = var.cloud_tasks["media-refresh-queue"].retry_config.max_backoff
    max_doublings            = var.cloud_tasks["media-refresh-queue"].retry_config.max_doublings
    max_retry_duration       = var.cloud_tasks["media-refresh-queue"].retry_config.max_retry_duration
  }

  queue_state_manager_enabled = var.cloud_tasks["media-refresh-queue"].queue_state_manager_enabled

  labels = merge(var.labels, {
    queue_type = "media-refresh"
  })

  depends_on = [google_project_service.enabled_apis]
}

# =============================================================================
# Cloud Scheduler Jobs
# =============================================================================
resource "google_cloud_scheduler_job" "price_monitor_job" {
  name        = "price-monitor-job"
  description = var.scheduler_jobs["price-monitor-job"].description
  schedule    = var.scheduler_jobs["price-monitor-job"].schedule
  time_zone   = var.scheduler_jobs["price-monitor-job"].time_zone
  project     = var.project_id
  region      = var.region

  http_target {
    http_method = var.scheduler_jobs["price-monitor-job"].http_target.http_method
    uri         = google_cloudfunctions2_function.omniclaw_price.url

    headers = merge(
      var.scheduler_jobs["price-monitor-job"].http_target.headers,
      {
        "User-Agent" = "Google-Cloud-Scheduler"
      }
    )

    body = base64encode(jsonencode({
      action    = "monitor_prices"
      source    = "scheduler"
      timestamp = timestamp()
    }))

    oidc_token {
      service_account_email = google_service_account.scheduler_service_account.email
      audience              = google_cloudfunctions2_function.omniclaw_price.url
    }
  }

  retry_config {
    retry_count        = var.scheduler_jobs["price-monitor-job"].retry_config.retry_count
    min_backoff        = var.scheduler_jobs["price-monitor-job"].retry_config.min_backoff
    max_backoff        = var.scheduler_jobs["price-monitor-job"].retry_config.max_backoff
    max_doublings      = var.scheduler_jobs["price-monitor-job"].retry_config.max_doublings
    max_retry_duration = var.scheduler_jobs["price-monitor-job"].retry_config.max_retry_duration
  }

  labels = merge(var.labels, {
    job_type = "price-monitoring"
  })

  depends_on = [
    google_cloudfunctions2_function.omniclaw_price,
    google_project_service.enabled_apis,
  ]
}

resource "google_cloud_scheduler_job" "token_refresh_job" {
  name        = "token-refresh-job"
  description = var.scheduler_jobs["token-refresh-job"].description
  schedule    = var.scheduler_jobs["token-refresh-job"].schedule
  time_zone   = var.scheduler_jobs["token-refresh-job"].time_zone
  project     = var.project_id
  region      = var.region

  http_target {
    http_method = var.scheduler_jobs["token-refresh-job"].http_target.http_method
    uri         = google_cloudfunctions2_function.omniclaw_media_refresh.url

    headers = merge(
      var.scheduler_jobs["token-refresh-job"].http_target.headers,
      {
        "User-Agent" = "Google-Cloud-Scheduler"
      }
    )

    body = base64encode(jsonencode({
      action    = "refresh_tokens"
      source    = "scheduler"
      timestamp = timestamp()
    }))

    oidc_token {
      service_account_email = google_service_account.scheduler_service_account.email
      audience              = google_cloudfunctions2_function.omniclaw_media_refresh.url
    }
  }

  labels = merge(var.labels, {
    job_type = "token-refresh"
  })

  depends_on = [
    google_cloudfunctions2_function.omniclaw_media_refresh,
    google_project_service.enabled_apis,
  ]
}

# =============================================================================
# Secret Manager Secrets
# =============================================================================
resource "google_secret_manager_secret" "groq_api_key" {
  secret_id = "groq-api-key"
  project   = var.project_id

  replication {
    auto {}
  }

  labels = merge(var.labels, {
    secret_type = "llm-api-key"
    provider    = "groq"
  })

  depends_on = [google_project_service.enabled_apis]
}

resource "google_secret_manager_secret" "cerebras_api_key" {
  secret_id = "cerebras-api-key"
  project   = var.project_id

  replication {
    auto {}
  }

  labels = merge(var.labels, {
    secret_type = "llm-api-key"
    provider    = "cerebras"
  })

  depends_on = [google_project_service.enabled_apis]
}

resource "google_secret_manager_secret" "zai_api_key" {
  secret_id = "zai-api-key"
  project   = var.project_id

  replication {
    auto {}
  }

  labels = merge(var.labels, {
    secret_type = "proxy-api-key"
    provider    = "zai"
  })

  depends_on = [google_project_service.enabled_apis]
}

resource "google_secret_manager_secret" "anthropic_api_key" {
  secret_id = "anthropic-api-key"
  project   = var.project_id

  replication {
    auto {}
  }

  labels = merge(var.labels, {
    secret_type = "llm-api-key"
    provider    = "anthropic"
  })

  depends_on = [google_project_service.enabled_apis]
}

resource "google_secret_manager_secret" "elevenlabs_api_key" {
  secret_id = "elevenlabs-api-key"
  project   = var.project_id

  replication {
    auto {}
  }

  labels = merge(var.labels, {
    secret_type = "tts-api-key"
    provider    = "elevenlabs"
  })

  depends_on = [google_project_service.enabled_apis]
}

resource "google_secret_manager_secret" "sarvam_api_key" {
  secret_id = "sarvam-api-key"
  project   = var.project_id

  replication {
    auto {}
  }

  labels = merge(var.labels, {
    secret_type = "tts-api-key"
    provider    = "sarvam"
  })

  depends_on = [google_project_service.enabled_apis]
}

resource "google_secret_manager_secret" "spotify_client_id" {
  secret_id = "spotify-client-id"
  project   = var.project_id

  replication {
    auto {}
  }

  labels = merge(var.labels, {
    secret_type = "oauth-client-id"
    provider    = "spotify"
  })

  depends_on = [google_project_service.enabled_apis]
}

resource "google_secret_manager_secret" "spotify_client_secret" {
  secret_id = "spotify-client-secret"
  project   = var.project_id

  replication {
    auto {}
  }

  labels = merge(var.labels, {
    secret_type = "oauth-client-secret"
    provider    = "spotify"
  })

  depends_on = [google_project_service.enabled_apis]
}

resource "google_secret_manager_secret" "youtube_api_key" {
  secret_id = "youtube-api-key"
  project   = var.project_id

  replication {
    auto {}
  }

  labels = merge(var.labels, {
    secret_type = "api-key"
    provider    = "youtube"
  })

  depends_on = [google_project_service.enabled_apis]
}

resource "google_secret_manager_secret" "redis_password" {
  secret_id = "redis-password"
  project   = var.project_id

  replication {
    auto {}
  }

  labels = merge(var.labels, {
    secret_type = "database-password"
    provider    = "redis"
  })

  depends_on = [google_project_service.enabled_apis]
}

# =============================================================================
# Pub/Sub Topics and Subscriptions
# =============================================================================
resource "google_pubsub_topic" "price_scheduler" {
  name       = "price-scheduler-topic"
  project    = var.project_id

  labels = merge(var.labels, {
    topic_type = "scheduler"
  })

  message_retention_duration = "604800s"

  depends_on = [google_project_service.enabled_apis]
}

resource "google_pubsub_topic" "media_events" {
  name       = "media-events-topic"
  project    = var.project_id

  labels = merge(var.labels, {
    topic_type = "events"
  })

  message_retention_duration = "604800s"

  depends_on = [google_project_service.enabled_apis]
}

resource "google_pubsub_topic" "analytics_events" {
  name       = "analytics-events-topic"
  project    = var.project_id

  labels = merge(var.labels, {
    topic_type = "events"
  })

  message_retention_duration = "604800s"

  depends_on = [google_project_service.enabled_apis]
}

resource "google_pubsub_subscription" "price_subscription" {
  name    = "price-subscription"
  topic    = google_pubsub_topic.price_scheduler.name
  project = var.project_id

  ack_deadline_seconds = 600
  message_retention_duration = "604800s"
  retain_acked_messages = false

  push_config {
    push_endpoint = google_cloudfunctions2_function.omniclaw_price.url
    oidc_token {
      service_account_email = google_service_account.price_function.email
      audience              = google_cloudfunctions2_function.omniclaw_price.url
    }
  }

  labels = merge(var.labels, {
    subscription_type = "push"
  })

  depends_on = [
    google_cloudfunctions2_function.omniclaw_price,
    google_project_service.enabled_apis,
  ]
}

# =============================================================================
# Cloud Monitoring Dashboards
# =============================================================================
resource "google_monitoring_dashboard" "main_dashboard" {
  project        = var.project_id
  display_name   = "OmniClaw Enhanced - Main Dashboard"

  dashboard_json = jsonencode({
    displayName = "OmniClaw Enhanced - Main Dashboard"
    gridLayout = {
      columns = "2"
      widgets = [
        {
          title = "Function Execution Count"
          xyChart = {
            dataSets = [{
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "resource.type=\\\"cloud_function\\\" metric.type=\\\"cloudfunctions.googleapis.com/function/execution_count\\\""
                  aggregation = {
                    alignmentPeriod = "300s"
                    perSeriesAligner = "ALIGN_SUM"
                  }
                }
              }
              plotType = "LINE"
            }]
            yAxis = {
              scale = "LINEAR"
            }
          }
        },
        {
          title = "Function Execution Times"
          xyChart = {
            dataSets = [{
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "resource.type=\\\"cloud_function\\\" metric.type=\\\"cloudfunctions.googleapis.com/function/execution_times\\\""
                  aggregation = {
                    alignmentPeriod = "300s"
                    perSeriesAligner = "ALIGN_PERCENTILE_99"
                  }
                }
              }
              plotType = "LINE"
            }]
            yAxis = {
              scale = "LINEAR"
            }
          }
        },
        {
          title = "Function Error Rate"
          xyChart = {
            dataSets = [{
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "resource.type=\\\"cloud_function\\\" metric.type=\\\"cloudfunctions.googleapis.com/function/execution_count\\\""
                  aggregation = {
                    alignmentPeriod = "300s"
                    perSeriesAligner = "ALIGN_FRACTION_TRUE"
                    crossSeriesReducer = "REDUCE_SUM"
                  }
                }
              }
              plotType = "LINE"
            }]
            yAxis = {
              scale = "LINEAR"
            }
          }
        },
        {
          title = "User Memory Usage"
          xyChart = {
            dataSets = [{
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "resource.type=\\\"cloud_function\\\" metric.type=\\\"cloudfunctions.googleapis.com/function/user_memory_bytes\\\""
                  aggregation = {
                    alignmentPeriod = "300s"
                    perSeriesAligner = "ALIGN_MEAN"
                  }
                }
              }
              plotType = "LINE"
            }]
            yAxis = {
              scale = "LINEAR"
            }
          }
        }
      ]
    }
  })

  labels = var.labels
}

# =============================================================================
# Cloud Monitoring Alert Policies
# =============================================================================
resource "google_monitoring_alert_policy" "high_error_rate" {
  project       = var.project_id
  display_name  = "High Error Rate Alert"
  combiner      = "OR"
  enabled       = var.monitoring.enabled

  conditions {
    display_name = "Function error rate > 1%"
    condition_threshold {
      filter          = "resource.type=\"cloud_function\" metric.type=\"cloudfunctions.googleapis.com/function/execution_count\" metric.label.\"verification_result\"=\"false\""
      comparison      = "COMPARISON_GT"
      threshold_value = 0.01
      duration        = "300s"
      aggregations {
        alignment_period     = "300s"
        per_series_aligner   = "ALIGN_FRACTION_TRUE"
        cross_series_reducer = "REDUCE_SUM"
      }
    }
  }

  notification_channels = var.monitoring.notification_channels

  labels = merge(var.labels, {
    alert_type = "error-rate"
  })
}

resource "google_monitoring_alert_policy" "high_latency" {
  project       = var.project_id
  display_name  = "High Latency Alert"
  combiner      = "OR"
  enabled       = var.monitoring.enabled

  conditions {
    display_name = "P95 latency > 3s"
    condition_threshold {
      filter        = "resource.type=\"cloud_function\" metric.type=\"cloudfunctions.googleapis.com/function/execution_times\""
      comparison    = "COMPARISON_GT"
      threshold_value = 3000
      duration      = "300s"
      aggregations {
        alignment_period     = "300s"
        per_series_aligner   = "ALIGN_PERCENTILE_95"
      }
    }
  }

  notification_channels = var.monitoring.notification_channels

  labels = merge(var.labels, {
    alert_type = "latency"
  })
}

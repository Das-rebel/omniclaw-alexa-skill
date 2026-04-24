# Cloud Functions Gen 2 Configuration
# OmniClaw Enhanced - All 7 Cloud Functions with comprehensive configuration

# =============================================================================
# Function 1: omniclaw-price - Product Price Tracking Service
# =============================================================================
resource "google_cloudfunctions2_function" "omniclaw_price" {
  name        = "omniclaw-price"
  location    = var.region
  description = "Automated product price tracking with Cloud Tasks scheduling"

  build_config {
    runtime     = "nodejs20"
    entry_point = "priceHandler"
    source {
      storage_source {
        bucket = google_storage_bucket.function_sources.name
        object = google_storage_bucket_object.price_source.name
      }
    }
    environment_variables = {
      BUILD_TARGET = "price"
      NODE_ENV     = var.environment
    }
  }

  service_config {
    available_memory   = "512Mi"
    timeout_seconds    = 60
    max_instance_count = 100
    min_instance_count = 0
    available_cpu      = "0.25"

    ingress_settings               = "ALLOW_ALL"
    service_account_email          = google_service_account.price_function.email
    all_traffic_on_latest_revision = true

    environment_variables = merge(
      {
        FUNCTION_NAME  = "omniclaw-price"
        LOG_LEVEL      = "info"
        ENABLE_TRACING = "true"
        ENABLE_METRICS = "true"
      },
      var.functions["omniclaw-price"].environment_variables
    )

    secret_environment_variables {
      key        = "GROQ_API_KEY"
      secret     = google_secret_manager_secret.groq_api_key.secret_id
      version    = "latest"
    }

    secret_environment_variables {
      key        = "CEREBRAS_API_KEY"
      secret     = google_secret_manager_secret.cerebras_api_key.secret_id
      version    = "latest"
    }

    secret_environment_variables {
      key        = "ZAI_API_KEY"
      secret     = google_secret_manager_secret.zai_api_key.secret_id
      version    = "latest"
    }
  }

  event_trigger {
    trigger_region = var.region
    event_type     = "google.cloud.scheduler.job.v1.executed"
    pubsub_topic   = google_pubsub_topic.price_scheduler.id
    filters        = {}
  }

  labels = merge(var.labels, {
    function_type = "price-tracking"
    tier          = "standard"
  })

  depends_on = [
    google_project_service.enabled_apis,
    google_service_account.price_function,
  ]
}

# =============================================================================
# Function 2: omniclaw-story - AI Story Generation with TTS
# =============================================================================
resource "google_cloudfunctions2_function" "omniclaw_story" {
  name        = "omniclaw-story"
  location    = var.region
  description = "AI-powered story generation with multi-character TTS and emotion synthesis"

  build_config {
    runtime     = "nodejs20"
    entry_point = "storyHandler"
    source {
      storage_source {
        bucket = google_storage_bucket.function_sources.name
        object = google_storage_bucket_object.story_source.name
      }
    }
    environment_variables = {
      BUILD_TARGET = "story"
      NODE_ENV     = var.environment
    }
  }

  service_config {
    available_memory   = "2048Mi"
    timeout_seconds    = 60
    max_instance_count = 50
    min_instance_count = 0
    available_cpu      = "1.0"

    ingress_settings               = "ALLOW_ALL"
    service_account_email          = google_service_account.story_function.email
    all_traffic_on_latest_revision = true

    environment_variables = merge(
      {
        FUNCTION_NAME      = "omniclaw-story"
        LOG_LEVEL          = "info"
        ENABLE_TRACING     = "true"
        ENABLE_METRICS     = "true"
        TTS_ENGINE         = "elevenlabs"
        MAX_STORY_LENGTH   = "5000"
        DEFAULT_LANGUAGE   = "en-US"
      },
      var.functions["omniclaw-story"].environment_variables
    )

    secret_environment_variables {
      key        = "ELEVENLABS_API_KEY"
      secret     = google_secret_manager_secret.elevenlabs_api_key.secret_id
      version    = "latest"
    }

    secret_environment_variables {
      key        = "SARVAM_API_KEY"
      secret     = google_secret_manager_secret.sarvam_api_key.secret_id
      version    = "latest"
    }

    secret_environment_variables {
      key        = "ANTHROPIC_API_KEY"
      secret     = google_secret_manager_secret.anthropic_api_key.secret_id
      version    = "latest"
    }
  }

  labels = merge(var.labels, {
    function_type = "story-generation"
    tier          = "premium"
  })

  depends_on = [
    google_project_service.enabled_apis,
    google_service_account.story_function,
  ]
}

# =============================================================================
# Function 3: omniclaw-media - Unified Media Control Service
# =============================================================================
resource "google_cloudfunctions2_function" "omniclaw_media" {
  name        = "omniclaw-media"
  location    = var.region
  description = "Unified media control for Spotify, YouTube, and Kodi"

  build_config {
    runtime     = "nodejs20"
    entry_point = "mediaHandler"
    source {
      storage_source {
        bucket = google_storage_bucket.function_sources.name
        object = google_storage_bucket_object.media_source.name
      }
    }
    environment_variables = {
      BUILD_TARGET = "media"
      NODE_ENV     = var.environment
    }
  }

  service_config {
    available_memory   = "256Mi"
    timeout_seconds    = 30
    max_instance_count = 100
    min_instance_count = 0
    available_cpu      = "0.166"

    ingress_settings               = "ALLOW_ALL"
    service_account_email          = google_service_account.media_function.email
    all_traffic_on_latest_revision = true

    environment_variables = merge(
      {
        FUNCTION_NAME  = "omniclaw-media"
        LOG_LEVEL      = "info"
        ENABLE_TRACING = "true"
        ENABLE_METRICS = "true"
        SPOTIFY_ENABLED = "true"
        YOUTUBE_ENABLED = "true"
        KODI_ENABLED    = "true"
      },
      var.functions["omniclaw-media"].environment_variables
    )

    secret_environment_variables {
      key        = "SPOTIFY_CLIENT_ID"
      secret     = google_secret_manager_secret.spotify_client_id.secret_id
      version    = "latest"
    }

    secret_environment_variables {
      key        = "SPOTIFY_CLIENT_SECRET"
      secret     = google_secret_manager_secret.spotify_client_secret.secret_id
      version    = "latest"
    }

    secret_environment_variables {
      key        = "YOUTUBE_API_KEY"
      secret     = google_secret_manager_secret.youtube_api_key.secret_id
      version    = "latest"
    }
  }

  labels = merge(var.labels, {
    function_type = "media-control"
    tier          = "standard"
  })

  depends_on = [
    google_project_service.enabled_apis,
    google_service_account.media_function,
  ]
}

# =============================================================================
# Function 4: omniclaw-analytics - Usage Analytics Service
# =============================================================================
resource "google_cloudfunctions2_function" "omniclaw_analytics" {
  name        = "omniclaw-analytics"
  location    = var.region
  description = "Usage analytics, insights, and performance metrics"

  build_config {
    runtime     = "nodejs20"
    entry_point = "analyticsHandler"
    source {
      storage_source {
        bucket = google_storage_bucket.function_sources.name
        object = google_storage_bucket_object.analytics_source.name
      }
    }
    environment_variables = {
      BUILD_TARGET = "analytics"
      NODE_ENV     = var.environment
    }
  }

  service_config {
    available_memory   = "512Mi"
    timeout_seconds    = 60
    max_instance_count = 100
    min_instance_count = 0
    available_cpu      = "0.25"

    ingress_settings               = "ALLOW_INTERNAL"
    service_account_email          = google_service_account.analytics_function.email
    all_traffic_on_latest_revision = true

    environment_variables = merge(
      {
        FUNCTION_NAME     = "omniclaw-analytics"
        LOG_LEVEL         = "info"
        ENABLE_TRACING    = "true"
        ENABLE_METRICS    = "true"
        DATA_RETENTION_DAYS = "90"
        AGGREGATION_LEVEL = "daily"
      },
      var.functions["omniclaw-analytics"].environment_variables
    )
  }

  labels = merge(var.labels, {
    function_type = "analytics"
    tier          = "standard"
  })

  depends_on = [
    google_project_service.enabled_apis,
    google_service_account.analytics_function,
  ]
}

# =============================================================================
# Function 5: omniclaw-health - System Health Monitoring Service
# =============================================================================
resource "google_cloudfunctions2_function" "omniclaw_health" {
  name        = "omniclaw-health"
  location    = var.region
  description = "System-wide health checks, monitoring, and diagnostics"

  build_config {
    runtime     = "nodejs20"
    entry_point = "healthHandler"
    source {
      storage_source {
        bucket = google_storage_bucket.function_sources.name
        object = google_storage_bucket_object.health_source.name
      }
    }
    environment_variables = {
      BUILD_TARGET = "health"
      NODE_ENV     = var.environment
    }
  }

  service_config {
    available_memory   = "256Mi"
    timeout_seconds    = 30
    max_instance_count = 100
    min_instance_count = 0
    available_cpu      = "0.166"

    ingress_settings               = "ALLOW_ALL"
    service_account_email          = google_service_account.health_function.email
    all_traffic_on_latest_revision = true

    environment_variables = merge(
      {
        FUNCTION_NAME   = "omniclaw-health"
        LOG_LEVEL       = "info"
        ENABLE_TRACING  = "true"
        ENABLE_METRICS  = "true"
        HEALTH_CHECK_INTERVAL = "300"
      },
      var.functions["omniclaw-health"].environment_variables
    )
  }

  labels = merge(var.labels, {
    function_type = "health-monitoring"
    tier          = "standard"
  })

  depends_on = [
    google_project_service.enabled_apis,
    google_service_account.health_function,
  ]
}

# =============================================================================
# Function 6: omniclaw-email - Email Analytics Service
# =============================================================================
resource "google_cloudfunctions2_function" "omniclaw_email" {
  name        = "omniclaw-email"
  location    = var.region
  description = "AI-powered email analytics and summarization"

  build_config {
    runtime     = "nodejs20"
    entry_point = "emailHandler"
    source {
      storage_source {
        bucket = google_storage_bucket.function_sources.name
        object = google_storage_bucket_object.email_source.name
      }
    }
    environment_variables = {
      BUILD_TARGET = "email"
      NODE_ENV     = var.environment
    }
  }

  service_config {
    available_memory   = "512Mi"
    timeout_seconds    = 60
    max_instance_count = 50
    min_instance_count = 0
    available_cpu      = "0.25"

    ingress_settings               = "ALLOW_ALL"
    service_account_email          = google_service_account.email_function.email
    all_traffic_on_latest_revision = true

    environment_variables = merge(
      {
        FUNCTION_NAME      = "omniclaw-email"
        LOG_LEVEL          = "info"
        ENABLE_TRACING     = "true"
        ENABLE_METRICS     = "true"
        MAX_EMAILS_BATCH   = "50"
        SUMMARY_LENGTH     = "300"
      },
      var.functions["omniclaw-email"].environment_variables
    )

    secret_environment_variables {
      key        = "ANTHROPIC_API_KEY"
      secret     = google_secret_manager_secret.anthropic_api_key.secret_id
      version    = "latest"
    }
  }

  labels = merge(var.labels, {
    function_type = "email-analytics"
    tier          = "premium"
  })

  depends_on = [
    google_project_service.enabled_apis,
    google_service_account.email_function,
  ]
}

# =============================================================================
# Function 7: omniclaw-media-refresh - Media Token Refresh Service
# =============================================================================
resource "google_cloudfunctions2_function" "omniclaw_media_refresh" {
  name        = "omniclaw-media-refresh"
  location    = var.region
  description = "Automated refresh of media service authentication tokens"

  build_config {
    runtime     = "nodejs20"
    entry_point = "tokenRefreshHandler"
    source {
      storage_source {
        bucket = google_storage_bucket.function_sources.name
        object = google_storage_bucket_object.media_refresh_source.name
      }
    }
    environment_variables = {
      BUILD_TARGET = "media-refresh"
      NODE_ENV     = var.environment
    }
  }

  service_config {
    available_memory   = "256Mi"
    timeout_seconds    = 30
    max_instance_count = 100
    min_instance_count = 0
    available_cpu      = "0.166"

    ingress_settings               = "ALLOW_INTERNAL"
    service_account_email          = google_service_account.media_refresh_function.email
    all_traffic_on_latest_revision = true

    environment_variables = merge(
      {
        FUNCTION_NAME  = "omniclaw-media-refresh"
        LOG_LEVEL      = "info"
        ENABLE_TRACING = "true"
        ENABLE_METRICS = "true"
        REFRESH_BUFFER = "300"
      },
      var.functions["omniclaw-media-refresh"].environment_variables
    )

    secret_environment_variables {
      key        = "SPOTIFY_CLIENT_ID"
      secret     = google_secret_manager_secret.spotify_client_id.secret_id
      version    = "latest"
    }

    secret_environment_variables {
      key        = "SPOTIFY_CLIENT_SECRET"
      secret     = google_secret_manager_secret.spotify_client_secret.secret_id
      version    = "latest"
    }
  }

  labels = merge(var.labels, {
    function_type = "token-refresh"
    tier          = "standard"
  })

  depends_on = [
    google_project_service.enabled_apis,
    google_service_account.media_refresh_function,
  ]
}

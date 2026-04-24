# Networking and Security Configuration
# OmniClaw Enhanced - VPC, Firewall, IAM, Service Accounts

# =============================================================================
# Service Accounts
# =============================================================================
resource "google_service_account" "price_function" {
  account_id   = "omniclaw-price-sa"
  display_name = "OmniClaw Price Function Service Account"
  description  = "Service account for omniclaw-price Cloud Function"

  labels = merge(var.labels, {
    function = "omniclaw-price"
  })
}

resource "google_service_account" "story_function" {
  account_id   = "omniclaw-story-sa"
  display_name = "OmniClaw Story Function Service Account"
  description  = "Service account for omniclaw-story Cloud Function"

  labels = merge(var.labels, {
    function = "omniclaw-story"
  })
}

resource "google_service_account" "media_function" {
  account_id   = "omniclaw-media-sa"
  display_name = "OmniClaw Media Function Service Account"
  description  = "Service account for omniclaw-media Cloud Function"

  labels = merge(var.labels, {
    function = "omniclaw-media"
  })
}

resource "google_service_account" "analytics_function" {
  account_id   = "omniclaw-analytics-sa"
  display_name = "OmniClaw Analytics Function Service Account"
  description  = "Service account for omniclaw-analytics Cloud Function"

  labels = merge(var.labels, {
    function = "omniclaw-analytics"
  })
}

resource "google_service_account" "health_function" {
  account_id   = "omniclaw-health-sa"
  display_name = "OmniClaw Health Function Service Account"
  description  = "Service account for omniclaw-health Cloud Function"

  labels = merge(var.labels, {
    function = "omniclaw-health"
  })
}

resource "google_service_account" "email_function" {
  account_id   = "omniclaw-email-sa"
  display_name = "OmniClaw Email Function Service Account"
  description  = "Service account for omniclaw-email Cloud Function"

  labels = merge(var.labels, {
    function = "omniclaw-email"
  })
}

resource "google_service_account" "media_refresh_function" {
  account_id   = "omniclaw-media-refresh-sa"
  display_name = "OmniClaw Media Refresh Function Service Account"
  description  = "Service account for omniclaw-media-refresh Cloud Function"

  labels = merge(var.labels, {
    function = "omniclaw-media-refresh"
  })
}

resource "google_service_account" "scheduler_service_account" {
  account_id   = "omniclaw-scheduler-sa"
  display_name = "OmniClaw Scheduler Service Account"
  description  = "Service account for Cloud Scheduler jobs"

  labels = merge(var.labels, {
    component = "scheduler"
  })
}

# =============================================================================
# IAM Roles for Price Function
# =============================================================================
resource "google_project_iam_member" "price_invoker" {
  project = var.project_id
  role    = "roles/cloudfunctions.invoker"
  member  = "serviceAccount:${google_service_account.price_function.email}"
}

resource "google_project_iam_member" "price_secret_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.price_function.email}"
}

resource "google_project_iam_member" "price_firestore_user" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.price_function.email}"
}

resource "google_project_iam_member" "price_tasks_enqueuer" {
  project = var.project_id
  role    = "roles/cloudtasks.enqueuer"
  member  = "serviceAccount:${google_service_account.price_function.email}"
}

resource "google_project_iam_member" "price_monitoring_writer" {
  project = var.project_id
  role    = "roles/monitoring.metricWriter"
  member  = "serviceAccount:${google_service_account.price_function.email}"
}

resource "google_project_iam_member" "price_logging_writer" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.price_function.email}"
}

resource "google_project_iam_member" "price_pubsub_publisher" {
  project = var.project_id
  role    = "roles/pubsub.publisher"
  member  = "serviceAccount:${google_service_account.price_function.email}"
}

# =============================================================================
# IAM Roles for Story Function
# =============================================================================
resource "google_project_iam_member" "story_invoker" {
  project = var.project_id
  role    = "roles/cloudfunctions.invoker"
  member  = "serviceAccount:${google_service_account.story_function.email}"
}

resource "google_project_iam_member" "story_secret_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.story_function.email}"
}

resource "google_project_iam_member" "story_firestore_user" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.story_function.email}"
}

resource "google_project_iam_member" "story_monitoring_writer" {
  project = var.project_id
  role    = "roles/monitoring.metricWriter"
  member  = "serviceAccount:${google_service_account.story_function.email}"
}

resource "google_project_iam_member" "story_logging_writer" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.story_function.email}"
}

# =============================================================================
# IAM Roles for Media Function
# =============================================================================
resource "google_project_iam_member" "media_invoker" {
  project = var.project_id
  role    = "roles/cloudfunctions.invoker"
  member  = "serviceAccount:${google_service_account.media_function.email}"
}

resource "google_project_iam_member" "media_secret_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.media_function.email}"
}

resource "google_project_iam_member" "media_firestore_user" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.media_function.email}"
}

resource "google_project_iam_member" "media_monitoring_writer" {
  project = var.project_id
  role    = "roles/monitoring.metricWriter"
  member  = "serviceAccount:${google_service_account.media_function.email}"
}

resource "google_project_iam_member" "media_logging_writer" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.media_function.email}"
}

# =============================================================================
# IAM Roles for Analytics Function
# =============================================================================
resource "google_project_iam_member" "analytics_invoker" {
  project = var.project_id
  role    = "roles/cloudfunctions.invoker"
  member  = "serviceAccount:${google_service_account.analytics_function.email}"
}

resource "google_project_iam_member" "analytics_secret_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.analytics_function.email}"
}

resource "google_project_iam_member" "analytics_firestore_user" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.analytics_function.email}"
}

resource "google_project_iam_member" "analytics_monitoring_writer" {
  project = var.project_id
  role    = "roles/monitoring.metricWriter"
  member  = "serviceAccount:${google_service_account.analytics_function.email}"
}

resource "google_project_iam_member" "analytics_logging_writer" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.analytics_function.email}"
}

resource "google_project_iam_member" "analytics_pubsub_subscriber" {
  project = var.project_id
  role    = "roles/pubsub.subscriber"
  member  = "serviceAccount:${google_service_account.analytics_function.email}"
}

# =============================================================================
# IAM Roles for Health Function
# =============================================================================
resource "google_project_iam_member" "health_invoker" {
  project = var.project_id
  role    = "roles/cloudfunctions.invoker"
  member  = "serviceAccount:${google_service_account.health_function.email}"
}

resource "google_project_iam_member" "health_monitoring_viewer" {
  project = var.project_id
  role    = "roles/monitoring.viewer"
  member  = "serviceAccount:${google_service_account.health_function.email}"
}

resource "google_project_iam_member" "health_logging_writer" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.health_function.email}"
}

# =============================================================================
# IAM Roles for Email Function
# =============================================================================
resource "google_project_iam_member" "email_invoker" {
  project = var.project_id
  role    = "roles/cloudfunctions.invoker"
  member  = "serviceAccount:${google_service_account.email_function.email}"
}

resource "google_project_iam_member" "email_secret_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.email_function.email}"
}

resource "google_project_iam_member" "email_firestore_user" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.email_function.email}"
}

resource "google_project_iam_member" "email_monitoring_writer" {
  project = var.project_id
  role    = "roles/monitoring.metricWriter"
  member  = "serviceAccount:${google_service_account.email_function.email}"
}

resource "google_project_iam_member" "email_logging_writer" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.email_function.email}"
}

# =============================================================================
# IAM Roles for Media Refresh Function
# =============================================================================
resource "google_project_iam_member" "media_refresh_invoker" {
  project = var.project_id
  role    = "roles/cloudfunctions.invoker"
  member  = "serviceAccount:${google_service_account.media_refresh_function.email}"
}

resource "google_project_iam_member" "media_refresh_secret_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.media_refresh_function.email}"
}

resource "google_project_iam_member" "media_refresh_monitoring_writer" {
  project = var.project_id
  role    = "roles/monitoring.metricWriter"
  member  = "serviceAccount:${google_service_account.media_refresh_function.email}"
}

resource "google_project_iam_member" "media_refresh_logging_writer" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.media_refresh_function.email}"
}

# =============================================================================
# IAM Roles for Scheduler Service Account
# =============================================================================
resource "google_project_iam_member" "scheduler_invoker" {
  project = var.project_id
  role    = "roles/cloudfunctions.invoker"
  member  = "serviceAccount:${google_service_account.scheduler_service_account.email}"
}

resource "google_project_iam_member" "scheduler_service_agent" {
  project = var.project_id
  role    = "roles/cloudscheduler.serviceAgent"
  member  = "serviceAccount:${google_service_account.scheduler_service_account.email}"
}

# =============================================================================
# VPC Configuration (Optional - for private networking)
# =============================================================================
resource "google_compute_network" "vpc_network" {
  count = var.vpc_config.network_id != null ? 0 : 1

  name                    = "omniclaw-vpc"
  project                 = var.project_id
  auto_create_subnetworks = false
  routing_mode            = "REGIONAL"

  labels = merge(var.labels, {
    network_type = "main"
  })
}

resource "google_compute_subnetwork" "private_subnet" {
  count = var.vpc_config.network_id != null ? 0 : 1

  name                     = "omniclaw-private-subnet"
  project                  = var.project_id
  region                   = var.region
  network                  = google_compute_network.vpc_network[0].id
  ip_cidr_range            = "10.0.1.0/24"
  private_ip_google_access = true

  log_config {
    aggregation_interval = "INTERVAL_10_MIN"
    flow_sampling        = 0.5
    metadata             = "INCLUDE_ALL_METADATA"
  }

  labels = merge(var.labels, {
    subnet_type = "private"
  })
}

resource "google_compute_subnetwork" "public_subnet" {
  count = var.vpc_config.network_id != null ? 0 : 1

  name                     = "omniclaw-public-subnet"
  project                  = var.project_id
  region                   = var.region
  network                  = google_compute_network.vpc_network[0].id
  ip_cidr_range            = "10.0.2.0/24"
  private_ip_google_access = false

  labels = merge(var.labels, {
    subnet_type = "public"
  })
}

# =============================================================================
# VPC Connector for Cloud Functions
# =============================================================================
resource "google_vpc_access_connector" "connector" {
  count = var.vpc_config.network_id != null ? 0 : 1

  name          = "omniclaw-connector"
  project       = var.project_id
  region        = var.region
  ip_cidr_range = "10.8.0.0/28"
  network       = google_compute_network.vpc_network[0].id

  subnet {
    name = google_compute_subnetwork.private_subnet[0].name
  }

  machine_type = "e2-standard-4"
  min_instances = 2
  max_instances = 10

  labels = merge(var.labels, {
    connector_type = "serverless"
  })

  depends_on = [
    google_compute_subnetwork.private_subnet,
  ]
}

# =============================================================================
# Firewall Rules
# =============================================================================
resource "google_compute_firewall" "allow_internal" {
  count = var.vpc_config.network_id != null ? 0 : 1

  name    = "omniclaw-allow-internal"
  project = var.project_id
  network = google_compute_network.vpc_network[0].id

  allow {
    protocol = "tcp"
    ports    = ["0-65535"]
  }

  allow {
    protocol = "udp"
    ports    = ["0-65535"]
  }

  allow {
    protocol = "icmp"
  }

  source_tags = ["omniclaw-internal"]
}

resource "google_compute_firewall" "allow_health_checks" {
  count = var.vpc_config.network_id != null ? 0 : 1

  name    = "omnicaw-allow-health-checks"
  project = var.project_id
  network = google_compute_network.vpc_network[0].id

  allow {
    protocol = "tcp"
    ports    = ["80", "443"]
  }

  source_ranges = ["130.211.0.0/22", "35.191.0.0/16"]
}

# =============================================================================
# Storage Buckets for Function Sources
# =============================================================================
resource "google_storage_bucket" "function_sources" {
  name          = "${var.project_id}-function-sources"
  project       = var.project_id
  location      = var.region
  force_destroy = true

  uniform_bucket_level_access = true

  lifecycle_rule {
    condition {
      age = 30
    }
    action {
      type = "Delete"
    }
  }

  labels = merge(var.labels, {
    bucket_type = "function-sources"
  })
}

resource "google_storage_bucket_object" "price_source" {
  name   = "omniclaw-price-source.zip"
  bucket = google_storage_bucket.function_sources.name
  source = "../../deploy/functions/omniclaw-price.zip"
}

resource "google_storage_bucket_object" "story_source" {
  name   = "omniclaw-story-source.zip"
  bucket = google_storage_bucket.function_sources.name
  source = "../../deploy/functions/omniclaw-story.zip"
}

resource "google_storage_bucket_object" "media_source" {
  name   = "omniclaw-media-source.zip"
  bucket = google_storage_bucket.function_sources.name
  source = "../../deploy/functions/omniclaw-media.zip"
}

resource "google_storage_bucket_object" "analytics_source" {
  name   = "omniclaw-analytics-source.zip"
  bucket = google_storage_bucket.function_sources.name
  source = "../../deploy/functions/omniclaw-analytics.zip"
}

resource "google_storage_bucket_object" "health_source" {
  name   = "omniclaw-health-source.zip"
  bucket = google_storage_bucket.function_sources.name
  source = "../../deploy/functions/omniclaw-health.zip"
}

resource "google_storage_bucket_object" "email_source" {
  name   = "omniclaw-email-source.zip"
  bucket = google_storage_bucket.function_sources.name
  source = "../../deploy/functions/omniclaw-email.zip"
}

resource "google_storage_bucket_object" "media_refresh_source" {
  name   = "omniclaw-media-refresh-source.zip"
  bucket = google_storage_bucket.function_sources.name
  source = "../../deploy/functions/omniclaw-media-refresh.zip"
}

# =============================================================================
# Security Audit Logs
# =============================================================================
resource "google_logging_project_sink" "audit_sink" {
  name        = "omniclaw-audit-sink"
  project     = var.project_id
  destination = "storage.googleapis.com/${google_storage_bucket.function_sources.name}"

  filter = "protoPayload.serviceName=\"cloudfunctions.googleapis.com\" OR protoPayload.serviceName=\"secretmanager.googleapis.com\""

  include_children = true

  unique_writer_identity = true
}

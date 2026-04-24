# Staging Environment Backend Configuration
terraform {
  backend "gcs" {
    bucket = "omniclaw-terraform-state-staging"
    prefix = "terraform/staging"
  }
}

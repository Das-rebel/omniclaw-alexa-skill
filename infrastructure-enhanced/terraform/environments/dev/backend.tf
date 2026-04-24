# Development Environment Backend Configuration
terraform {
  backend "gcs" {
    bucket = "omniclaw-terraform-state-dev"
    prefix = "terraform/dev"
  }
}

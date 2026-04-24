# Production Environment Backend Configuration
terraform {
  backend "gcs" {
    bucket = "omniclaw-terraform-state-production"
    prefix = "terraform/production"
    encryption_key = "projects/omniclaw-enhanced/locations/global/keyRings/terraform/cryptoKeys/production-state"
  }
}

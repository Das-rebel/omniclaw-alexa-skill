# GitHub Actions Setup

## Required Secrets

Add these secrets to your GitHub repository:

1. `GCP_SA_KEY`: Service account key with roles:
   - roles/run.admin
   - roles/iam.serviceAccountUser
   - roles/storage.objectAdmin

## How to Get the Key

1. Go to GCP Console → IAM → Service Accounts
2. Find or create a service account for CI/CD
3. Create key JSON and paste as secret value

## Workflows

- `deploy.yml`: Deploys Cloud Run services on push to main

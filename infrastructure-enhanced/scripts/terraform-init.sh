#!/bin/bash
# Terraform Initialization Script
# OmniClaw Enhanced - Infrastructure as Code
# This script initializes Terraform with proper backend configuration

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TF_DIR="$(dirname "$SCRIPT_DIR")/terraform"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Default values
ENVIRONMENT="${1:-dev}"
PROJECT_ID="${2:-omniclaw-enhanced-dev}"
REGION="${3:-us-central1}"

# Help message
show_help() {
    cat << EOF
${BLUE}OmniClaw Enhanced - Terraform Initialization Script${NC}

Usage: $0 [ENVIRONMENT] [PROJECT_ID] [REGION]

Arguments:
  ENVIRONMENT   Target environment (dev, staging, production) [default: dev]
  PROJECT_ID    GCP Project ID [default: omniclaw-enhanced-dev]
  REGION        GCP Region [default: us-central1]

Examples:
  $0 dev omniclaw-enhanced-dev us-central1
  $0 staging omniclaw-enhanced-staging us-central1
  $0 production omniclaw-enhanced us-central1

Environment files:
  - terraform/environments/dev/backend.tf
  - terraform/environments/staging/backend.tf
  - terraform/environments/production/backend.tf

EOF
}

# Validate environment
validate_environment() {
    if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|production)$ ]]; then
        echo -e "${RED}Error: Invalid environment '$ENVIRONMENT'. Must be one of: dev, staging, production${NC}"
        exit 1
    fi

    local env_file="$TF_DIR/environments/$ENVIRONMENT"
    if [[ ! -d "$env_file" ]]; then
        echo -e "${RED}Error: Environment directory not found: $env_file${NC}"
        exit 1
    fi

    echo -e "${GREEN}✓ Environment validated: $ENVIRONMENT${NC}"
}

# Check prerequisites
check_prerequisites() {
    echo -e "${BLUE}Checking prerequisites...${NC}"

    # Check if terraform is installed
    if ! command -v terraform &> /dev/null; then
        echo -e "${RED}Error: terraform is not installed${NC}"
        echo "Please install Terraform from: https://www.terraform.io/downloads.html"
        exit 1
    fi

    # Check terraform version
    TF_VERSION=$(terraform version -json | jq -r '.terraform_version')
    echo -e "${GREEN}✓ Terraform version: $TF_VERSION${NC}"

    # Check if gcloud is installed
    if ! command -v gcloud &> /dev/null; then
        echo -e "${RED}Error: gcloud is not installed${NC}"
        echo "Please install Google Cloud SDK from: https://cloud.google.com/sdk/docs/install"
        exit 1
    fi

    echo -e "${GREEN}✓ gcloud is installed${NC}"

    # Check if jq is installed
    if ! command -v jq &> /dev/null; then
        echo -e "${RED}Error: jq is not installed${NC}"
        echo "Please install jq from: https://stedolan.github.io/jq/download/"
        exit 1
    fi

    echo -e "${GREEN}✓ All prerequisites met${NC}"
}

# Configure gcloud
configure_gcloud() {
    echo -e "${BLUE}Configuring gcloud...${NC}"

    # Set project
    gcloud config set project "$PROJECT_ID"
    echo -e "${GREEN}✓ Project set to: $PROJECT_ID${NC}"

    # Set region
    gcloud config set compute/region "$REGION"
    echo -e "${GREEN}✓ Region set to: $REGION${NC}"

    # Check authentication
    if ! gcloud auth list --filter="status:ACTIVE" --format="value(account)" | grep -q "."; then
        echo -e "${YELLOW}Warning: No active gcloud authentication found${NC}"
        echo "Please run: gcloud auth login"
        exit 1
    fi

    echo -e "${GREEN}✓ gcloud configured${NC}"
}

# Create backend bucket if needed
create_backend_bucket() {
    local bucket_name="${PROJECT_ID}-terraform-state-${ENVIRONMENT}"

    echo -e "${BLUE}Checking backend bucket: $bucket_name${NC}"

    if ! gsutil ls "gs://$bucket_name" &> /dev/null; then
        echo -e "${YELLOW}Creating backend bucket: $bucket_name${NC}"
        gsutil mb -p "$PROJECT_ID" -l "$REGION" "gs://$bucket_name"

        # Enable versioning
        gsutil versioning set on "gs://$bucket_name"

        # Enable uniform bucket-level access
        gsutil uniformbucketlevelaccess set on "gs://$bucket_name"

        # Add lifecycle rule
        cat > /tmp/lifecycle.json << EOF
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "Delete"},
        "condition": {"age": 90}
      }
    ]
  }
}
EOF
        gsutil lifecycle set /tmp/lifecycle.json "gs://$bucket_name"
        rm /tmp/lifecycle.json

        echo -e "${GREEN}✓ Backend bucket created${NC}"
    else
        echo -e "${GREEN}✓ Backend bucket exists${NC}"
    fi
}

# Initialize terraform
initialize_terraform() {
    echo -e "${BLUE}Initializing Terraform...${NC}"
    cd "$TF_DIR"

    # Copy environment-specific backend config
    local env_backend="$TF_DIR/environments/$ENVIRONMENT/backend.tf"
    if [[ -f "$env_backend" ]]; then
        echo -e "${GREEN}✓ Using backend config: $env_backend${NC}"
    fi

    # Initialize with backend
    terraform init \
        -backend-config="bucket=${PROJECT_ID}-terraform-state-${ENVIRONMENT}" \
        -backend-config="prefix=terraform/${ENVIRONMENT}" \
        -reconfigure

    echo -e "${GREEN}✓ Terraform initialized${NC}"

    # Validate configuration
    echo -e "${BLUE}Validating Terraform configuration...${NC}"
    terraform validate
    echo -e "${GREEN}✓ Configuration validated${NC}"

    # Format check
    echo -e "${BLUE}Checking format...${NC}"
    terraform fmt -check -recursive
    echo -e "${GREEN}✓ Format check passed${NC}"
}

# Create terraform.tfvars file
create_tfvars() {
    echo -e "${BLUE}Creating terraform.tfvars...${NC}"
    cd "$TF_DIR"

    cat > terraform.tfvars << EOF
# Auto-generated by terraform-init.sh
# Environment: $ENVIRONMENT
# Generated: $(date -u +"%Y-%m-%d %H:%M:%S UTC")

project_id  = "$PROJECT_ID"
region      = "$REGION"
environment = "$ENVIRONMENT"
EOF

    echo -e "${GREEN}✓ terraform.tfvars created${NC}"
}

# Show next steps
show_next_steps() {
    cat << EOF

${GREEN}╔════════════════════════════════════════════════════════════════╗
║                  Terraform Initialization Complete                 ║
╚════════════════════════════════════════════════════════════════╝${NC}

${BLUE}Environment:    ${GREEN}$ENVIRONMENT${NC}
${BLUE}Project ID:     ${GREEN}$PROJECT_ID${NC}
${BLUE}Region:         ${GREEN}$REGION${NC}

${BLUE}Next Steps:${NC}
  1. Review the plan:    ${YELLOW}./terraform-plan.sh $ENVIRONMENT${NC}
  2. Apply changes:      ${YELLOW}./terraform-apply.sh $ENVIRONMENT${NC}
  3. View outputs:       ${YELLOW}terraform output${NC}

${BLUE}Working Directory:${NC}
  cd $TF_DIR

${BLUE}Terraform Commands:${NC}
  terraform plan -var-file=environments/$ENVIRONMENT/variables.tf
  terraform apply -var-file=environments/$ENVIRONMENT/variables.tf
  terraform destroy -var-file=environments/$ENVIRONMENT/variables.tf

${BLUE}Documentation:${NC}
  - Infrastructure Guide:    $PROJECT_ROOT/docs/INFRASTRUCTURE_GUIDE.md
  - Terraform Guide:        $PROJECT_ROOT/docs/TERRAFORM_GUIDE.md
  - Architecture:           $PROJECT_ROOT/docs/ARCHITECTURE.md

EOF
}

# Main execution
main() {
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            *)
                ;;
        esac
        shift
    done

    echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║     OmniClaw Enhanced - Terraform Initialization              ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""

    # Execute steps
    validate_environment
    check_prerequisites
    configure_gcloud
    create_backend_bucket
    initialize_terraform
    create_tfvars
    show_next_steps

    echo -e "${GREEN}✓ Initialization complete!${NC}"
}

# Run main function
main "$@"

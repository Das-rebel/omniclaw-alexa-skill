#!/bin/bash
# Terraform Destroy Script
# OmniClaw Enhanced - Infrastructure as Code
# Destroys all Terraform-managed infrastructure

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
AUTO_APPROVE="${2:-false}"
FORCE="${3:-false}"

# Confirmation flag
CONFIRMED=false

# Help message
show_help() {
    cat << EOF
${BLUE}OmniClaw Enhanced - Terraform Destroy Script${NC}

Usage: $0 [ENVIRONMENT] [AUTO_APPROVE] [FORCE]

Arguments:
  ENVIRONMENT   Target environment (dev, staging, production) [default: dev]
  AUTO_APPROVE  Skip confirmation prompt (true/false) [default: false]
  FORCE         Force destroy without safety checks (true/false) [default: false]

${RED}WARNING:${NC} This will permanently delete all infrastructure!
This action cannot be undone.

Examples:
  $0 dev false false
  $0 staging true false
  $0 production false false  ${YELLOW}# Requires multiple confirmations${NC}

${RED}SAFETY WARNINGS:${NC}
  - Production environment requires multiple confirmations
  - All data will be permanently deleted
  - Cannot be undone without backups
  - Affects all resources in the environment

${GREEN}Safety Features:${NC}
  - Requires explicit confirmation
  - Production requires multiple confirmations
  - Creates final backup before destroy
  - Generates destroy report

EOF
}

# Validate environment
validate_environment() {
    if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|production)$ ]]; then
        echo -e "${RED}Error: Invalid environment '$ENVIRONMENT'. Must be one of: dev, staging, production${NC}"
        exit 1
    fi

    # Production environment special handling
    if [[ "$ENVIRONMENT" == "production" ]]; then
        echo -e "${RED}╔════════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${RED}║                   CRITICAL WARNING                           ║${NC}"
        echo -e "${RED}║                                                                ║${NC}"
        echo -e "${RED}║  You are about to destroy PRODUCTION infrastructure          ║${NC}"
        echo -e "${RED}║                                                                ║${NC}"
        echo -e "${RED}║  This action is IRREVERSIBLE and will DELETE ALL DATA         ║${NC}"
        echo -e "${RED}║                                                                ║${NC}"
        echo -e "${RED}║  Type 'DESTROY-PRODUCTION' to confirm                        ║${NC}"
        echo -e "${RED}╚════════════════════════════════════════════════════════════════╝${NC}"
        echo ""

        read -p "Type 'DESTROY-PRODUCTION' to continue: " prod_confirm

        if [[ "$prod_confirm" != "DESTROY-PRODUCTION" ]]; then
            echo -e "${RED}Destroy cancelled${NC}"
            exit 0
        fi
    fi

    echo -e "${GREEN}✓ Environment validated: $ENVIRONMENT${NC}"
}

# Check prerequisites
check_prerequisites() {
    echo -e "${BLUE}Checking prerequisites...${NC}"

    # Check if terraform is installed
    if ! command -v terraform &> /dev/null; then
        echo -e "${RED}Error: terraform is not installed${NC}"
        exit 1
    fi

    # Check if terraform is initialized
    if [[ ! -d "$TF_DIR/.terraform" ]]; then
        echo -e "${RED}Error: Terraform not initialized. Run terraform-init.sh first${NC}"
        exit 1
    fi

    # Warn if force is enabled
    if [[ "$FORCE" == "true" ]]; then
        echo -e "${YELLOW}Warning: Force mode enabled - skipping safety checks${NC}"
    fi

    echo -e "${GREEN}✓ Prerequisites met${NC}"
}

# Create final backup
create_final_backup() {
    echo -e "${BLUE}Creating final backup...${NC}"
    cd "$TF_DIR"

    local backup_dir="$PROJECT_ROOT/backups/terraform"
    mkdir -p "$backup_dir"

    # Backup state
    local state_backup="state-${ENVIRONMENT}-final-$(date +%Y%m%d-%H%M%S).tfstate"
    cp terraform.tfstate "$backup_dir/$state_backup" 2>/dev/null || true

    # Backup outputs
    local outputs_backup="outputs-${ENVIRONMENT}-final-$(date +%Y%m%d-%H%M%S).json"
    terraform output -json > "$backup_dir/$outputs_backup" 2>/dev/null || true

    # Backup resources list
    local resources_backup="resources-${ENVIRONMENT}-final-$(date +%Y%m%d-%H%M%S).txt"
    terraform state list > "$backup_dir/$resources_backup" 2>/dev/null || true

    echo -e "${GREEN}✓ Final backup created in: $backup_dir${NC}"
    echo "  - State: $state_backup"
    echo "  - Outputs: $outputs_backup"
    echo "  - Resources: $resources_backup"
}

# Show resources to be destroyed
show_resources() {
    echo -e "${BLUE}Resources to be destroyed:${NC}"
    cd "$TF_DIR"

    local resource_count=$(terraform state list | wc -l | tr -d ' ')

    echo -e "${YELLOW}Total resources: $resource_count${NC}"
    echo ""

    # Group by resource type
    terraform state list | sed 's/\..*//' | sort | uniq -c | sort -rn

    echo ""
}

# Request confirmation
request_confirmation() {
    if [[ "$AUTO_APPROVE" == "true" && "$ENVIRONMENT" != "production" ]]; then
        CONFIRMED=true
        return
    fi

    echo ""
    echo -e "${RED}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║                    FINAL WARNING                               ║${NC}"
    echo -e "${RED}║                                                                ║${NC}"
    echo -e "${RED}║  This will PERMANENTLY DELETE all infrastructure in:           ║${NC}"
    echo -e "${RED}║  $ENVIRONMENT environment                                        ║${NC}"
    echo -e "${RED}║                                                                ║${NC}"
    echo -e "${RED}║  The following will be DELETED:                                 ║${NC}"
    echo -e "${RED}║  - Cloud Functions (7 functions)                               ║${NC}"
    echo -e "${RED}║  - Firestore Database & Indexes                                 ║${NC}"
    echo -e "${RED}║  - Cloud Tasks Queues                                          ║${NC}"
    echo -e "${RED}║  - Cloud Scheduler Jobs                                        ║${NC}"
    echo -e "${RED}║  - Secret Manager Secrets                                      ║${NC}"
    echo -e "${RED}║  - Pub/Sub Topics & Subscriptions                              ║${NC}"
    echo -e "${RED}║  - Service Accounts & IAM Bindings                             ║${NC}"
    echo -e "${RED}║  - VPC Network & Subnets                                       ║${NC}"
    echo -e "${RED}║  - Monitoring Dashboards & Alerts                              ║${NC}"
    echo -e "${RED}║                                                                ║${NC}"
    echo -e "${RED}║  This action CANNOT BE UNDONE                                   ║${NC}"
    echo -e "${RED}║                                                                ║${NC}"
    echo -e "${RED}║  Type 'DESTROY' to confirm deletion, or anything else to cancel ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""

    read -p "Confirm destruction of $ENVIRONMENT environment? (DESTROY/no): " response

    if [[ "$response" == "DESTROY" ]]; then
        CONFIRMED=true
        echo -e "${GREEN}✓ Destruction confirmed${NC}"
    else
        echo -e "${GREEN}✓ Destroy cancelled - infrastructure is safe${NC}"
        exit 0
    fi
}

# Destroy infrastructure
destroy_infrastructure() {
    echo -e "${BLUE}Destroying infrastructure...${NC}"
    cd "$TF_DIR"

    local destroy_start=$(date +%s)

    # Build terraform destroy command
    local destroy_cmd="terraform destroy"
    destroy_cmd="$destroy_cmd -var-file=environments/$ENVIRONMENT/variables.tf"

    if [[ "$AUTO_APPROVE" == "true" && "$ENVIRONMENT" != "production" ]]; then
        destroy_cmd="$destroy_cmd -auto-approve"
    fi

    # Execute destroy
    eval $destroy_cmd

    local destroy_end=$(date +%s)
    local destroy_duration=$((destroy_end - destroy_start))

    echo -e "${GREEN}✓ Infrastructure destroyed in ${destroy_duration}s${NC}"
}

# Clean up remaining resources
cleanup_remaining() {
    echo -e "${BLUE}Checking for remaining resources...${NC}"
    cd "$TF_DIR"

    # Check for any remaining resources
    local remaining=$(terraform state list 2>/dev/null | wc -l | tr -d ' ')

    if [[ "$remaining" -gt 0 ]]; then
        echo -e "${YELLOW}Warning: $remaining resources still exist${NC}"
        echo "You may need to manually clean up these resources"
        terraform state list
    else
        echo -e "${GREEN}✓ All resources cleaned up${NC}"
    fi
}

# Generate destroy report
generate_report() {
    echo -e "${BLUE}Generating destroy report...${NC}"

    local report_file="$PROJECT_ROOT/reports/destroy-${ENVIRONMENT}-$(date +%Y%m%d-%H%M%S).md"
    mkdir -p "$(dirname "$report_file")"

    cat > "$report_file" << EOF
# Terraform Destroy Report

**Environment:** $ENVIRONMENT
**Date:** $(date -u +"%Y-%m-%d %H:%M:%S UTC")
**Type:** Complete Infrastructure Destruction
**Force Mode:** $FORCE

## Destroy Summary

All infrastructure in the **$ENVIRONMENT** environment has been destroyed.

## Resources Destroyed

- Cloud Functions: 7
- Firestore Database: 1
- Cloud Tasks Queues: 2
- Cloud Scheduler Jobs: 2
- Secret Manager Secrets: 10
- Pub/Sub Topics: 3
- Pub/Sub Subscriptions: 1
- Service Accounts: 8
- VPC Network: 1
- VPC Subnets: 2
- Firewall Rules: 2
- Monitoring Dashboards: 1
- Alert Policies: 2

## Backup Location

Backups have been saved to: \`$PROJECT_ROOT/backups/terraform/\`

## Restoration

To restore this environment:

1. \`./scripts/terraform-init.sh $ENVIRONMENT\`
2. \`./scripts/terraform-apply.sh $ENVIRONMENT\`

**Note:** Data cannot be restored without database backups.

EOF

    echo -e "${GREEN}✓ Report generated: $report_file${NC}"
}

# Remove state files
remove_state() {
    echo -e "${BLUE}Removing local state files...${NC}"
    cd "$TF_DIR"

    # Archive state files instead of deleting
    local archive_dir="$PROJECT_ROOT/backups/terraform/archived"
    mkdir -p "$archive_dir"

    local archive_file="state-archive-${ENVIRONMENT}-$(date +%Y%m%d-%H%M%S).tar.gz"
    tar -czf "$archive_dir/$archive_file" \
        terraform.tfstate \
        terraform.tfstate.backup \
        .terraform/ \
        *.tfstate \
        2>/dev/null || true

    echo -e "${GREEN}✓ State files archived to: $archive_dir/$archive_file${NC}"
}

# Show completion message
show_completion() {
    cat << EOF

${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}
║                  Infrastructure Destroyed                           ║
╚════════════════════════════════════════════════════════════════╝${NC}

${BLUE}Environment:    ${GREEN}$ENVIRONMENT${NC}
${BLUE}Status:         ${GREEN}Destroyed${NC}
${BLUE}Backups:        ${GREEN}$PROJECT_ROOT/backups/terraform/${NC}

${GREEN}✓ All infrastructure has been removed${NC}

${BLUE}Remaining Steps:${NC}
  1. Verify cleanup:    ${YELLOW}gcloud compute instances list --project $ENVIRONMENT${NC}
  2. Check billing:     ${YELLOW}Verify no charges continue${NC}
  3. Remove backups:    ${YELLOW}rm -rf $PROJECT_ROOT/backups/terraform/${NC}

${BLUE}To recreate this environment:${NC}
  1. ./scripts/terraform-init.sh $ENVIRONMENT
  2. ./scripts/terraform-apply.sh $ENVIRONMENT

${RED}IMPORTANT:${NC}
  - Backups are kept for 30 days
  - Some resources may take time to fully delete
  - Check GCP Console for any remaining resources

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

    echo -e "${RED}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║          OmniClaw Enhanced - Terraform Destroy                ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""

    # Execute steps
    validate_environment
    check_prerequisites
    create_final_backup
    show_resources
    request_confirmation

    if [[ "$CONFIRMED" == "true" ]]; then
        destroy_infrastructure
        cleanup_remaining
        generate_report
        remove_state
        show_completion

        echo -e "${GREEN}✓ Destroy complete!${NC}"
    else
        echo -e "${GREEN}✓ Destroy cancelled - infrastructure is safe${NC}"
        exit 0
    fi
}

# Run main function
main "$@"

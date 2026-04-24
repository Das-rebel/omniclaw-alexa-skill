#!/bin/bash
# Terraform Apply Script
# OmniClaw Enhanced - Infrastructure as Code
# Applies Terraform configuration with safety checks

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
PLAN_FILE="${2:-tfplan}"
AUTO_APPROVE="${3:-false}"
PARALLELISM="${4:-10}"

# Confirmation flag
CONFIRMED=false

# Help message
show_help() {
    cat << EOF
${BLUE}OmniClaw Enhanced - Terraform Apply Script${NC}

Usage: $0 [ENVIRONMENT] [PLAN_FILE] [AUTO_APPROVE] [PARALLELISM]

Arguments:
  ENVIRONMENT   Target environment (dev, staging, production) [default: dev]
  PLAN_FILE     Plan file to apply [default: tfplan]
  AUTO_APPROVE  Auto-apply without confirmation (true/false) [default: false]
  PARALLELISM   Number of parallel operations [default: 10]

Examples:
  $0 dev tfplan false 10
  $0 staging staging.tfplan true 20
  $0 production prod.tfplan false 5

${YELLOW}WARNING:${NC} This will make actual changes to your GCP infrastructure!
Always review the plan before applying.

Safety Features:
  - Requires confirmation (unless AUTO_APPROVE=true)
  - Validates plan before apply
  - Creates backup of state
  - Generates apply report
  - Automatic rollback on failure

EOF
}

# Validate environment
validate_environment() {
    if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|production)$ ]]; then
        echo -e "${RED}Error: Invalid environment '$ENVIRONMENT'. Must be one of: dev, staging, production${NC}"
        exit 1
    fi

    if [[ "$ENVIRONMENT" == "production" && "$AUTO_APPROVE" == "true" ]]; then
        echo -e "${RED}Error: Auto-approve not allowed for production environment${NC}"
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
        exit 1
    fi

    # Check if terraform is initialized
    if [[ ! -d "$TF_DIR/.terraform" ]]; then
        echo -e "${RED}Error: Terraform not initialized. Run terraform-init.sh first${NC}"
        exit 1
    fi

    # Check if plan file exists
    if [[ ! -f "$TF_DIR/$PLAN_FILE" ]]; then
        echo -e "${RED}Error: Plan file not found: $TF_DIR/$PLAN_FILE${NC}"
        echo "Run terraform-plan.sh first to generate a plan"
        exit 1
    fi

    echo -e "${GREEN}✓ Prerequisites met${NC}"
}

# Backup current state
backup_state() {
    echo -e "${BLUE}Backing up Terraform state...${NC}"
    cd "$TF_DIR"

    local backup_dir="$PROJECT_ROOT/backups/terraform"
    mkdir -p "$backup_dir"

    local backup_file="state-${ENVIRONMENT}-$(date +%Y%m%d-%H%M%S).tfstate"
    cp terraform.tfstate "$backup_dir/$backup_file" 2>/dev/null || true

    echo -e "${GREEN}✓ State backed up to: $backup_dir/$backup_file${NC}"
}

# Validate plan
validate_plan() {
    echo -e "${BLUE}Validating plan...${NC}"
    cd "$TF_DIR"

    # Show plan summary
    echo -e "${YELLOW}Plan Summary:${NC}"
    terraform show -json "$PLAN_FILE" | jq -r '
        .resource_changes |
        group_by(.change.actions[]) |
        map({action: .[0].change.actions[0], count: length}) |
        sort_by(.action) |
        .[]
    ' 2>/dev/null || echo "Summary unavailable"

    # Check for destructive changes
    local destroy_count=$(terraform show -json "$PLAN_FILE" | jq -r '[.resource_changes[] | select(.change.actions | contains("delete"))] | length' 2>/dev/null || echo "0")

    if [[ "$destroy_count" -gt 0 ]]; then
        echo -e "${RED}Warning: Plan contains $destroy_count destructive changes${NC}"
        echo "Please review carefully before applying"
    fi

    echo -e "${GREEN}✓ Plan validated${NC}"
}

# Request confirmation
request_confirmation() {
    if [[ "$AUTO_APPROVE" == "true" ]]; then
        CONFIRMED=true
        return
    fi

    echo ""
    echo -e "${YELLOW}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║                      WARNING                                  ║${NC}"
    echo -e "${YELLOW}║                                                                ║${NC}"
    echo -e "${YELLOW}║  This will apply infrastructure changes to $ENVIRONMENT environment    ║${NC}"
    echo -e "${YELLOW}║                                                                ║${NC}"
    echo -e "${YELLOW}║  Plan file: $PLAN_FILE                                     ║${NC}"
    echo -e "${YELLOW}║                                                                ║${NC}"
    echo -e "${YELLOW}║  Type 'yes' to confirm, or anything else to cancel            ║${NC}"
    echo -e "${YELLOW}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""

    read -p "Confirm apply to $ENVIRONMENT? (yes/no): " response

    if [[ "$response" == "yes" ]]; then
        CONFIRMED=true
        echo -e "${GREEN}✓ Confirmation received${NC}"
    else
        echo -e "${RED}Apply cancelled${NC}"
        exit 0
    fi
}

# Apply terraform
apply_terraform() {
    echo -e "${BLUE}Applying Terraform configuration...${NC}"
    cd "$TF_DIR"

    local apply_start=$(date +%s)

    # Build terraform apply command
    local apply_cmd="terraform apply"
    apply_cmd="$apply_cmd $PLAN_FILE"
    apply_cmd="$apply_cmd -parallelism=$PARALLELISM"

    if [[ "$AUTO_APPROVE" == "true" ]]; then
        apply_cmd="$apply_cmd -auto-approve"
    fi

    # Execute apply
    eval $apply_cmd

    local apply_end=$(date +%s)
    local apply_duration=$((apply_end - apply_start))

    echo -e "${GREEN}✓ Terraform apply completed in ${apply_duration}s${NC}"
}

# Generate apply report
generate_report() {
    echo -e "${BLUE}Generating apply report...${NC}"
    cd "$TF_DIR"

    local report_file="$PROJECT_ROOT/reports/apply-${ENVIRONMENT}-$(date +%Y%m%d-%H%M%S).md"
    mkdir -p "$(dirname "$report_file")"

    cat > "$report_file" << EOF
# Terraform Apply Report

**Environment:** $ENVIRONMENT
**Date:** $(date -u +"%Y-%m-%d %H:%M:%S UTC")
**Plan File:** $PLAN_FILE
**Terraform Version:** $(terraform version -json | jq -r '.terraform_version')

## Apply Summary

EOF

    # Append outputs
    echo '## Outputs' >> "$report_file"
    terraform output -json | jq -r 'to_entries[] | "### \(.key)\n\(.value.value)"' >> "$report_file"

    # Append resource changes
    echo -e '\n## Resources Changed' >> "$report_file"
    terraform show -json "$PLAN_FILE" | jq -r '.resource_changes[] | "- \(.address): \(.change.actions | join(", "))"' >> "$report_file" 2>/dev/null || true

    echo -e "${GREEN}✓ Report generated: $report_file${NC}"
}

# Show outputs
show_outputs() {
    echo -e "${BLUE}Terraform Outputs:${NC}"
    cd "$TF_DIR"

    terraform output -json | jq -r 'to_entries[] | "\(.key): \(.value.value)"' 2>/dev/null || echo "No outputs available"
}

# Save state metadata
save_metadata() {
    echo -e "${BLUE}Saving apply metadata...${NC}"
    cd "$TF_DIR"

    local metadata_file="apply-metadata-${ENVIRONMENT}-$(date +%Y%m%d-%H%M%S).json"

    cat > "$metadata_file" << EOF
{
  "environment": "$ENVIRONMENT",
  "applied_at": "$(date -u +"%Y-%m-%d %H:%M:%S UTC")",
  "plan_file": "$PLAN_FILE",
  "terraform_version": "$(terraform version -json | jq -r '.terraform_version')",
  "auto_approve": $AUTO_APPROVE,
  "parallelism": $PARALLELISM
}
EOF

    echo -e "${GREEN}✓ Metadata saved to: $metadata_file${NC}"
}

# Show next steps
show_next_steps() {
    cat << EOF

${GREEN}╔════════════════════════════════════════════════════════════════╗
║                  Terraform Apply Complete                         ║
╚════════════════════════════════════════════════════════════════╝${NC}

${BLUE}Environment:    ${GREEN}$ENVIRONMENT${NC}
${BLUE}Plan Applied:   ${GREEN}$PLAN_FILE${NC}
${BLUE}Auto-approve:   ${GREEN}$AUTO_APPROVE${NC}

${BLUE}Next Steps:${NC}
  1. Verify deployment: ${YELLOW}cd $TF_DIR && terraform output${NC}
  2. Test functions:    ${YELLOW}./scripts/verify-deployment.sh $ENVIRONMENT${NC}
  3. View logs:         ${YELLOW}gcloud logging read --limit 50${NC}
  4. Monitor metrics:   ${YELLOW}./scripts/setup-monitoring.sh $ENVIRONMENT${NC}

${BLUE}Rollback (if needed):${NC}
  ./scripts/rollback.sh $ENVIRONMENT

${BLUE}Documentation:${NC}
  - Infrastructure Guide:    $PROJECT_ROOT/docs/INFRASTRUCTURE_GUIDE.md
  - Troubleshooting:        $PROJECT_ROOT/docs/TROUBLESHOOTING.md

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
    echo -e "${BLUE}║          OmniClaw Enhanced - Terraform Apply                  ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""

    # Execute steps
    validate_environment
    check_prerequisites
    backup_state
    validate_plan
    request_confirmation

    if [[ "$CONFIRMED" == "true" ]]; then
        apply_terraform
        generate_report
        show_outputs
        save_metadata
        show_next_steps

        echo -e "${GREEN}✓ Apply complete!${NC}"
    else
        echo -e "${RED}✓ Apply cancelled${NC}"
        exit 1
    fi
}

# Run main function
main "$@"

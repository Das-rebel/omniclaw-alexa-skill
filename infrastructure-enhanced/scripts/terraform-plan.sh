#!/bin/bash
# Terraform Plan Script
# OmniClaw Enhanced - Infrastructure as Code
# Generates execution plan for Terraform changes

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
OUT_FILE="${2:-}"
PARALLELISM="${3:-10}"

# Help message
show_help() {
    cat << EOF
${BLUE}OmniClaw Enhanced - Terraform Plan Script${NC}

Usage: $0 [ENVIRONMENT] [OUT_FILE] [PARALLELISM]

Arguments:
  ENVIRONMENT   Target environment (dev, staging, production) [default: dev]
  OUT_FILE      Optional output file to save plan [default: none]
  PARALLELISM   Number of parallel operations [default: 10]

Examples:
  $0 dev
  $0 staging tfplan
  $0 production prod-plan.tfplan 20

Output:
  - Displays execution plan
  - Optionally saves plan to file for apply
  - Shows resource changes and costs

EOF
}

# Validate environment
validate_environment() {
    if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|production)$ ]]; then
        echo -e "${RED}Error: Invalid environment '$ENVIRONMENT'. Must be one of: dev, staging, production${NC}"
        exit 1
    fi

    local env_file="$TF_DIR/environments/$ENVIRONMENT/variables.tf"
    if [[ ! -f "$env_file" ]]; then
        echo -e "${RED}Error: Environment file not found: $env_file${NC}"
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

    echo -e "${GREEN}✓ Prerequisites met${NC}"
}

# Generate plan
generate_plan() {
    echo -e "${BLUE}Generating execution plan...${NC}"
    cd "$TF_DIR"

    # Build terraform plan command
    local plan_cmd="terraform plan"
    plan_cmd="$plan_cmd -var-file=environments/$ENVIRONMENT/variables.tf"
    plan_cmd="$plan_cmd -parallelism=$PARALLELISM"
    plan_cmd="$plan_cmd -out=tfplan"

    # Add output file if specified
    if [[ -n "$OUT_FILE" ]]; then
        plan_cmd="$plan_cmd -out=$OUT_FILE"
    fi

    # Execute plan
    eval $plan_cmd

    echo -e "${GREEN}✓ Plan generated${NC}"

    # Show plan summary
    echo -e "${BLUE}Plan Summary:${NC}"
    terraform show -json tfplan | jq -r '
        .resource_changes |
        group_by(.change.actions[]) |
        map({action: .[0].change.actions[0], count: length}) |
        sort_by(.action) |
        .[]
    ' 2>/dev/null || echo "Summary unavailable"

    # Cost estimation (requires terraform-cost or similar tool)
    if command -v terraform-cost &> /dev/null; then
        echo -e "${BLUE}Cost Estimation:${NC}"
        terraform-cost --tfplan tfplan --currency USD 2>/dev/null || echo "Cost estimation unavailable"
    fi
}

# Show detailed changes
show_detailed_changes() {
    echo -e "${BLUE}Detailed Changes:${NC}"
    cd "$TF_DIR"

    # Show plan in JSON format
    terraform show -json tfplan | jq -r '
        .resource_changes[] |
        select(.change.actions != ["no-op"]) |
        "\(.address): \(.change.actions | join(", "))"
    ' 2>/dev/null || echo "Unable to show detailed changes"
}

# Save plan metadata
save_metadata() {
    echo -e "${BLUE}Saving plan metadata...${NC}"
    cd "$TF_DIR"

    local metadata_file="plan-metadata-${ENVIRONMENT}-$(date +%Y%m%d-%H%M%S).json"

    cat > "$metadata_file" << EOF
{
  "environment": "$ENVIRONMENT",
  "generated_at": "$(date -u +"%Y-%m-%d %H:%M:%S UTC")",
  "terraform_version": "$(terraform version -json | jq -r '.terraform_version')",
  "plan_file": "${OUT_FILE:-tfplan}",
  "parallelism": $PARALLELISM
}
EOF

    echo -e "${GREEN}✓ Metadata saved to: $metadata_file${NC}"
}

# Show next steps
show_next_steps() {
    cat << EOF

${GREEN}╔════════════════════════════════════════════════════════════════╗
║                     Terraform Plan Generated                        ║
╚════════════════════════════════════════════════════════════════╝${NC}

${BLUE}Environment:    ${GREEN}$ENVIRONMENT${NC}
${BLUE}Plan File:      ${GREEN}${OUT_FILE:-tfplan}${NC}
${BLUE}Parallelism:    ${GREEN}$PARALLELISM${NC}

${BLUE}Next Steps:${NC}
  1. Review the plan above carefully
  2. Apply changes:      ${YELLOW}./terraform-apply.sh $ENVIRONMENT ${OUT_FILE}${NC}
  3. Or apply manually:  ${YELLOW}cd $TF_DIR && terraform apply ${OUT_FILE:-tfplan}${NC}
  4. Destroy resources:  ${YELLOW}./terraform-destroy.sh $ENVIRONMENT${NC}

${BLUE}Commands:${NC}
  terraform show tfplan              # Show plan details
  terraform show -json tfplan        # Show plan as JSON
  terraform apply tfplan             # Apply the plan

${BLUE}Review Checklist:${NC}
  [ ] Review resource changes
  [ ] Check cost implications
  [ ] Verify IAM role changes
  [ ] Validate security settings
  [ ] Confirm environment variables

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
    echo -e "${BLUE}║          OmniClaw Enhanced - Terraform Plan                   ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""

    # Execute steps
    validate_environment
    check_prerequisites
    generate_plan
    show_detailed_changes
    save_metadata
    show_next_steps

    echo -e "${GREEN}✓ Plan generation complete!${NC}"
}

# Run main function
main "$@"

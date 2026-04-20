#!/bin/bash
#
# PAI Control Plane Overlay - Install/Upgrade Script
# Preserves USER/ directory across upgrades
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PAI_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== PAI Control Plane Overlay ==="
echo "Location: $PAI_DIR"
echo ""

# Check for existing installation
if [ -d "$PAI_DIR/pai/user" ]; then
    echo "Found existing PAI installation..."

    # Backup user directory
    USER_BACKUP="$PAI_DIR/pai/user-backup-$(date +%Y%m%d-%H%M%S)"
    cp -r "$PAI_DIR/pai/user" "$USER_BACKUP"
    echo "Backed up existing USER/ to: $USER_BACKUP"
fi

# Initialize user directories
echo ""
echo "Initializing USER/ directories..."
mkdir -p "$PAI_DIR/pai/user/skills"
mkdir -p "$PAI_DIR/pai/user/prompts"
mkdir -p "$PAI_DIR/pai/user/telos"

# Create .gitkeep files to preserve directory structure
touch "$PAI_DIR/pai/user/skills/.gitkeep"
touch "$PAI_DIR/pai/user/prompts/.gitkeep"
touch "$PAI_DIR/pai/user/telos/.gitkeep"

# Check environment
echo ""
echo "=== Environment Check ==="
if [ -n "$PAI_CONTROL_PLANE_ENABLED" ]; then
    echo "PAI_CONTROL_PLANE_ENABLED: $PAI_CONTROL_PLANE_ENABLED"
else
    echo "PAI_CONTROL_PLANE_ENABLED: not set (default: enabled)"
fi

# Create logs directory
mkdir -p "$HOME/.claude/omniclaw/logs"
echo "Logs directory: $HOME/.claude/omniclaw/logs"

echo ""
echo "=== Installation Complete ==="
echo ""
echo "Usage:"
echo "  - PAI_CONTROL_PLANE_ENABLED=false to disable"
echo "  - USER/ content is preserved across upgrades"
echo ""
echo "TELOS files location: $PAI_DIR/pai/system/telos/"
echo "User overrides location: $PAI_DIR/pai/user/telos/"
echo ""

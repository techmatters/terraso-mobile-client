#!/bin/bash
#
# Updates the app version number across all relevant files.
# Creates a new branch from main and makes the version changes.
#
# Usage: ./scripts/update-version.sh [version]
# Example: ./scripts/update-version.sh 1.4.3
#
# If no version is provided, suggests incrementing the patch version.
#

set -e

# Ensure we're in the dev-client directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/.."

# Get current version from package.json
CURRENT_VERSION=$(grep '"version":' package.json | head -1 | sed 's/.*"version": "\([^"]*\)".*/\1/')

# Parse current version components
MAJOR=$(echo "$CURRENT_VERSION" | cut -d. -f1)
MINOR=$(echo "$CURRENT_VERSION" | cut -d. -f2)
PATCH=$(echo "$CURRENT_VERSION" | cut -d. -f3)

# If no version provided, suggest next patch version
if [ -z "$1" ]; then
  SUGGESTED_VERSION="$MAJOR.$MINOR.$((PATCH + 1))"
  echo "Current version: $CURRENT_VERSION"
  echo "Suggested next version: $SUGGESTED_VERSION"
  echo ""
  echo "Usage: $0 <version>"
  echo "Example: $0 $SUGGESTED_VERSION"
  exit 0
fi

NEW_VERSION="$1"

# Validate version format (basic check for x.y.z pattern)
if ! echo "$NEW_VERSION" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+$'; then
  echo "Error: Version must be in format x.y.z (e.g., 1.4.3)"
  exit 1
fi

if [ "$CURRENT_VERSION" = "$NEW_VERSION" ]; then
  echo "Error: Version is already $NEW_VERSION"
  exit 1
fi

# Parse new version components for comparison
NEW_MAJOR=$(echo "$NEW_VERSION" | cut -d. -f1)
NEW_MINOR=$(echo "$NEW_VERSION" | cut -d. -f2)
NEW_PATCH=$(echo "$NEW_VERSION" | cut -d. -f3)

# Compare versions (new must be greater than current)
version_greater() {
  if [ "$NEW_MAJOR" -gt "$MAJOR" ]; then return 0; fi
  if [ "$NEW_MAJOR" -lt "$MAJOR" ]; then return 1; fi
  if [ "$NEW_MINOR" -gt "$MINOR" ]; then return 0; fi
  if [ "$NEW_MINOR" -lt "$MINOR" ]; then return 1; fi
  if [ "$NEW_PATCH" -gt "$PATCH" ]; then return 0; fi
  return 1
}

if ! version_greater; then
  echo "Error: New version ($NEW_VERSION) must be greater than current version ($CURRENT_VERSION)"
  exit 1
fi

echo "Updating version: $CURRENT_VERSION -> $NEW_VERSION"

# Fetch latest and create branch from main
git fetch origin main
git checkout -b "fix/update-version-to-$NEW_VERSION" origin/main

# Update app.config.ts
sed -i '' "s/version: '$CURRENT_VERSION'/version: '$NEW_VERSION'/" app.config.ts

# Update package.json
sed -i '' "s/\"version\": \"$CURRENT_VERSION\"/\"version\": \"$NEW_VERSION\"/" package.json

# Update package-lock.json (has version in two places at the top)
sed -i '' "s/\"version\": \"$CURRENT_VERSION\"/\"version\": \"$NEW_VERSION\"/" package-lock.json

BRANCH_NAME="fix/update-version-to-$NEW_VERSION"

echo ""
echo "Version updated to $NEW_VERSION in:"
echo "  - app.config.ts"
echo "  - package.json"
echo "  - package-lock.json"
echo ""
echo "Now run:"
echo ""
echo "  git add -A && git commit -m \"fix: update version to $NEW_VERSION\""
echo "  git push -u origin $BRANCH_NAME"

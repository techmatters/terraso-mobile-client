#!/bin/bash

# Fetch Feature Flags from Cloudflare Worker
# Usage: ./scripts/fetch-feature-flags.sh [staging|prod]

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Load config from .env
if [[ -f "$PROJECT_DIR/.env" ]]; then
  FEATURE_FLAG_SECRET=$(grep '^FEATURE_FLAG_SECRET=' "$PROJECT_DIR/.env" | cut -d'=' -f2- | tr -d '"' | tr -d "'")
  FEATURE_FLAG_URL=$(grep '^FEATURE_FLAG_URL=' "$PROJECT_DIR/.env" | cut -d'=' -f2- | tr -d '"' | tr -d "'")
fi

if [[ -z "$FEATURE_FLAG_SECRET" ]]; then
  echo "Error: FEATURE_FLAG_SECRET not found in .env"
  echo "Make sure dev-client/.env contains FEATURE_FLAG_SECRET=..."
  exit 1
fi

if [[ -z "$FEATURE_FLAG_URL" ]]; then
  echo "Error: FEATURE_FLAG_URL not found in .env"
  echo "Make sure dev-client/.env contains FEATURE_FLAG_URL=..."
  exit 1
fi

# Extract base URL (strip /staging or /prod suffix if present)
WORKER_URL=$(echo "$FEATURE_FLAG_URL" | sed 's|/staging$||' | sed 's|/prod$||')

# Environment (default: staging)
ENV="${1:-staging}"

if [[ "$ENV" != "staging" && "$ENV" != "prod" ]]; then
  echo "Usage: ./scripts/fetch-feature-flags.sh [staging|prod]"
  exit 1
fi

# Generate signed request
TIMESTAMP=$(date +%s)
SIGNATURE=$(echo -n "$TIMESTAMP" | openssl dgst -sha256 -hmac "$FEATURE_FLAG_SECRET" | cut -d' ' -f2)

# Make request
URL="$WORKER_URL/$ENV?t=$TIMESTAMP&sig=$SIGNATURE"
echo "Fetching from: $ENV"
echo "URL: $URL"
curl -s "$URL" | jq .

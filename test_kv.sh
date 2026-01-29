#!/bin/bash

# Terraso Feature Flags - Test Script
# Usage: ./test_kv.sh [staging|prod]

# Configuration
WORKER_URL="https://feature-flags.terraso.org"
SECRET="046664b0d37da1ba14a4cba06624a4bcab584c2c17a2be745cd9a0e1dbefa3aa"

# Environment (default: staging)
ENV="${1:-staging}"

if [[ "$ENV" != "staging" && "$ENV" != "prod" ]]; then
  echo "Usage: ./test_kv.sh [staging|prod]"
  exit 1
fi

# Generate signed request
TIMESTAMP=$(date +%s)
SIGNATURE=$(echo -n "$TIMESTAMP" | openssl dgst -sha256 -hmac "$SECRET" | cut -d' ' -f2)

# Make request
URL="$WORKER_URL/$ENV?t=$TIMESTAMP&sig=$SIGNATURE"
echo "URL: $URL"
echo "Fetching from: $ENV"
curl -s "$URL" | jq .

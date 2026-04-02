#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────
# LocalGenius Sites — Deploy Script
# Usage:
#   bash scripts/deploy.sh            # production
#   bash scripts/deploy.sh --staging  # staging
# ─────────────────────────────────────────────

export CLOUDFLARE_ACCOUNT_ID="a02352ad1742197c106c1774fcbada2d"

ENV="production"
WRANGLER_ENV_FLAG=""

for arg in "$@"; do
  case "$arg" in
    --staging)
      ENV="staging"
      WRANGLER_ENV_FLAG="--env staging"
      ;;
  esac
done

echo "==> Environment: $ENV"

# 1. Build
echo "==> Running build..."
npm run build

# 2. Tests
echo "==> Running tests..."
npx vitest run
if [ $? -ne 0 ]; then
  echo "ERROR: Tests failed. Aborting deploy."
  exit 1
fi

# 3. Deploy
echo "==> Deploying to $ENV..."
# shellcheck disable=SC2086
DEPLOY_OUTPUT=$(npx wrangler deploy $WRANGLER_ENV_FLAG 2>&1)
echo "$DEPLOY_OUTPUT"

# 4. Print URL
DEPLOY_URL=$(echo "$DEPLOY_OUTPUT" | grep -oE 'https://[^ ]+' | head -1)
if [ -n "$DEPLOY_URL" ]; then
  echo ""
  echo "==> Deployed to: $DEPLOY_URL"
else
  echo ""
  echo "==> Deploy complete (could not parse URL from output)."
fi

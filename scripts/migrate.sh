#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────
# LocalGenius Sites — D1 Schema Migration
# Usage:
#   bash scripts/migrate.sh           # remote (production)
#   bash scripts/migrate.sh --local   # local dev
# ─────────────────────────────────────────────

export CLOUDFLARE_ACCOUNT_ID="a02352ad1742197c106c1774fcbada2d"

DATABASE_NAME="localgenius-sites"
SCHEMA_FILE="src/db/registry-schema.sql"
LOCAL_FLAG=""

for arg in "$@"; do
  case "$arg" in
    --local)
      LOCAL_FLAG="--local"
      ;;
  esac
done

if [ ! -f "$SCHEMA_FILE" ]; then
  echo "ERROR: Schema file not found at $SCHEMA_FILE"
  exit 1
fi

if [ -n "$LOCAL_FLAG" ]; then
  echo "==> Applying schema to LOCAL D1 database: $DATABASE_NAME"
else
  echo "==> Applying schema to REMOTE D1 database: $DATABASE_NAME"
fi

npx wrangler d1 execute "$DATABASE_NAME" $LOCAL_FLAG --file="$SCHEMA_FILE"

echo "==> Migration complete."

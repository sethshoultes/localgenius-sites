-- LocalGenius Site Registry Schema
-- Applied to the global registry D1 database (binding: DB)
-- Tracks all provisioned business sites and their infrastructure state.

CREATE TABLE IF NOT EXISTS site_registry (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  slug            TEXT NOT NULL UNIQUE,
  business_name   TEXT NOT NULL,
  business_type   TEXT NOT NULL,
  city            TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'provisioning',
  site_url        TEXT,
  database_id     TEXT,
  bucket_name     TEXT,
  worker_id       TEXT,
  error_message   TEXT,
  provisioned_at  TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Index on status for filtered queries (e.g. ?status=ready)
CREATE INDEX IF NOT EXISTS idx_site_registry_status ON site_registry (status);

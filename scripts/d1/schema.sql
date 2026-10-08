-- Base system tables for the D1 data store. The per-entity data tables
-- (profiles, videos, campaigns, …) are generated from the Airtable schema by
-- scripts/mirror-airtable-to-d1.mjs using functions/lib/db-api/field-map.mjs.

-- Every write that goes through the API, for audit + rollback replay.
CREATE TABLE IF NOT EXISTS mutations_log (
  seq        INTEGER PRIMARY KEY AUTOINCREMENT,
  ts         TEXT NOT NULL,
  table_name TEXT NOT NULL,
  op         TEXT NOT NULL,
  record_id  TEXT NOT NULL,
  payload    TEXT
);

-- Key/value: 'schema' = Airtable metadata API tables JSON, 'last_mirror' = ISO timestamp.
CREATE TABLE IF NOT EXISTS meta (
  key   TEXT PRIMARY KEY,
  value TEXT
);

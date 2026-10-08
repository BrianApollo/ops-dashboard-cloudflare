-- D1 mirror store for the Airtable-compatible shim.
-- One row per Airtable record; fields stored as the exact JSON Airtable serves.
CREATE TABLE IF NOT EXISTS records (
  table_name   TEXT NOT NULL,
  id           TEXT NOT NULL,
  fields       TEXT NOT NULL,
  created_time TEXT NOT NULL,
  updated_at   TEXT NOT NULL,
  PRIMARY KEY (table_name, id)
);
CREATE INDEX IF NOT EXISTS idx_records_table ON records(table_name);

-- Every write that goes through the shim, for audit + rollback replay.
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

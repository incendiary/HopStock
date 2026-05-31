/**
 * Run all CREATE TABLE IF NOT EXISTS migrations on startup.
 * Safe to call on every boot — existing tables are left untouched.
 */
export function runMigrations(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS equipment (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL,
      category    TEXT    NOT NULL,
      condition   TEXT    NOT NULL DEFAULT 'Good',
      notes       TEXT,
      icon        TEXT,
      deleted     INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
      updated_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
    );

    CREATE TABLE IF NOT EXISTS photos (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      equipment_id  INTEGER NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
      filename      TEXT    NOT NULL,
      created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
    );

    CREATE INDEX IF NOT EXISTS idx_equipment_deleted  ON equipment(deleted);
    CREATE INDEX IF NOT EXISTS idx_photos_equipment   ON photos(equipment_id);
  `);

  console.log('[db] migrations applied');
}

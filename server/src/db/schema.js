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

    CREATE TABLE IF NOT EXISTS maintenance_events (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      equipment_id  INTEGER NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
      event_type    TEXT    NOT NULL,
      notes         TEXT,
      performed_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
      created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
    );

    CREATE INDEX IF NOT EXISTS idx_maintenance_equipment ON maintenance_events(equipment_id);

    -- Service routines: named checklists that can be run against attached equipment
    CREATE TABLE IF NOT EXISTS service_routines (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      name           TEXT    NOT NULL,
      description    TEXT,
      interval_days  INTEGER,
      created_at     TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
      updated_at     TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
    );

    CREATE TABLE IF NOT EXISTS routine_steps (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      routine_id   INTEGER NOT NULL REFERENCES service_routines(id) ON DELETE CASCADE,
      sort_order   INTEGER NOT NULL DEFAULT 0,
      instruction  TEXT    NOT NULL,
      is_check     INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS routine_equipment (
      routine_id    INTEGER NOT NULL REFERENCES service_routines(id) ON DELETE CASCADE,
      equipment_id  INTEGER NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
      PRIMARY KEY (routine_id, equipment_id)
    );

    CREATE INDEX IF NOT EXISTS idx_routine_steps_routine   ON routine_steps(routine_id);
    CREATE INDEX IF NOT EXISTS idx_routine_equip_routine   ON routine_equipment(routine_id);
    CREATE INDEX IF NOT EXISTS idx_routine_equip_equipment ON routine_equipment(equipment_id);

    -- Custom tags
    CREATE TABLE IF NOT EXISTS tags (
      id     INTEGER PRIMARY KEY AUTOINCREMENT,
      name   TEXT    NOT NULL UNIQUE,
      color  TEXT    NOT NULL DEFAULT '#6366f1'
    );

    CREATE TABLE IF NOT EXISTS equipment_tags (
      equipment_id  INTEGER NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
      tag_id        INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (equipment_id, tag_id)
    );

    CREATE INDEX IF NOT EXISTS idx_equipment_tags_equip ON equipment_tags(equipment_id);
    CREATE INDEX IF NOT EXISTS idx_equipment_tags_tag   ON equipment_tags(tag_id);

    -- Loan tracking
    CREATE TABLE IF NOT EXISTS loans (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      equipment_id    INTEGER NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
      borrower        TEXT    NOT NULL,
      loaned_at       TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
      expected_return TEXT,
      returned_at     TEXT,
      notes           TEXT,
      created_at      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
    );

    CREATE INDEX IF NOT EXISTS idx_loans_equipment ON loans(equipment_id);
    CREATE INDEX IF NOT EXISTS idx_loans_active    ON loans(equipment_id, returned_at);

    -- Storage locations
    CREATE TABLE IF NOT EXISTS locations (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT    NOT NULL UNIQUE,
      notes      TEXT,
      created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
    );

    -- FTS5 external-content table for full-text search on equipment
    CREATE VIRTUAL TABLE IF NOT EXISTS equipment_fts USING fts5(
      name, notes, serial_number,
      content='equipment', content_rowid='id'
    );

    -- Keep FTS in sync with equipment changes
    CREATE TRIGGER IF NOT EXISTS equipment_fts_ai
      AFTER INSERT ON equipment BEGIN
        INSERT INTO equipment_fts(rowid, name, notes, serial_number)
        VALUES (new.id, new.name, new.notes, new.serial_number);
      END;

    CREATE TRIGGER IF NOT EXISTS equipment_fts_ad
      AFTER DELETE ON equipment BEGIN
        INSERT INTO equipment_fts(equipment_fts, rowid, name, notes, serial_number)
        VALUES('delete', old.id, old.name, old.notes, old.serial_number);
      END;

    CREATE TRIGGER IF NOT EXISTS equipment_fts_au
      AFTER UPDATE ON equipment BEGIN
        INSERT INTO equipment_fts(equipment_fts, rowid, name, notes, serial_number)
        VALUES('delete', old.id, old.name, old.notes, old.serial_number);
        INSERT INTO equipment_fts(rowid, name, notes, serial_number)
        VALUES (new.id, new.name, new.notes, new.serial_number);
      END;

  `);

  // Idempotent column additions — ALTER TABLE fails if column already exists in SQLite,
  // so we check PRAGMA table_info first.
  const equipCols = new Set(db.pragma('table_info(equipment)').map((c) => c.name));

  // Idempotent photo column additions
  const photoCols = new Set(db.pragma('table_info(photos)').map((c) => c.name));
  if (!photoCols.has('sort_order')) db.exec('ALTER TABLE photos ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0');
  if (!photoCols.has('caption'))    db.exec('ALTER TABLE photos ADD COLUMN caption TEXT');

  const purchaseCols = [
    ['purchase_date',     'TEXT'],
    ['purchase_price',    'REAL'],
    ['purchase_currency', "TEXT DEFAULT 'GBP'"],
    ['retailer',          'TEXT'],
    ['serial_number',     'TEXT'],
    ['model_number',      'TEXT'],
    ['warranty_expires',  'TEXT'],
    ['quantity',          'INTEGER NOT NULL DEFAULT 1'],
    ['location_id',       'INTEGER REFERENCES locations(id)'],
  ];

  for (const [col, def] of purchaseCols) {
    if (!equipCols.has(col)) {
      db.exec(`ALTER TABLE equipment ADD COLUMN ${col} ${def}`);
    }
  }

  // Rebuild FTS index to cover existing rows (safe to call repeatedly — it's a no-op if in sync)
  try {
    db.exec("INSERT INTO equipment_fts(equipment_fts) VALUES('rebuild')");
  } catch {
    // Ignore if already populated (external content rebuild is idempotent)
  }

  console.log('[db] migrations applied');
}

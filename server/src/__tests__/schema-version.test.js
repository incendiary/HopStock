import { describe, it, expect, vi } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '../db/schema.js';

const newDb = () => {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  return db;
};
const version = (db) => db.pragma('user_version', { simple: true });
const ftsHits = (db, term) =>
  db.prepare('SELECT rowid FROM equipment_fts WHERE equipment_fts MATCH ? ORDER BY rowid').all(term).map((r) => r.rowid);

function countRebuilds(db, fn) {
  let n = 0;
  for (const m of ['exec', 'prepare']) {
    const orig = db[m].bind(db);
    vi.spyOn(db, m).mockImplementation((sql, ...rest) => {
      if (String(sql).includes('rebuild')) n++;
      return orig(sql, ...rest);
    });
  }
  fn();
  vi.restoreAllMocks();
  return n;
}

describe('schema versioning', () => {
  it('fresh database ends at version 1 and a second run skips the FTS rebuild', () => {
    const db = newDb();
    expect(version(db)).toBe(0);
    expect(countRebuilds(db, () => runMigrations(db))).toBe(1);
    expect(version(db)).toBe(1);
    expect(countRebuilds(db, () => runMigrations(db))).toBe(0);
    expect(version(db)).toBe(1);
  });

  it('repairs a legacy (version 0) database whose FTS index is empty', () => {
    const db = newDb();
    runMigrations(db);
    db.prepare("INSERT INTO equipment (name, category) VALUES ('Zebrakettle', 'kettle'), ('Zebragrinder', 'grinder')").run();
    db.exec("INSERT INTO equipment_fts(equipment_fts) VALUES('delete-all')");
    db.pragma('user_version = 0');
    expect(ftsHits(db, 'Zebrakettle')).toEqual([]);

    runMigrations(db);

    expect(ftsHits(db, 'Zebrakettle')).toEqual([1]);
    expect(ftsHits(db, 'Zebragrinder')).toEqual([2]);
    expect(version(db)).toBe(1);
  });

  it('fresh and upgraded databases end with identical schemas', () => {
    const fresh = newDb();
    runMigrations(fresh);

    const old = newDb();
    runMigrations(old);
    old.exec('DROP INDEX idx_maintenance_routine; ALTER TABLE maintenance_events DROP COLUMN routine_id;');
    old.pragma('user_version = 0');
    runMigrations(old);

    const tables = (db) =>
      db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all().map((r) => r.name);
    const indexes = (db) =>
      db.prepare("SELECT name FROM sqlite_master WHERE type = 'index' ORDER BY name").all().map((r) => r.name);
    expect(tables(old)).toEqual(tables(fresh));
    expect(tables(fresh)).toContain('maintenance_events');
    for (const t of tables(fresh)) {
      expect(old.pragma(`table_info(${t})`)).toEqual(fresh.pragma(`table_info(${t})`));
    }
    expect(indexes(old)).toEqual(indexes(fresh));
    expect(indexes(fresh)).toContain('idx_maintenance_routine');
    expect(version(old)).toBe(version(fresh));
    expect(version(fresh)).toBe(1);
  });
});

/**
 * Test helper — creates a fresh in-memory SQLite DB with all migrations applied.
 *
 * Usage in a test file:
 *   vi.mock('../db/index.js', () => ({ default: makeTestDb() }));
 *   const { default: app } = await import('../app.js');
 *
 * Call makeTestDb() at the top level of the module (before vi.mock) so the mock
 * factory can capture it.  Each test file gets its own isolated DB because
 * vitest runs each file in a separate worker (pool: 'forks').
 */
import Database from 'better-sqlite3';
import { runMigrations } from '../db/schema.js';

export function makeTestDb() {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  runMigrations(db);
  return db;
}

/** Seed one valid equipment row and return it. */
export function seedEquipment(db, overrides = {}) {
  const row = {
    name:      'Test Kettle',
    category:  'kettle',
    condition: 'Good',
    notes:     null,
    icon:      null,
    quantity:  1,
    ...overrides,
  };
  const result = db.prepare(`
    INSERT INTO equipment (name, category, condition, notes, icon, quantity)
    VALUES (@name, @category, @condition, @notes, @icon, @quantity)
  `).run(row);
  return db.prepare('SELECT * FROM equipment WHERE id = ?').get(result.lastInsertRowid);
}

import Database from 'better-sqlite3';
import { runMigrations } from './schema.js';
import { DB_PATH } from '../config.js';

const db = new Database(DB_PATH);

// Performance and integrity pragmas
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

console.log(`[db] connected: ${DB_PATH}`);

runMigrations(db);

export default db;

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { runMigrations } from './schema.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
// DB path: env override for Docker (/data/hopstock.db), else project root
const DB_PATH = process.env.DB_PATH ?? join(__dirname, '../../../hopstock.db');

const db = new Database(DB_PATH);

// Performance and integrity pragmas
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

console.log(`[db] connected: ${DB_PATH}`);

runMigrations(db);

export default db;

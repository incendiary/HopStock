import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
// DB lives at project root, two levels up from server/src/db/
const DB_PATH = join(__dirname, '../../../hopstock.db');

const db = new Database(DB_PATH);

// Performance and integrity pragmas
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

console.log(`[db] connected: ${DB_PATH}`);

export default db;

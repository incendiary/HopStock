/**
 * Auto-backup module — creates a .tar.gz of hopstock.db + uploads/ on a configurable schedule.
 *
 * Config (environment variables):
 *   BACKUP_INTERVAL_HOURS  - how often to run (default: 24)
 *   BACKUP_DIR             - directory to write backups to (default: ../backups relative to server/)
 *   BACKUP_KEEP            - how many backups to keep (default: 7)
 *
 * Uses only Node.js built-ins (child_process, fs, path) + system `tar` — no npm packages needed.
 */

import { execFile }  from 'child_process';
import { promisify } from 'util';
import { mkdirSync, readdirSync, rmSync, existsSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath }          from 'url';

const execFileAsync = promisify(execFile);
const __dirname     = dirname(fileURLToPath(import.meta.url));

// ── Config ────────────────────────────────────────────────
const BACKUP_INTERVAL_MS = (parseInt(process.env.BACKUP_INTERVAL_HOURS, 10) || 24) * 60 * 60 * 1000;
const BACKUP_DIR         = resolve(process.env.BACKUP_DIR || join(__dirname, '../../backups'));
const BACKUP_KEEP        = parseInt(process.env.BACKUP_KEEP, 10) || 7;

// Paths to archive — relative to project root (one level above server/)
const PROJECT_ROOT = resolve(__dirname, '../..');
const DB_PATH      = join(PROJECT_ROOT, 'hopstock.db');
const UPLOADS_PATH = join(PROJECT_ROOT, 'uploads');

// ── Helpers ───────────────────────────────────────────────

function timestamp() {
  const now = new Date();
  return now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

async function runBackup() {
  mkdirSync(BACKUP_DIR, { recursive: true });

  const filename  = `hopstock-backup-${timestamp()}.tar.gz`;
  const dest      = join(BACKUP_DIR, filename);

  // Build tar argument list — include db if it exists, uploads if dir exists
  const includes = [];
  if (existsSync(DB_PATH))      includes.push('hopstock.db');
  if (existsSync(UPLOADS_PATH)) includes.push('uploads');

  if (includes.length === 0) {
    console.log('[backup] nothing to backup (no db or uploads yet)');
    return;
  }

  try {
    await execFileAsync('tar', ['-czf', dest, '-C', PROJECT_ROOT, ...includes]);
    console.log(`[backup] created ${filename}`);
  } catch (err) {
    console.error('[backup] tar failed:', err.message);
    return;
  }

  // Prune old backups — keep most recent N
  pruneBackups();
}

function pruneBackups() {
  try {
    const files = readdirSync(BACKUP_DIR)
      .filter((f) => f.startsWith('hopstock-backup-') && f.endsWith('.tar.gz'))
      .map((f) => ({ f, mtime: new Date(f.replace(/^hopstock-backup-/, '').replace('.tar.gz', '').replace(/-/g, (m, i) => i === 16 ? 'T' : i > 10 ? ':' : m)) }))
      .sort((a, b) => b.mtime - a.mtime);

    const toDelete = files.slice(BACKUP_KEEP);
    for (const { f } of toDelete) {
      rmSync(join(BACKUP_DIR, f));
      console.log(`[backup] pruned ${f}`);
    }
  } catch {
    // Non-fatal — prune failure shouldn't break the server
  }
}

// ── Scheduler ────────────────────────────────────────────

let _timer = null;

export function startBackupScheduler() {
  if (BACKUP_INTERVAL_MS <= 0) {
    console.log('[backup] scheduler disabled (BACKUP_INTERVAL_HOURS=0)');
    return;
  }

  const intervalHours = parseInt(process.env.BACKUP_INTERVAL_HOURS, 10) || 24;
  console.log(`[backup] scheduler started — interval ${intervalHours}h, dir: ${BACKUP_DIR}, keep: ${BACKUP_KEEP}`);

  // Run once at startup delay (5 minutes), then on the interval
  const STARTUP_DELAY_MS = 5 * 60 * 1000;
  setTimeout(() => {
    runBackup();
    _timer = setInterval(runBackup, BACKUP_INTERVAL_MS);
  }, STARTUP_DELAY_MS);
}

// ── On-demand backup ─────────────────────────────────────

export async function triggerBackupNow() {
  await runBackup();
}

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
import { mkdirSync, mkdtempSync, readdirSync, rmSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve, dirname, basename } from 'path';
import { fileURLToPath }          from 'url';

import db from './db/index.js';
import { UPLOADS_DIR } from './config.js';

const execFileAsync = promisify(execFile);
const __dirname     = dirname(fileURLToPath(import.meta.url));

// ── Config ────────────────────────────────────────────────
const BACKUP_INTERVAL_MS = (parseInt(process.env.BACKUP_INTERVAL_HOURS, 10) || 24) * 60 * 60 * 1000;
const BACKUP_DIR         = resolve(process.env.BACKUP_DIR || join(__dirname, '../../backups'));
const BACKUP_KEEP        = parseInt(process.env.BACKUP_KEEP, 10) || 7;

// ── Helpers ───────────────────────────────────────────────

function timestamp() {
  const now = new Date();
  return now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

async function runBackup() {
  mkdirSync(BACKUP_DIR, { recursive: true });

  const filename  = `hopstock-backup-${timestamp()}.tar.gz`;
  const dest      = join(BACKUP_DIR, filename);

  const tmp = mkdtempSync(join(tmpdir(), 'hopstock-backup-'));
  try {
    // Consistent snapshot of the live WAL database (a plain tar of the file may be torn)
    await db.backup(join(tmp, 'hopstock.db'));
    const args = ['-czf', dest, '-C', tmp, 'hopstock.db'];
    if (existsSync(UPLOADS_DIR)) args.push('-C', dirname(UPLOADS_DIR), basename(UPLOADS_DIR));
    await execFileAsync('tar', args);
    console.log(`[backup] created ${filename}`);
  } catch (err) {
    console.error('[backup] failed:', err.message);
    return;
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }

  // Prune old backups — keep most recent N
  pruneBackups();
}

function pruneBackups() {
  try {
    const files = readdirSync(BACKUP_DIR)
      .filter((f) => f.startsWith('hopstock-backup-') && f.endsWith('.tar.gz'))
      .sort()
      .reverse();

    const toDelete = files.slice(BACKUP_KEEP);
    for (const f of toDelete) {
      rmSync(join(BACKUP_DIR, f));
      console.log(`[backup] pruned ${f}`);
    }
  } catch {
    // Non-fatal — prune failure shouldn't break the server
  }
}

// ── Scheduler ────────────────────────────────────────────

export function startBackupScheduler() {
  if (BACKUP_INTERVAL_MS <= 0) {
    console.log('[backup] scheduler disabled (BACKUP_INTERVAL_HOURS=0)');
    return;
  }

  console.log(`[backup] scheduler started — interval ${BACKUP_INTERVAL_MS / 3_600_000}h, dir: ${BACKUP_DIR}, keep: ${BACKUP_KEEP}`);

  // Run once at startup delay (5 minutes), then on the interval
  const STARTUP_DELAY_MS = 5 * 60 * 1000;
  setTimeout(() => {
    runBackup();
    setInterval(runBackup, BACKUP_INTERVAL_MS);
  }, STARTUP_DELAY_MS);
}

// ── On-demand backup ─────────────────────────────────────

export async function triggerBackupNow() {
  await runBackup();
}

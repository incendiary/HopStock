import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readdirSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { execFileSync } from 'child_process';
import Database from 'better-sqlite3';

const root = mkdtempSync(join(tmpdir(), 'hopstock-backup-test-'));
process.env.DB_PATH = join(root, 'hopstock.db');
process.env.UPLOADS_DIR = join(root, 'uploads');
process.env.BACKUP_DIR = join(root, 'backups');
process.env.BACKUP_KEEP = '2';

mkdirSync(process.env.UPLOADS_DIR);
writeFileSync(join(process.env.UPLOADS_DIR, 'a.txt'), 'photo');
mkdirSync(process.env.BACKUP_DIR);
const old = [1, 2, 3, 4, 5].map((n) => `hopstock-backup-2020-01-0${n}T00-00-00.tar.gz`);
for (const f of old) writeFileSync(join(process.env.BACKUP_DIR, f), 'x');

const { default: db } = await import('../db/index.js');
const { triggerBackupNow } = await import('../backup.js');

describe('backup', () => {
  it('prunes to the newest BACKUP_KEEP files and archives db + uploads', async () => {
    await triggerBackupNow();

    const files = readdirSync(process.env.BACKUP_DIR).sort();
    expect(files).toHaveLength(2);
    expect(files[0]).toBe(old[4]);
    const archive = join(process.env.BACKUP_DIR, files[1]);

    const out = join(root, 'restore');
    mkdirSync(out);
    execFileSync('tar', ['-xzf', archive, '-C', out]);
    expect(readdirSync(out).sort()).toEqual(['hopstock.db', 'uploads']);

    const restored = new Database(join(out, 'hopstock.db'), { readonly: true });
    expect(restored.pragma('integrity_check', { simple: true })).toBe('ok');
    restored.close();
    db.close();
  });
});

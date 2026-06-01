import { Router } from 'express';
import multer from 'multer';
import db from '../db/index.js';
import { CATEGORIES, CONDITIONS } from '../db/constants.js';

const router  = Router();
const upload  = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const VALID_CATEGORY_IDS = new Set(CATEGORIES.map((c) => c.id));
const VALID_CONDITIONS   = new Set(CONDITIONS);

// Build a label → id lookup for flexible CSV import (case-insensitive)
const catLabelToId = Object.fromEntries(
  CATEGORIES.map((c) => [c.label.toLowerCase(), c.id]),
);

// ─── CSV parser ───────────────────────────────────────────
// Handles quoted fields (embedded commas, escaped double-quotes).
// Does not support multi-line quoted fields — notes with newlines
// should be imported via JSON instead.
function parseCSVLine(line) {
  const fields = [];
  let pos = 0;

  while (pos <= line.length) {
    if (pos === line.length) {
      // trailing comma → empty last field already pushed by the loop below
      break;
    }
    if (line[pos] === '"') {
      let val = '';
      pos++; // skip opening quote
      while (pos < line.length) {
        if (line[pos] === '"') {
          if (line[pos + 1] === '"') { val += '"'; pos += 2; }
          else                        { pos++; break; }
        } else {
          val += line[pos++];
        }
      }
      fields.push(val);
      if (line[pos] === ',') pos++;
    } else {
      const comma = line.indexOf(',', pos);
      if (comma === -1) { fields.push(line.slice(pos)); pos = line.length; }
      else              { fields.push(line.slice(pos, comma)); pos = comma + 1; }
    }
  }

  // trailing comma means an empty final field
  if (line.endsWith(',')) fields.push('');
  return fields;
}

function parseCSV(text) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]).map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line, i) => {
    const values = parseCSVLine(line);
    const obj    = { _row: i + 2 }; // 1-indexed, +1 for header row
    headers.forEach((h, idx) => { obj[h] = values[idx] ?? ''; });
    return obj;
  });
}

// ─── Validation ───────────────────────────────────────────
function resolveCategory(raw) {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (VALID_CATEGORY_IDS.has(trimmed))                return trimmed;
  const byLabel = catLabelToId[trimmed.toLowerCase()];
  if (byLabel)                                         return byLabel;
  return null; // unknown — will be treated as error if name requires one
}

function validateRecord(rec) {
  const name = (rec.name ?? '').trim();
  if (!name) return { error: 'name is required' };

  const condition = (rec.condition ?? 'Good').trim();
  if (!VALID_CONDITIONS.has(condition)) {
    return { error: `invalid condition "${condition}"` };
  }

  const rawCategory = rec.category ?? rec.category_label ?? '';
  const category    = resolveCategory(rawCategory) ?? null;

  return {
    name,
    category,
    condition,
    notes: (rec.notes ?? '').trim() || null,
    icon:  (rec.icon  ?? '').trim() || null,
  };
}

// ─── Import route ─────────────────────────────────────────
router.post('/', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  const { mimetype, originalname, buffer } = req.file;
  const text = buffer.toString('utf-8');
  const ext  = originalname.split('.').pop().toLowerCase();

  let records;
  try {
    if (mimetype === 'application/json' || ext === 'json') {
      const parsed = JSON.parse(text);
      records = Array.isArray(parsed) ? parsed : [parsed];
    } else {
      // treat as CSV
      records = parseCSV(text);
    }
  } catch (err) {
    return res.status(400).json({ error: `Could not parse file: ${err.message}` });
  }

  if (!records.length) {
    return res.status(400).json({ error: 'File contains no records.' });
  }

  const insert = db.prepare(`
    INSERT INTO equipment (name, category, condition, notes, icon)
    VALUES (?, ?, ?, ?, ?)
  `);

  const importMany = db.transaction((recs) => {
    let imported = 0;
    const errors = [];

    for (const rec of recs) {
      const row = rec._row ?? recs.indexOf(rec) + 1;
      const result = validateRecord(rec);

      if (result.error) {
        errors.push({ row, message: result.error });
        continue;
      }

      insert.run(result.name, result.category, result.condition, result.notes, result.icon);
      imported++;
    }

    return { imported, skipped: errors.length, errors };
  });

  const outcome = importMany(records);
  res.status(outcome.imported > 0 ? 200 : 422).json(outcome);
});

export default router;

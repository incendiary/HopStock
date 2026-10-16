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

const TEXT_FIELDS = ['purchase_date', 'retailer', 'serial_number', 'model_number', 'warranty_expires'];

// Trimmed string, or null when absent/empty. Throws on values that are not text-like.
function text(rec, field) {
  const v = rec[field];
  if (v == null) return null;
  if (typeof v !== 'string' && typeof v !== 'number') throw new Error(`invalid ${field}`);
  return String(v).trim() || null;
}

function validateRecord(rec) {
  if (rec === null || typeof rec !== 'object' || Array.isArray(rec)) {
    return { error: 'record must be an object' };
  }
  try {
    const name = text(rec, 'name');
    if (!name) return { error: 'name is required' };

    const condition = typeof (rec.condition ?? 'Good') === 'string' ? (rec.condition ?? 'Good').trim() : null;
    if (!VALID_CONDITIONS.has(condition)) {
      return { error: `invalid condition "${rec.condition}"` };
    }

    const rawCategory = rec.category ?? rec.category_label ?? '';
    if (rawCategory === '') return { error: 'category is required' };
    const category = typeof rawCategory === 'string' ? resolveCategory(rawCategory) : null;
    if (!category) return { error: `unknown category "${rawCategory}"` };

    let price = null;
    if (rec.purchase_price != null && rec.purchase_price !== '') {
      price = Number(rec.purchase_price);
      if (typeof rec.purchase_price === 'boolean' || !Number.isFinite(price) || price < 0) {
        return { error: `invalid purchase_price "${rec.purchase_price}"` };
      }
    }

    let quantity = 1;
    if (rec.quantity != null && rec.quantity !== '') {
      quantity = Number(rec.quantity);
      if (typeof rec.quantity === 'boolean' || !Number.isInteger(quantity) || quantity < 1) {
        return { error: `quantity must be a positive integer, got "${rec.quantity}"` };
      }
    }

    let tags = [];
    if (rec.tags != null) {
      const ok = Array.isArray(rec.tags) && rec.tags.every((t) => (
        (typeof t === 'string' && t.trim())
        || (t && typeof t === 'object' && typeof t.name === 'string' && t.name.trim())
      ));
      if (!ok) return { error: 'tags must be an array of tag names (or {name, color} objects)' };
      tags = rec.tags.map((t) => (typeof t === 'string'
        ? { name: t.trim() }
        : { name: t.name.trim(), color: typeof t.color === 'string' && t.color.trim() ? t.color.trim() : undefined }));
    }

    if (rec.location != null && typeof rec.location !== 'string') {
      return { error: 'location must be a string' };
    }

    const out = {
      name,
      category,
      condition,
      notes: text(rec, 'notes'),
      icon: text(rec, 'icon'),
      purchase_price: price,
      // The column defaults to GBP, so an absent key keeps that; an explicit null is preserved.
      purchase_currency: rec.purchase_currency === undefined ? 'GBP' : text(rec, 'purchase_currency'),
      quantity,
      tags,
      location: rec.location?.trim() || null,
    };
    for (const f of TEXT_FIELDS) out[f] = text(rec, f);
    return out;
  } catch (err) {
    return { error: err.message };
  }
}

const dedupeKey = (name, serial) => `${name.trim().toLowerCase()}\u0000${(serial ?? '').trim()}`;

// ─── Import route ─────────────────────────────────────────
// Both formats read any field whose key (JSON) or header (CSV) matches a field name.
// Tags are JSON-only (a CSV cell is a string, not an array); photos are never restored
// (image files are not in the export); created_at and updated_at are not restored.
router.post('/', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  const { mimetype, originalname, buffer } = req.file;
  const raw  = buffer.toString('utf-8');
  const ext  = originalname.split('.').pop().toLowerCase();

  let records;
  try {
    if (mimetype === 'application/json' || ext === 'json') {
      const parsed = JSON.parse(raw);
      records = Array.isArray(parsed) ? parsed : [parsed];
    } else {
      // treat as CSV
      records = parseCSV(raw);
    }
  } catch (err) {
    return res.status(400).json({ error: `Could not parse file: ${err.message}` });
  }

  if (!records.length) {
    return res.status(400).json({ error: 'File contains no records.' });
  }

  const insert = db.prepare(`
    INSERT INTO equipment (
      name, category, condition, notes, icon,
      purchase_date, purchase_price, purchase_currency, retailer,
      serial_number, model_number, warranty_expires, quantity, location_id
    ) VALUES (
      @name, @category, @condition, @notes, @icon,
      @purchase_date, @purchase_price, @purchase_currency, @retailer,
      @serial_number, @model_number, @warranty_expires, @quantity, @location_id
    )
  `);
  const findTag     = db.prepare('SELECT id FROM tags WHERE name = ? COLLATE NOCASE');
  const insertTag   = db.prepare('INSERT INTO tags (name, color) VALUES (?, COALESCE(?, \'#6366f1\'))');
  const linkTag     = db.prepare('INSERT OR IGNORE INTO equipment_tags (equipment_id, tag_id) VALUES (?, ?)');
  const findLoc     = db.prepare('SELECT id FROM locations WHERE name = ? COLLATE NOCASE');
  const insertLoc   = db.prepare('INSERT INTO locations (name) VALUES (?)');

  const importMany = db.transaction((recs) => {
    let imported = 0;
    let duplicates = 0;
    const errors = [];
    const seen = new Set(
      db.prepare('SELECT name, serial_number FROM equipment WHERE deleted = 0').all()
        .map((r) => dedupeKey(r.name, r.serial_number)),
    );

    recs.forEach((rec, i) => {
      const row = rec?._row ?? i + 1;
      const result = validateRecord(rec);

      if (result.error) {
        errors.push({ row, message: result.error });
        return;
      }

      const key = dedupeKey(result.name, result.serial_number);
      if (seen.has(key)) {
        duplicates++;
        return;
      }
      seen.add(key);

      const location = result.location;
      const locationId = location
        ? (findLoc.get(location)?.id ?? insertLoc.run(location).lastInsertRowid)
        : null;
      const equipmentId = insert.run({ ...result, location_id: locationId }).lastInsertRowid;

      for (const tag of result.tags) {
        const tagId = findTag.get(tag.name)?.id ?? insertTag.run(tag.name, tag.color ?? null).lastInsertRowid;
        linkTag.run(equipmentId, tagId);
      }
      imported++;
    });

    return { imported, duplicates, skipped: errors.length, errors };
  });

  const outcome = importMany(records);
  res.status(outcome.imported > 0 || outcome.errors.length === 0 ? 200 : 422).json(outcome);
});

export default router;

import { Router } from 'express';
import db from '../db/index.js';
import { CATEGORIES } from '../db/constants.js';

const router = Router();

const catLabelMap = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.label]));

function csvEscape(v) {
  const s = v == null ? '' : String(v);
  return /[,"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function csvRow(values) {
  return values.map(csvEscape).join(',');
}

// GET /api/export/csv
router.get('/csv', (_req, res) => {
  const items = db
    .prepare('SELECT * FROM equipment WHERE deleted = 0 ORDER BY name COLLATE NOCASE')
    .all();

  const header = csvRow(['name', 'category', 'category_label', 'condition', 'notes', 'icon', 'created_at']);
  const rows   = items.map((item) => csvRow([
    item.name,
    item.category       ?? '',
    catLabelMap[item.category] ?? item.category ?? '',
    item.condition      ?? 'Good',
    item.notes          ?? '',
    item.icon           ?? '',
    item.created_at     ?? '',
  ]));

  const csv = [header, ...rows].join('\r\n') + '\r\n';

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="hopstock-export.csv"');
  res.send(csv);
});

// GET /api/export/json
router.get('/json', (_req, res) => {
  const items = db
    .prepare('SELECT * FROM equipment WHERE deleted = 0 ORDER BY name COLLATE NOCASE')
    .all();

  const full = items.map((item) => {
    const photos = db
      .prepare('SELECT id, filename, created_at FROM photos WHERE equipment_id = ? ORDER BY id')
      .all(item.id)
      .map((p) => ({ ...p, url: `/uploads/${p.filename}` }));
    return {
      ...item,
      category_label: catLabelMap[item.category] ?? item.category ?? '',
      photos,
    };
  });

  res.setHeader('Content-Disposition', 'attachment; filename="hopstock-export.json"');
  res.json(full);
});

export default router;

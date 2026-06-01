import { Router } from 'express';
import multer from 'multer';
import { extname } from 'path';
import { unlink } from 'fs/promises';
import { join } from 'path';
import db from '../db/index.js';
import { UPLOADS_DIR } from '../config.js';

const router = Router({ mergeParams: true }); // gives access to :equipmentId

// --- multer config ---

const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (_req, file, cb) => {
    const ext = extname(file.originalname).toLowerCase();
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    cb(null, `${unique}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(Object.assign(new Error('Only image files are accepted'), { status: 400 }));
    }
  },
});

// --- helpers ---

function toPhotoResponse(photo) {
  return { ...photo, url: `/uploads/${photo.filename}` };
}

// --- routes ---

// POST /api/equipment/:equipmentId/photos
router.post('/', upload.array('photos', 10), (req, res) => {
  const equipment = db
    .prepare('SELECT id FROM equipment WHERE id = ? AND deleted = 0')
    .get(req.params.equipmentId);

  if (!equipment) {
    // Clean up already-saved files if equipment doesn't exist
    for (const f of req.files ?? []) {
      unlink(join(UPLOADS_DIR, f.filename)).catch(() => {});
    }
    return res.status(404).json({ error: 'Equipment not found' });
  }

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No image files provided' });
  }

  const insert = db.prepare(
    'INSERT INTO photos (equipment_id, filename) VALUES (?, ?)'
  );

  const created = db.transaction(() =>
    req.files.map((f) => {
      const result = insert.run(equipment.id, f.filename);
      return db
        .prepare('SELECT * FROM photos WHERE id = ?')
        .get(result.lastInsertRowid);
    })
  )();

  res.status(201).json(created.map(toPhotoResponse));
});

// DELETE /api/equipment/:equipmentId/photos/:photoId
router.delete('/:photoId', async (req, res) => {
  const photo = db
    .prepare('SELECT * FROM photos WHERE id = ? AND equipment_id = ?')
    .get(req.params.photoId, req.params.equipmentId);

  if (!photo) return res.status(404).json({ error: 'Photo not found' });

  // Remove file — ignore if already gone
  try {
    await unlink(join(UPLOADS_DIR, photo.filename));
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }

  db.prepare('DELETE FROM photos WHERE id = ?').run(photo.id);

  res.json({ success: true });
});

// --- multer error handler (must have 4 args) ---
// eslint-disable-next-line no-unused-vars
router.use((err, _req, res, _next) => {
  const status = err.status ?? (err.code === 'LIMIT_FILE_SIZE' ? 413 : 400);
  res.status(status).json({ error: err.message });
});

export default router;

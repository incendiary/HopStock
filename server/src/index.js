import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync } from 'fs';
import db from './db/index.js'; // initialises SQLite on startup
import equipmentRouter from './routes/equipment.js';
import metaRouter from './routes/meta.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = join(__dirname, '../../uploads');

// Ensure uploads directory exists (self-healing on fresh clone)
mkdirSync(UPLOADS_DIR, { recursive: true });

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Serve uploaded photos
app.use('/uploads', express.static(UPLOADS_DIR));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', project: 'hopstock' });
});

app.use('/api/equipment', equipmentRouter);
app.use('/api', metaRouter);

// SPA fallback — serves built Vue client in production
// (no-op until client is scaffolded at roadmap item #6)
app.use(express.static(join(__dirname, '../public')));
app.get('*', (_req, res) => {
  const indexPath = join(__dirname, '../public/index.html');
  res.sendFile(indexPath, (err) => {
    if (err) res.status(404).json({ error: 'Not found' });
  });
});

app.listen(PORT, () => {
  console.log(`[hopstock] server running on http://localhost:${PORT}`);
});

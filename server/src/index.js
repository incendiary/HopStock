import { mkdirSync } from 'fs';
import { UPLOADS_DIR } from './config.js';
import app from './app.js';
import { startBackupScheduler } from './backup.js';

// Ensure uploads directory exists (self-healing on fresh clone)
mkdirSync(UPLOADS_DIR, { recursive: true });

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`[hopstock] server running on http://localhost:${PORT}`);
  startBackupScheduler();
});

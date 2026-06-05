import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Uploads path: env override for Docker (/data/uploads), else server/uploads/
export const UPLOADS_DIR = process.env.UPLOADS_DIR ?? join(__dirname, '../uploads');

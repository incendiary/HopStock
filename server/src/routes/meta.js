import { Router } from 'express';
import { CATEGORIES, CONDITIONS } from '../db/constants.js';

const router = Router();

// GET /api/categories
router.get('/categories', (_req, res) => {
  res.json(CATEGORIES);
});

// GET /api/conditions
router.get('/conditions', (_req, res) => {
  res.json(CONDITIONS);
});

export default router;

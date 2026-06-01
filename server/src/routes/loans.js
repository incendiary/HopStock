import { Router } from 'express';
import db from '../db/index.js';

const router = Router({ mergeParams: true }); // parent mounts at /api/equipment/:equipmentId/loans

// GET /api/equipment/:equipmentId/loans
// Returns all loans for the item, newest first
router.get('/', (req, res) => {
  const { equipmentId } = req.params;
  const item = db.prepare('SELECT id FROM equipment WHERE id = ? AND deleted = 0').get(equipmentId);
  if (!item) return res.status(404).json({ error: 'Not found' });

  const loans = db.prepare(`
    SELECT * FROM loans WHERE equipment_id = ? ORDER BY loaned_at DESC
  `).all(equipmentId);
  res.json(loans);
});

// POST /api/equipment/:equipmentId/loans
// Record a new loan
router.post('/', (req, res) => {
  const { equipmentId } = req.params;
  const item = db.prepare('SELECT id FROM equipment WHERE id = ? AND deleted = 0').get(equipmentId);
  if (!item) return res.status(404).json({ error: 'Not found' });

  const { borrower, loaned_at = null, expected_return = null, notes = null } = req.body;
  if (!borrower || typeof borrower !== 'string' || !borrower.trim()) {
    return res.status(400).json({ error: 'borrower is required' });
  }

  const result = db.prepare(`
    INSERT INTO loans (equipment_id, borrower, loaned_at, expected_return, notes)
    VALUES (?, ?, COALESCE(?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now')), ?, ?)
  `).run(equipmentId, borrower.trim(), loaned_at, expected_return, notes);

  const created = db.prepare('SELECT * FROM loans WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(created);
});

// PUT /api/equipment/:equipmentId/loans/:loanId/return
// Mark a loan as returned
router.put('/:loanId/return', (req, res) => {
  const { equipmentId, loanId } = req.params;
  const loan = db.prepare('SELECT * FROM loans WHERE id = ? AND equipment_id = ?').get(loanId, equipmentId);
  if (!loan) return res.status(404).json({ error: 'Not found' });
  if (loan.returned_at) return res.status(400).json({ error: 'Already returned' });

  const { returned_at = null } = req.body;
  db.prepare(`
    UPDATE loans SET returned_at = COALESCE(?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
    WHERE id = ?
  `).run(returned_at, loanId);

  res.json(db.prepare('SELECT * FROM loans WHERE id = ?').get(loanId));
});

// DELETE /api/equipment/:equipmentId/loans/:loanId
router.delete('/:loanId', (req, res) => {
  const { equipmentId, loanId } = req.params;
  const loan = db.prepare('SELECT id FROM loans WHERE id = ? AND equipment_id = ?').get(loanId, equipmentId);
  if (!loan) return res.status(404).json({ error: 'Not found' });

  db.prepare('DELETE FROM loans WHERE id = ?').run(loanId);
  res.json({ success: true });
});

export default router;

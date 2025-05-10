import express, { Request, Response } from 'express';
import db from '../config/database';
import { userIdMiddleware } from '../middleware/auth';

const router = express.Router();

// Apply userIdMiddleware to all routes
router.use(userIdMiddleware);

// Helper: fetch dose history for a medication
function getDoseHistory(medicationId: number) {
  const doses: any[] = db.prepare(`
    SELECT * FROM medication_doses WHERE medication_id = ? ORDER BY startDate ASC
  `).all(medicationId);
  return doses.map((dose: any) => ({
    id: dose.id,
    dose: JSON.parse(dose.dose),
    frequency: JSON.parse(dose.frequency),
    startDate: dose.startDate,
    endDate: dose.endDate,
    notes: dose.notes,
    created_at: dose.created_at,
    updated_at: dose.updated_at
  }));
}

// GET /api/medications - List all medications with dose history
router.get('/', (req: Request, res: Response) => {
  const userId = (req as any).userId;
  try {
    const meds: any[] = db.prepare(`
      SELECT * FROM medications WHERE user_id = ? ORDER BY name
    `).all(userId);
    const result = meds.map((med: any) => ({
      id: med.id,
      name: med.name,
      isPrescription: !!med.isPrescription,
      startDate: med.startDate,
      endDate: med.endDate,
      notes: med.notes,
      created_at: med.created_at,
      updated_at: med.updated_at,
      doses: getDoseHistory(med.id)
    }));
    res.json(result);
  } catch (error) {
    console.error('Error fetching medications:', error);
    res.status(500).json({ error: 'Failed to fetch medications' });
  }
});

// POST /api/medications - Create new medication (with initial dose)
router.post('/', (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { name, isPrescription, startDate, endDate, notes, initialDose } = req.body;
  if (!name || !initialDose || !initialDose.dose || !initialDose.frequency || !startDate) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    const medResult = db.prepare(`
      INSERT INTO medications (user_id, name, isPrescription, startDate, endDate, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(userId, name, isPrescription ? 1 : 0, startDate, endDate || null, notes || null);
    const medicationId = medResult.lastInsertRowid as number;
    db.prepare(`
      INSERT INTO medication_doses (medication_id, dose, frequency, startDate, endDate, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      medicationId,
      JSON.stringify(initialDose.dose),
      JSON.stringify(initialDose.frequency),
      initialDose.startDate || startDate,
      initialDose.endDate || null,
      initialDose.notes || null
    );
    // Return the new medication with dose history
    const med = db.prepare('SELECT * FROM medications WHERE id = ?').get(medicationId);
    res.status(201).json({
      id: (med as any).id,
      name: (med as any).name,
      isPrescription: !!(med as any).isPrescription,
      startDate: (med as any).startDate,
      endDate: (med as any).endDate,
      notes: (med as any).notes,
      created_at: (med as any).created_at,
      updated_at: (med as any).updated_at,
      doses: getDoseHistory((med as any).id)
    });
  } catch (error) {
    console.error('Error adding medication:', error);
    res.status(500).json({ error: 'Failed to add medication' });
  }
});

// PUT /api/medications/:id - Update general medication info
router.put('/:id', (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { id } = req.params;
  const { name, isPrescription, startDate, endDate, notes } = req.body;
  try {
    const result = db.prepare(`
      UPDATE medications SET name = ?, isPrescription = ?, startDate = ?, endDate = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `).run(name, isPrescription ? 1 : 0, startDate, endDate || null, notes || null, id, userId);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Medication not found' });
    }
    const med = db.prepare('SELECT * FROM medications WHERE id = ?').get(id);
    res.json({
      id: (med as any).id,
      name: (med as any).name,
      isPrescription: !!(med as any).isPrescription,
      startDate: (med as any).startDate,
      endDate: (med as any).endDate,
      notes: (med as any).notes,
      created_at: (med as any).created_at,
      updated_at: (med as any).updated_at,
      doses: getDoseHistory((med as any).id)
    });
  } catch (error) {
    console.error('Error updating medication:', error);
    res.status(500).json({ error: 'Failed to update medication' });
  }
});

// DELETE /api/medications/:id - Delete medication and all doses
router.delete('/:id', (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { id } = req.params;
  try {
    // Delete doses first (ON DELETE CASCADE should handle this, but for safety)
    db.prepare('DELETE FROM medication_doses WHERE medication_id = ?').run(id);
    const result = db.prepare('DELETE FROM medications WHERE id = ? AND user_id = ?').run(id, userId);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Medication not found' });
    }
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting medication:', error);
    res.status(500).json({ error: 'Failed to delete medication' });
  }
});

// POST /api/medications/:id/doses - Add a new dose/frequency
router.post('/:id/doses', (req: Request, res: Response) => {
  const { id } = req.params;
  const { dose, frequency, startDate, endDate, notes } = req.body;
  if (!dose || !frequency || !startDate) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    // Mark the previous active dose as finished
    db.prepare(`
      UPDATE medication_doses
      SET endDate = ?
      WHERE medication_id = ? AND (endDate IS NULL OR endDate = '')
    `).run(startDate, id);

    db.prepare(`
      INSERT INTO medication_doses (medication_id, dose, frequency, startDate, endDate, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      id,
      JSON.stringify(dose),
      JSON.stringify(frequency),
      startDate,
      endDate || null,
      notes || null
    );
    // Return updated dose history
    res.status(201).json(getDoseHistory(Number(id)));
  } catch (error) {
    console.error('Error adding dose:', error);
    res.status(500).json({ error: 'Failed to add dose' });
  }
});

// PUT /api/medications/:id/doses/:doseId - Update a dose/frequency or its note
router.put('/:id/doses/:doseId', (req: Request, res: Response) => {
  const { id, doseId } = req.params;
  const { dose, frequency, startDate, endDate, notes } = req.body;
  try {
    const result = db.prepare(`
      UPDATE medication_doses SET dose = ?, frequency = ?, startDate = ?, endDate = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND medication_id = ?
    `).run(
      JSON.stringify(dose),
      JSON.stringify(frequency),
      startDate,
      endDate || null,
      notes || null,
      doseId,
      id
    );
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Dose not found' });
    }
    res.json(getDoseHistory(Number(id)));
  } catch (error) {
    console.error('Error updating dose:', error);
    res.status(500).json({ error: 'Failed to update dose' });
  }
});

// DELETE /api/medications/:id/doses/:doseId - Remove a dose/frequency
router.delete('/:id/doses/:doseId', (req: Request, res: Response) => {
  const { id, doseId } = req.params;
  try {
    const result = db.prepare('DELETE FROM medication_doses WHERE id = ? AND medication_id = ?').run(doseId, id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Dose not found' });
    }
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting dose:', error);
    res.status(500).json({ error: 'Failed to delete dose' });
  }
});

export const medicationsRouter = router; 
import express, { Request, Response } from 'express';
import db from '../config/database';
import { userIdMiddleware } from '../middleware/auth';

const router = express.Router();

// Apply userIdMiddleware to all routes
router.use(userIdMiddleware);

// Add a medication event
router.post('/', async (req: Request, res: Response) => {
    const { timestamp, name, action, dose, notes } = req.body;
    const userId = (req as any).userId;

    if (!timestamp || !name || !action) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const stmt = db.prepare(`
            INSERT INTO medication_event (
                user_id, timestamp, name, action, dose, notes
            ) VALUES (?, ?, ?, ?, ?, ?)
        `);

        stmt.run(
            userId, // Use the actual user ID
            timestamp,
            name,
            action,
            dose || null,
            notes || null
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Medication event error:', error);
        res.status(500).json({ error: 'Failed to add medication event' });
    }
});

// Get medication events for a date range
router.get('/', async (req: Request, res: Response) => {
    const { startDate, endDate } = req.query;
    const userId = (req as any).userId;

    try {
        const stmt = db.prepare(`
            SELECT * FROM medication_event
            WHERE user_id = ?
            AND timestamp BETWEEN ? AND ?
            ORDER BY timestamp DESC
        `);

        const events = stmt.all(userId, startDate, endDate);
        res.json(events);
    } catch (error) {
        console.error('Medication events error:', error);
        res.status(500).json({ error: 'Failed to fetch medication events' });
    }
});

// Update a medication event
router.put('/:id', async (req: Request<{ id: string }>, res: Response) => {
    const { id } = req.params;
    const { timestamp, name, action, dose, notes } = req.body;
    const userId = (req as any).userId;

    try {
        const stmt = db.prepare(`
            UPDATE medication_event
            SET timestamp = ?,
                name = ?,
                action = ?,
                dose = ?,
                notes = ?
            WHERE rowid = ? AND user_id = ?
        `);

        const result = stmt.run(
            timestamp,
            name,
            action,
            dose || null,
            notes || null,
            id,
            userId
        );

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Medication event not found' });
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Medication update error:', error);
        res.status(500).json({ error: 'Failed to update medication event' });
    }
});

// Delete a medication event
router.delete('/:id', async (req: Request<{ id: string }>, res: Response) => {
    const { id } = req.params;
    const userId = (req as any).userId;

    try {
        const stmt = db.prepare(`
            DELETE FROM medication_event
            WHERE rowid = ? AND user_id = ?
        `);

        const result = stmt.run(id, userId);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Medication event not found' });
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Medication delete error:', error);
        res.status(500).json({ error: 'Failed to delete medication event' });
    }
});

export const medicationRouter = router; 
import express, { Request, Response } from 'express';
import db from '../config/database';

const router = express.Router();

// Add a symptom event
router.post('/', async (req: Request, res: Response) => {
    const { timestamp, symptom, severity, notes } = req.body;

    if (!timestamp || !symptom || severity === undefined) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const stmt = db.prepare(`
            INSERT INTO symptom_event (
                user_id, timestamp, symptom, severity, notes
            ) VALUES (?, ?, ?, ?, ?)
        `);

        stmt.run(
            'default_user', // In a real app, you'd use the actual user ID
            timestamp,
            symptom,
            severity,
            notes || null
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Symptom event error:', error);
        res.status(500).json({ error: 'Failed to add symptom event' });
    }
});

// Get symptom events for a date range
router.get('/', async (req: Request, res: Response) => {
    const { startDate, endDate } = req.query;

    try {
        const stmt = db.prepare(`
            SELECT * FROM symptom_event
            WHERE user_id = ?
            AND timestamp BETWEEN ? AND ?
            ORDER BY timestamp DESC
        `);

        const events = stmt.all('default_user', startDate, endDate);
        res.json(events);
    } catch (error) {
        console.error('Symptom events error:', error);
        res.status(500).json({ error: 'Failed to fetch symptom events' });
    }
});

// Update a symptom event
router.put('/:id', async (req: Request<{ id: string }>, res: Response) => {
    const { id } = req.params;
    const { timestamp, symptom, severity, notes } = req.body;

    try {
        const stmt = db.prepare(`
            UPDATE symptom_event
            SET timestamp = ?,
                symptom = ?,
                severity = ?,
                notes = ?
            WHERE rowid = ? AND user_id = ?
        `);

        const result = stmt.run(
            timestamp,
            symptom,
            severity,
            notes || null,
            id,
            'default_user'
        );

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Symptom event not found' });
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Symptom update error:', error);
        res.status(500).json({ error: 'Failed to update symptom event' });
    }
});

// Delete a symptom event
router.delete('/:id', async (req: Request<{ id: string }>, res: Response) => {
    const { id } = req.params;

    try {
        const stmt = db.prepare(`
            DELETE FROM symptom_event
            WHERE rowid = ? AND user_id = ?
        `);

        const result = stmt.run(id, 'default_user');

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Symptom event not found' });
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Symptom delete error:', error);
        res.status(500).json({ error: 'Failed to delete symptom event' });
    }
});

export const symptomRouter = router; 
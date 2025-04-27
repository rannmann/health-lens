import express, { Request, Response } from 'express';
import db from '../config/database';
import { format, parseISO } from 'date-fns';

const router = express.Router();

// Get all medications for a user within a date range
router.get('/:userId', async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;

    try {
        const medications = db.prepare(`
            SELECT * FROM medication_event 
            WHERE user_id = ? 
            AND timestamp BETWEEN ? AND ?
            ORDER BY timestamp DESC
        `).all(userId, startDate, endDate);

        res.json(medications);
    } catch (error) {
        console.error('Error fetching medications:', error);
        res.status(500).json({ error: 'Failed to fetch medications' });
    }
});

// Add a new medication event
router.post('/:userId', async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { name, action, dose, notes, timestamp } = req.body;

    try {
        const formattedTimestamp = timestamp || format(new Date(), "yyyy-MM-dd'T'HH:mm:ss");

        db.prepare(`
            INSERT INTO medication_event (
                user_id, timestamp, name, action, dose, notes
            ) VALUES (?, ?, ?, ?, ?, ?)
        `).run(userId, formattedTimestamp, name, action, dose, notes);

        res.json({ success: true });
    } catch (error) {
        console.error('Error adding medication:', error);
        res.status(500).json({ error: 'Failed to add medication' });
    }
});

// Update a medication event
router.put('/:userId/:timestamp/:name', async (req: Request, res: Response) => {
    const { userId, timestamp, name } = req.params;
    const { action, dose, notes } = req.body;

    try {
        db.prepare(`
            UPDATE medication_event 
            SET action = ?, dose = ?, notes = ?
            WHERE user_id = ? AND timestamp = ? AND name = ?
        `).run(action, dose, notes, userId, timestamp, name);

        res.json({ success: true });
    } catch (error) {
        console.error('Error updating medication:', error);
        res.status(500).json({ error: 'Failed to update medication' });
    }
});

// Delete a medication event
router.delete('/:userId/:timestamp/:name', async (req: Request, res: Response) => {
    const { userId, timestamp, name } = req.params;

    try {
        db.prepare(`
            DELETE FROM medication_event 
            WHERE user_id = ? AND timestamp = ? AND name = ?
        `).run(userId, timestamp, name);

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting medication:', error);
        res.status(500).json({ error: 'Failed to delete medication' });
    }
});

export const medicationsRouter = router; 
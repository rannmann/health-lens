import express, { Request, Response } from 'express';
import db from '../config/database';
import { format, parseISO } from 'date-fns';

const router = express.Router();

// Get all symptoms for a user within a date range
router.get('/:userId', async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;

    try {
        const symptoms = db.prepare(`
            SELECT * FROM symptom_event 
            WHERE user_id = ? 
            AND timestamp BETWEEN ? AND ?
            ORDER BY timestamp DESC
        `).all(userId, startDate, endDate);

        res.json(symptoms);
    } catch (error) {
        console.error('Error fetching symptoms:', error);
        res.status(500).json({ error: 'Failed to fetch symptoms' });
    }
});

// Add a new symptom event
router.post('/:userId', async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { symptom, severity, notes, timestamp } = req.body;

    try {
        const formattedTimestamp = timestamp || format(new Date(), "yyyy-MM-dd'T'HH:mm:ss");

        db.prepare(`
            INSERT INTO symptom_event (
                user_id, timestamp, symptom, severity, notes
            ) VALUES (?, ?, ?, ?, ?)
        `).run(userId, formattedTimestamp, symptom, severity, notes);

        res.json({ success: true });
    } catch (error) {
        console.error('Error adding symptom:', error);
        res.status(500).json({ error: 'Failed to add symptom' });
    }
});

// Update a symptom event
router.put('/:userId/:timestamp/:symptom', async (req: Request, res: Response) => {
    const { userId, timestamp, symptom } = req.params;
    const { severity, notes } = req.body;

    try {
        db.prepare(`
            UPDATE symptom_event 
            SET severity = ?, notes = ?
            WHERE user_id = ? AND timestamp = ? AND symptom = ?
        `).run(severity, notes, userId, timestamp, symptom);

        res.json({ success: true });
    } catch (error) {
        console.error('Error updating symptom:', error);
        res.status(500).json({ error: 'Failed to update symptom' });
    }
});

// Delete a symptom event
router.delete('/:userId/:timestamp/:symptom', async (req: Request, res: Response) => {
    const { userId, timestamp, symptom } = req.params;

    try {
        db.prepare(`
            DELETE FROM symptom_event 
            WHERE user_id = ? AND timestamp = ? AND symptom = ?
        `).run(userId, timestamp, symptom);

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting symptom:', error);
        res.status(500).json({ error: 'Failed to delete symptom' });
    }
});

export const symptomsRouter = router; 
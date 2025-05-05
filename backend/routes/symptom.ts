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

// List all symptoms (active/inactive, user and default)
router.get('/list', async (req: Request, res: Response) => {
    try {
        const symptoms = db.prepare(`
            SELECT * FROM symptom WHERE user_id = ? OR user_id IS NULL ORDER BY active DESC, name ASC
        `).all('default_user');
        res.json(symptoms);
    } catch (error) {
        console.error('Error fetching symptoms:', error);
        res.status(500).json({ error: (error as Error).message || 'Failed to fetch symptoms' });
    }
});

// Add a new symptom to the user's list
router.post('/add', async (req: Request, res: Response) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    try {
        const stmt = db.prepare(`
            INSERT INTO symptom (user_id, name, active) VALUES (?, ?, 1)
        `);
        stmt.run('default_user', name);
        res.json({ success: true });
    } catch (error) {
        if ((error as any).code === 'SQLITE_CONSTRAINT') {
            return res.status(409).json({ error: 'Symptom already exists' });
        }
        console.error('Error adding symptom:', error);
        res.status(500).json({ error: (error as Error).message || 'Failed to add symptom' });
    }
});

// Activate a symptom
router.post('/:id/activate', async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        db.prepare(`UPDATE symptom SET active = 1, deactivated_at = NULL WHERE id = ? AND user_id = ?`).run(id, 'default_user');
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: (error as Error).message || 'Failed to activate symptom' });
    }
});

// Deactivate a symptom
router.post('/:id/deactivate', async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        db.prepare(`UPDATE symptom SET active = 0, deactivated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?`).run(id, 'default_user');
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: (error as Error).message || 'Failed to deactivate symptom' });
    }
});

// Edit a symptom's name
router.put('/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    try {
        db.prepare(`UPDATE symptom SET name = ? WHERE id = ? AND user_id = ?`).run(name, id, 'default_user');
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: (error as Error).message || 'Failed to update symptom' });
    }
});

// Add a symptom event (log occurrence)
router.post('/event', async (req: Request, res: Response) => {
    const { timestamp, symptom_id, severity, notes } = req.body;
    if (!timestamp || !symptom_id || severity === undefined) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    try {
        db.prepare(`
            INSERT INTO symptom_event (
                user_id, timestamp, symptom_id, severity, notes
            ) VALUES (?, ?, ?, ?, ?)
        `).run('default_user', timestamp, symptom_id, severity, notes || null);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: (error as Error).message || 'Failed to add symptom event' });
    }
});

// Get symptom events (optionally filter by date range or symptom)
router.get('/event', async (req: Request, res: Response) => {
    const { startDate, endDate, symptom_id } = req.query;
    let query = `
        SELECT se.*, s.name as symptom_name FROM symptom_event se
        JOIN symptom s ON se.symptom_id = s.id
        WHERE se.user_id = ?
    `;
    const params: any[] = ['default_user'];
    if (startDate && endDate) {
        query += ' AND se.timestamp BETWEEN ? AND ?';
        params.push(startDate, endDate);
    }
    if (symptom_id) {
        query += ' AND se.symptom_id = ?';
        params.push(symptom_id);
    }
    query += ' ORDER BY se.timestamp DESC';
    try {
        const events = db.prepare(query).all(...params);
        res.json(events);
    } catch (error) {
        res.status(500).json({ error: (error as Error).message || 'Failed to fetch symptom events' });
    }
});

// Update a symptom event
router.put('/event/:id', async (req: Request<{ id: string }>, res: Response) => {
    const { id } = req.params;
    const { timestamp, symptom_id, severity, notes } = req.body;
    try {
        const result = db.prepare(`
            UPDATE symptom_event
            SET timestamp = ?, symptom_id = ?, severity = ?, notes = ?
            WHERE rowid = ? AND user_id = ?
        `).run(timestamp, symptom_id, severity, notes || null, id, 'default_user');
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Symptom event not found' });
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: (error as Error).message || 'Failed to update symptom event' });
    }
});

// Delete a symptom event
router.delete('/event/:id', async (req: Request<{ id: string }>, res: Response) => {
    const { id } = req.params;
    try {
        const result = db.prepare(`
            DELETE FROM symptom_event
            WHERE rowid = ? AND user_id = ?
        `).run(id, 'default_user');
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Symptom event not found' });
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: (error as Error).message || 'Failed to delete symptom event' });
    }
});

export const symptomRouter = router; 
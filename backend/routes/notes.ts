import express, { Request, Response } from 'express';
import db from '../config/database';

const router = express.Router();

// Add a new note
router.post('/', async (req: Request, res: Response) => {
    try {
        const { timestamp, title, content } = req.body;
        const userId = 'default_user';

        db.prepare(
            'INSERT INTO general_note (user_id, timestamp, title, content) VALUES (?, ?, ?, ?)'
        ).run(userId, timestamp, title, content);

        res.status(201).json({ message: 'Note added successfully' });
    } catch (error) {
        console.error('Error adding note:', error);
        res.status(500).json({ error: 'Failed to add note' });
    }
});

// Get all notes for a user
router.get('/', async (req: Request, res: Response) => {
    try {
        const userId = 'default_user';
        const notes = db.prepare(
            'SELECT * FROM general_note WHERE user_id = ? ORDER BY timestamp DESC'
        ).all(userId);
        res.json(notes);
    } catch (error) {
        console.error('Error fetching notes:', error);
        res.status(500).json({ error: 'Failed to fetch notes' });
    }
});

// Update a note
router.put('/:timestamp', async (req: Request, res: Response) => {
    try {
        const { title, content } = req.body;
        const userId = 'default_user';
        const timestamp = req.params.timestamp;

        db.prepare(
            'UPDATE general_note SET title = ?, content = ? WHERE user_id = ? AND timestamp = ?'
        ).run(title, content, userId, timestamp);

        res.json({ message: 'Note updated successfully' });
    } catch (error) {
        console.error('Error updating note:', error);
        res.status(500).json({ error: 'Failed to update note' });
    }
});

// Delete a note
router.delete('/:timestamp', async (req: Request, res: Response) => {
    try {
        const userId = 'default_user';
        const timestamp = req.params.timestamp;

        db.prepare(
            'DELETE FROM general_note WHERE user_id = ? AND timestamp = ?'
        ).run(userId, timestamp);

        res.json({ message: 'Note deleted successfully' });
    } catch (error) {
        console.error('Error deleting note:', error);
        res.status(500).json({ error: 'Failed to delete note' });
    }
});

export default router; 
import express from 'express';
import { db } from '../config/database';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Add a new note
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { timestamp, title, content } = req.body;
        const userId = req.user.id;

        await db.run(
            'INSERT INTO general_note (user_id, timestamp, title, content) VALUES (?, ?, ?, ?)',
            [userId, timestamp, title, content]
        );

        res.status(201).json({ message: 'Note added successfully' });
    } catch (error) {
        console.error('Error adding note:', error);
        res.status(500).json({ error: 'Failed to add note' });
    }
});

// Get all notes for a user
router.get('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const notes = await db.all(
            'SELECT * FROM general_note WHERE user_id = ? ORDER BY timestamp DESC',
            [userId]
        );
        res.json(notes);
    } catch (error) {
        console.error('Error fetching notes:', error);
        res.status(500).json({ error: 'Failed to fetch notes' });
    }
});

// Update a note
router.put('/:timestamp', authenticateToken, async (req, res) => {
    try {
        const { title, content } = req.body;
        const userId = req.user.id;
        const timestamp = req.params.timestamp;

        await db.run(
            'UPDATE general_note SET title = ?, content = ? WHERE user_id = ? AND timestamp = ?',
            [title, content, userId, timestamp]
        );

        res.json({ message: 'Note updated successfully' });
    } catch (error) {
        console.error('Error updating note:', error);
        res.status(500).json({ error: 'Failed to update note' });
    }
});

// Delete a note
router.delete('/:timestamp', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const timestamp = req.params.timestamp;

        await db.run(
            'DELETE FROM general_note WHERE user_id = ? AND timestamp = ?',
            [userId, timestamp]
        );

        res.json({ message: 'Note deleted successfully' });
    } catch (error) {
        console.error('Error deleting note:', error);
        res.status(500).json({ error: 'Failed to delete note' });
    }
});

export default router; 
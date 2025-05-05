import express, { Request, Response } from 'express';
import db from '../config/database';

const router = express.Router();

// POST /user/init - create or return a userId
router.post('/init', (req: Request, res: Response) => {
  let { userId } = req.body;
  if (userId) {
    // Check if user exists
    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
    if (user) {
      return res.json({ userId });
    }
  }
  // Create a new user
  userId = require('crypto').randomUUID();
  db.prepare('INSERT INTO users (id) VALUES (?)').run(userId);
  return res.json({ userId });
});

export default router; 
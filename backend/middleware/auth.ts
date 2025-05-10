import { Request, Response, NextFunction } from 'express';
import db from '../config/database';

export const userIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Look for user ID in the x-user-id header
  const userId = req.header('x-user-id');

  if (!userId) {
    return res.status(401).json({ error: 'User ID is required in x-user-id header' });
  }

  // Debug: print all user IDs in the users table
  const allUsers = db.prepare('SELECT id FROM users').all() as {id: string}[];
  console.log('All users in DB:', allUsers.map(u => u.id));

  // Check if user exists in database
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
  if (!user) {
    return res.status(401).json({ error: 'Invalid user ID' });
  }

  // Attach userId to request for downstream use
  (req as any).userId = userId;
  next();
}; 
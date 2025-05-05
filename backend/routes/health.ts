import express, { Request, Response } from 'express';
import prodDb from '../config/database';
import testDb from '../config/database.test';
import { userIdMiddleware } from '../middleware/auth';

// Use test database if in test environment
const db = process.env.NODE_ENV === 'test' ? testDb : prodDb;

const router = express.Router();

// Apply userIdMiddleware to all routes
router.use(userIdMiddleware);

// Get metrics from daily_summary table
router.get('/metrics', (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { startDate, endDate, metrics } = req.query;

    if (!startDate || !endDate || !metrics) {
        return res.status(400).json({ error: 'Start date, end date, and metrics are required' });
    }

    try {
        // Parse metrics array
        const metricsList = (metrics as string).split(',');
        
        // Define valid metrics based on daily_summary table columns
        const validMetrics = new Set([
            'hrv_rmssd', 'total_sleep', 'resting_hr', 'steps', 
            'deep_sleep', 'light_sleep', 'rem_sleep', 'wake_minutes',
            'azm_total', 'azm_fatburn', 'azm_cardio', 'azm_peak',
            'spo2_avg', 'breathing_rate', 'skin_temp_delta'
        ]);

        const requestedMetrics = metricsList.filter(m => validMetrics.has(m));

        if (requestedMetrics.length === 0) {
            console.log('No valid metrics found in:', metricsList);
            return res.status(400).json({ error: 'No valid metrics requested' });
        }

        // Always include date in the selection
        const sql = `
            SELECT date, ${requestedMetrics.join(', ')}
            FROM daily_summary
            WHERE user_id = ?
            AND date BETWEEN ? AND ?
            ORDER BY date ASC
        `;

        const stmt = db.prepare(sql);
        const data = stmt.all(userId, startDate, endDate);

        return res.json({ data });
    } catch (error) {
        console.error('Error fetching metrics:', error);
        return res.status(500).json({ error: 'Failed to fetch metrics' });
    }
});

// Add a test endpoint to verify the router is working
router.get('/test', (req: Request, res: Response) => {
    console.log('Health router test endpoint hit');
    console.log('Query params:', req.query);
    console.log('Headers:', req.headers);
    res.json({ 
        message: 'Health router is working',
        timestamp: new Date().toISOString(),
        query: req.query,
        headers: {
            host: req.headers.host,
            origin: req.headers.origin,
            referer: req.headers.referer
        }
    });
});

export const healthRouter = router; 
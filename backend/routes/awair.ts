import express, { Request, Response } from 'express';
import axios from 'axios';
import db from '../config/database';
import { userIdMiddleware } from '../middleware/auth';

interface AwairSettings {
    token: string | null;
}

const router = express.Router();

// Apply userIdMiddleware to all routes
router.use(userIdMiddleware);

// Get Awair connection status and settings
router.get('/status', async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        if (!userId) {
            return res.status(400).json({ error: 'userId is required' });
        }

        // Get user's Awair settings from database
        const userSettings = db.prepare('SELECT token FROM awair_settings WHERE user_id = ?').get(userId) as AwairSettings | undefined;
        
        if (!userSettings?.token) {
            return res.json({
                connected: false,
                token: null,
                devices: []
            });
        }

        // Test the token by fetching devices
        try {
            const response = await axios.get('https://developer.getawair.com/v1/users/self/devices', {
                headers: {
                    'Authorization': `Bearer ${userSettings.token}`
                }
            });

            return res.json({
                connected: true,
                token: userSettings.token,
                devices: response.data.devices
            });
        } catch (error) {
            // Token might be invalid
            return res.json({
                connected: false,
                token: null,
                devices: []
            });
        }
    } catch (error) {
        console.error('Awair status error:', error);
        res.status(500).json({ error: 'Failed to check Awair status' });
    }
});

// Get list of user's Awair devices
router.get('/devices', async (req: Request, res: Response) => {
    try {
        const response = await axios.get('https://developer.getawair.com/v1/users/self/devices', {
            headers: {
                'Authorization': `Bearer ${process.env.AWAIR_ACCESS_TOKEN}`
            }
        });
        res.json(response.data);
    } catch (error) {
        console.error('Awair devices error:', error);
        res.status(500).json({ error: 'Failed to fetch Awair devices' });
    }
});

// Sync data from a specific device
router.get('/sync/:deviceId', async (req: Request<{ deviceId: string }>, res: Response) => {
    const { deviceId } = req.params;
    const { startDate, endDate } = req.query;
    const userId = (req as any).userId;

    try {
        const response = await axios.get(
            `https://developer.getawair.com/v1/users/self/devices/${deviceId}/air-data`,
            {
                params: {
                    from: startDate,
                    to: endDate,
                    avg: '15min'
                },
                headers: {
                    'Authorization': `Bearer ${process.env.AWAIR_ACCESS_TOKEN}`
                }
            }
        );

        // Store readings in database
        const stmt = db.prepare(`
            INSERT OR REPLACE INTO awair_reading (
                user_id, device_id, timestamp, score, pm25, voc, co2, humidity, temperature
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        response.data.data.forEach((reading: any) => {
            stmt.run(
                userId, // Use the actual user ID
                deviceId,
                reading.timestamp,
                reading.score,
                reading.pm25,
                reading.voc,
                reading.co2,
                reading.humidity,
                reading.temperature
            );
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Awair sync error:', error);
        res.status(500).json({ error: 'Failed to sync Awair data' });
    }
});

// Save Awair settings
router.post('/settings', async (req: Request, res: Response) => {
    try {
        const { token } = req.body;
        const userId = (req as any).userId;
        if (!userId || !token) {
            return res.status(400).json({ error: 'userId and token are required' });
        }

        // Test the token first
        try {
            await axios.get('https://developer.getawair.com/v1/users/self/devices', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
        } catch (error) {
            return res.status(400).json({ error: 'Invalid Awair token' });
        }

        // Save or update settings
        db.prepare(`
            INSERT OR REPLACE INTO awair_settings (user_id, token, updated_at)
            VALUES (?, ?, CURRENT_TIMESTAMP)
        `).run(userId, token);

        res.json({ success: true });
    } catch (error) {
        console.error('Failed to save Awair settings:', error);
        res.status(500).json({ error: 'Failed to save Awair settings' });
    }
});

export const awairRouter = router; 
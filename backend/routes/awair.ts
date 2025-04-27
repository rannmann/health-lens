import express, { Request, Response } from 'express';
import axios from 'axios';
import db from '../config/database';

const router = express.Router();

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
                'default_user', // In a real app, you'd use the actual user ID
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

export const awairRouter = router; 
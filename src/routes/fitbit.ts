import express, { Request, Response } from 'express';
import axios from 'axios';
import db from '../config/database';
import { addDays, format, parseISO } from 'date-fns';

const router = express.Router();

interface FitbitToken {
    access_token: string;
    refresh_token: string;
    expires_at: string;
    scope: string;
}

// Helper function to refresh access token
async function refreshAccessToken(userId: string): Promise<FitbitToken> {
    const token = db.prepare(`
        SELECT refresh_token FROM fitbit_tokens 
        WHERE user_id = ? AND expires_at > datetime('now')
    `).get(userId) as { refresh_token: string };

    if (!token) {
        throw new Error('No valid refresh token found');
    }

    try {
        const response = await axios.post('https://api.fitbit.com/oauth2/token', {
            grant_type: 'refresh_token',
            refresh_token: token.refresh_token,
            client_id: process.env.FITBIT_CLIENT_ID,
            client_secret: process.env.FITBIT_CLIENT_SECRET
        }, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        const { access_token, refresh_token, expires_in, scope } = response.data;
        const expires_at = format(addDays(new Date(), expires_in / 86400), "yyyy-MM-dd'T'HH:mm:ss");

        // Update tokens in database
        db.prepare(`
            UPDATE fitbit_tokens 
            SET access_token = ?, refresh_token = ?, expires_at = ?, scope = ?, updated_at = datetime('now')
            WHERE user_id = ?
        `).run(access_token, refresh_token, expires_at, scope, userId);

        return { access_token, refresh_token, expires_at, scope };
    } catch (error) {
        console.error('Token refresh error:', error);
        throw error;
    }
}

// Helper function to get valid access token
async function getValidAccessToken(userId: string): Promise<string> {
    const token = db.prepare(`
        SELECT access_token, expires_at FROM fitbit_tokens 
        WHERE user_id = ?
    `).get(userId) as { access_token: string; expires_at: string };

    if (!token) {
        throw new Error('No access token found');
    }

    // If token is expired or will expire in the next 5 minutes, refresh it
    if (parseISO(token.expires_at) <= addDays(new Date(), 5 / 1440)) {
        const newToken = await refreshAccessToken(userId);
        return newToken.access_token;
    }

    return token.access_token;
}

// OAuth2 endpoints
router.get('/auth', (req: Request, res: Response) => {
    const clientId = process.env.FITBIT_CLIENT_ID;
    const redirectUri = process.env.FITBIT_REDIRECT_URI;
    const scope = 'activity heartrate location nutrition profile settings sleep social weight oxygen_saturation temperature';
    
    const authUrl = `https://www.fitbit.com/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}`;
    res.redirect(authUrl);
});

router.get('/callback', async (req: Request, res: Response) => {
    const { code } = req.query;
    if (!code) {
        return res.status(400).json({ error: 'Authorization code is required' });
    }

    try {
        const response = await axios.post('https://api.fitbit.com/oauth2/token', {
            client_id: process.env.FITBIT_CLIENT_ID,
            client_secret: process.env.FITBIT_CLIENT_SECRET,
            code,
            grant_type: 'authorization_code',
            redirect_uri: process.env.FITBIT_REDIRECT_URI
        }, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        const { access_token, refresh_token, expires_in, user_id, scope } = response.data;
        const expires_at = format(addDays(new Date(), expires_in / 86400), "yyyy-MM-dd'T'HH:mm:ss");

        // Create user if not exists
        db.prepare('INSERT OR IGNORE INTO users (id) VALUES (?)').run(user_id);
        
        // Store tokens in database
        db.prepare(`
            INSERT OR REPLACE INTO fitbit_tokens (
                user_id, access_token, refresh_token, expires_at, scope
            ) VALUES (?, ?, ?, ?, ?)
        `).run(user_id, access_token, refresh_token, expires_at, scope);

        res.json({ success: true, user_id });
    } catch (error) {
        console.error('Fitbit token exchange error:', error);
        res.status(500).json({ error: 'Failed to exchange authorization code' });
    }
});

// Data sync endpoints
router.get('/sync/:userId', async (req: Request<{ userId: string }>, res: Response) => {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;

    try {
        const access_token = await getValidAccessToken(userId);

        // Fetch all data types in parallel
        const [
            heartData,
            sleepData,
            activityData,
            hrvData,
            spo2Data,
            temperatureData
        ] = await Promise.all([
            axios.get(`https://api.fitbit.com/1/user/${userId}/activities/heart/date/${startDate}/${endDate}.json`, {
                headers: { Authorization: `Bearer ${access_token}` }
            }),
            axios.get(`https://api.fitbit.com/1/user/${userId}/sleep/date/${startDate}/${endDate}.json`, {
                headers: { Authorization: `Bearer ${access_token}` }
            }),
            axios.get(`https://api.fitbit.com/1/user/${userId}/activities/steps/date/${startDate}/${endDate}.json`, {
                headers: { Authorization: `Bearer ${access_token}` }
            }),
            axios.get(`https://api.fitbit.com/1/user/${userId}/hrv/date/${startDate}/${endDate}.json`, {
                headers: { Authorization: `Bearer ${access_token}` }
            }),
            axios.get(`https://api.fitbit.com/1/user/${userId}/sleep/spo2/date/${startDate}/${endDate}.json`, {
                headers: { Authorization: `Bearer ${access_token}` }
            }),
            axios.get(`https://api.fitbit.com/1/user/${userId}/temperature/skin/date/${startDate}/${endDate}.json`, {
                headers: { Authorization: `Bearer ${access_token}` }
            })
        ]);

        // Process and store data in database
        const stmt = db.prepare(`
            INSERT OR REPLACE INTO daily_summary (
                user_id, date, resting_hr, steps, hrv_rmssd, 
                spo2_avg, skin_temp_delta, total_sleep, 
                deep_sleep, light_sleep, rem_sleep, wake_minutes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        // Process each day's data
        const heartActivities = heartData.data['activities-heart'];
        for (const day of heartActivities) {
            const sleep = sleepData.data.sleep.find((s: any) => s.dateOfSleep === day.dateTime);
            const hrv = hrvData.data.hrv.find((h: any) => h.dateTime === day.dateTime);
            const spo2 = spo2Data.data.avgSpo2.find((s: any) => s.dateTime === day.dateTime);
            const temp = temperatureData.data.tempSkin.find((t: any) => t.dateTime === day.dateTime);
            const steps = activityData.data['activities-steps'].find((a: any) => a.dateTime === day.dateTime);

            stmt.run(
                userId,
                day.dateTime,
                day.value.restingHeartRate,
                steps?.value || 0,
                hrv?.value.dailyRmssd || null,
                spo2?.value || null,
                temp?.value.nightlyRelative || null,
                sleep?.duration || 0,
                sleep?.levels.summary.deep.minutes || 0,
                sleep?.levels.summary.light.minutes || 0,
                sleep?.levels.summary.rem.minutes || 0,
                sleep?.levels.summary.wake.minutes || 0
            );
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Fitbit sync error:', error);
        if (axios.isAxiosError(error) && error.response?.status === 429) {
            res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
        } else {
            res.status(500).json({ error: 'Failed to sync Fitbit data' });
        }
    }
});

// Individual metric endpoints
router.get('/:userId/:metric', async (req: Request<{ userId: string; metric: string }>, res: Response) => {
    const { userId, metric } = req.params;
    const { startDate, endDate } = req.query;

    try {
        const access_token = await getValidAccessToken(userId);

        // Map metric to Fitbit endpoint
        const endpoints: Record<string, string> = {
            'heart-rate': `activities/heart/date/${startDate}/${endDate}.json`,
            'steps': `activities/steps/date/${startDate}/${endDate}.json`,
            'sleep': `sleep/date/${startDate}/${endDate}.json`,
            'hrv': `hrv/date/${startDate}/${endDate}.json`,
            'spo2': `sleep/spo2/date/${startDate}/${endDate}.json`,
            'temperature': `temperature/skin/date/${startDate}/${endDate}.json`
        };

        const endpoint = endpoints[metric];
        if (!endpoint) {
            return res.status(400).json({ error: 'Invalid metric' });
        }

        const response = await axios.get(`https://api.fitbit.com/1/user/${userId}/${endpoint}`, {
            headers: { Authorization: `Bearer ${access_token}` }
        });

        res.json(response.data);
    } catch (error) {
        console.error(`Fitbit ${metric} fetch error:`, error);
        if (axios.isAxiosError(error) && error.response?.status === 429) {
            res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
        } else {
            res.status(500).json({ error: `Failed to fetch ${metric} data` });
        }
    }
});

export const fitbitRouter = router; 
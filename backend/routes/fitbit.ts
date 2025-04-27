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
        SELECT refresh_token FROM fitbit_connections 
        WHERE user_id = ? AND expires_at > datetime('now')
    `).get(userId) as { refresh_token: string };

    if (!token) {
        throw new Error('No valid refresh token found');
    }

    try {
        // Create Basic Auth header from client credentials
        const basicAuth = Buffer.from(`${process.env.FITBIT_CLIENT_ID}:${process.env.FITBIT_CLIENT_SECRET}`).toString('base64');
        
        const response = await axios.post('https://api.fitbit.com/oauth2/token',
            new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: token.refresh_token
            }).toString(),
            {
                headers: {
                    'Authorization': `Basic ${basicAuth}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );

        const { access_token, refresh_token, expires_in, scope } = response.data;
        const expires_at = format(addDays(new Date(), expires_in / 86400), "yyyy-MM-dd'T'HH:mm:ss");

        // Update tokens in database
        db.prepare(`
            UPDATE fitbit_connections 
            SET access_token = ?, refresh_token = ?, expires_at = ?, scope = ?, updated_at = datetime('now')
            WHERE user_id = ?
        `).run(access_token, refresh_token, expires_at, scope, userId);

        return { access_token, refresh_token, expires_at, scope };
    } catch (error) {
        console.error('Token refresh error:', error);
        throw error;
    }
}

// Helper function to get valid access token and Fitbit user ID
async function getValidAccessToken(userId: string): Promise<{ access_token: string; fitbit_user_id: string }> {
    console.log('Getting access token for user:', userId);
    
    // First check if the user exists
    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
    console.log('User found:', user);
    
    if (!user) {
        throw new Error('User not found');
    }
    
    const connection = db.prepare(`
        SELECT access_token, expires_at, fitbit_user_id FROM fitbit_connections 
        WHERE user_id = ?
    `).get(userId) as { access_token: string; expires_at: string; fitbit_user_id: string };
    
    console.log('Fitbit connection found:', connection);

    if (!connection) {
        throw new Error('No Fitbit connection found');
    }

    // Check if token is expired or will expire in the next 5 minutes
    const expiresAt = parseISO(connection.expires_at);
    const now = new Date();
    
    // Calculate minutes until expiration
    const minutesUntilExpiration = (expiresAt.getTime() - now.getTime()) / (60 * 1000);
    
    // Only refresh if less than 5 minutes until expiration
    const needsRefresh = minutesUntilExpiration < 5;
    
    console.log('Token expiration check:', {
        expiresAt: expiresAt.toISOString(),
        now: now.toISOString(),
        minutesUntilExpiration,
        needsRefresh
    });

    if (needsRefresh) {
        console.log('Token expires soon, refreshing...');
        const newToken = await refreshAccessToken(userId);
        return { access_token: newToken.access_token, fitbit_user_id: connection.fitbit_user_id };
    }

    return { access_token: connection.access_token, fitbit_user_id: connection.fitbit_user_id };
}

// OAuth2 endpoints
router.get('/auth', (req: Request, res: Response) => {
    const clientId = process.env.FITBIT_CLIENT_ID;
    const redirectUri = encodeURIComponent(process.env.FITBIT_REDIRECT_URI || '');
    
    // Define scopes based on our data collection needs from README
    const scopes = [
        'activity',          // For steps and Active Zone Minutes
        'heartrate',         // For resting HR and HRV
        'oxygen_saturation', // For SpO₂
        'respiratory_rate',  // For breathing rate
        'sleep',             // For sleep stages
        'temperature'        // For skin temperature variation
    ];
    const scope = encodeURIComponent(scopes.join(' '));
    
    // Validate required credentials
    if (!clientId || !redirectUri) {
        console.error('Missing required OAuth credentials:', { clientId: !!clientId, redirectUri: !!process.env.FITBIT_REDIRECT_URI });
        return res.status(500).json({ error: 'OAuth configuration is incomplete' });
    }

    // Generate random state for CSRF protection
    const state = Math.random().toString(36).substring(7);
    
    const authUrl = `https://www.fitbit.com/oauth2/authorize?` +
        `response_type=code&` +
        `client_id=${clientId}&` +
        `redirect_uri=${redirectUri}&` +
        `scope=${scope}&` +
        `state=${state}&` +
        `prompt=consent`;

    res.redirect(authUrl);
});

router.get('/callback', async (req: Request, res: Response) => {
    const { code } = req.query;
    if (!code) {
        return res.status(400).json({ error: 'Authorization code is required' });
    }

    try {
        // Create Basic Auth header from client credentials
        const basicAuth = Buffer.from(`${process.env.FITBIT_CLIENT_ID}:${process.env.FITBIT_CLIENT_SECRET}`).toString('base64');
        
        const response = await axios.post('https://api.fitbit.com/oauth2/token', 
            new URLSearchParams({
                code: code as string,
                grant_type: 'authorization_code',
                redirect_uri: process.env.FITBIT_REDIRECT_URI || ''
            }).toString(),
            {
                headers: {
                    'Authorization': `Basic ${basicAuth}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );

        const { access_token, refresh_token, expires_in, user_id: fitbit_user_id, scope } = response.data;
        const expires_at = format(addDays(new Date(), expires_in / 86400), "yyyy-MM-dd'T'HH:mm:ss");

        console.log('OAuth callback received:', {
            fitbit_user_id,
            expires_at,
            scope
        });

        // Create a new user with a UUID
        const userId = require('crypto').randomUUID();
        console.log('Created new user with ID:', userId);
        
        // First create the user
        const userResult = db.prepare('INSERT INTO users (id) VALUES (?)').run(userId);
        console.log('User creation result:', userResult);
        
        // Then create the Fitbit connection
        const connectionResult = db.prepare(`
            INSERT INTO fitbit_connections (
                user_id, fitbit_user_id, access_token, refresh_token, expires_at, scope
            ) VALUES (?, ?, ?, ?, ?, ?)
        `).run(userId, fitbit_user_id, access_token, refresh_token, expires_at, scope);
        console.log('Fitbit connection creation result:', connectionResult);

        // Verify the connection was created
        const verifyConnection = db.prepare('SELECT * FROM fitbit_connections WHERE user_id = ?').get(userId);
        console.log('Verification of created connection:', verifyConnection);

        // Return both IDs so frontend can store them
        res.json({ 
            success: true, 
            userId: userId,  // Our local user ID
            fitbitUserId: fitbit_user_id  // Fitbit's user ID
        });
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
        const { access_token, fitbit_user_id } = await getValidAccessToken(userId);

        // Common headers for all Fitbit API requests
        const headers = {
            'Authorization': `Bearer ${access_token}`,
            'Accept-Language': 'en_US'
        };

        // Calculate date range that doesn't include future dates
        const now = new Date();
        const yesterday = addDays(now, -1); // Use yesterday as the latest date to ensure complete data
        
        const end = endDate ? 
            new Date(endDate as string) > yesterday ? format(yesterday, 'yyyy-MM-dd') : endDate as string : 
            format(yesterday, 'yyyy-MM-dd');
        
        // Ensure we don't exceed 30 days for endpoints with limits
        const thirtyDaysAgo = format(addDays(new Date(end), -30), 'yyyy-MM-dd');
        const start = startDate ? 
            startDate as string > thirtyDaysAgo ? startDate as string : thirtyDaysAgo :
            thirtyDaysAgo;

        console.log('Fetching Fitbit data for date range:', { 
            start, 
            end, 
            now: now.toISOString(),
            isEndInFuture: new Date(end) > yesterday,
            yesterday: format(yesterday, 'yyyy-MM-dd'),
            thirtyDaysAgo
        });

        // Fetch all data types in parallel, handling errors individually
        const results = await Promise.allSettled([
            axios.get(`https://api.fitbit.com/1/user/${fitbit_user_id}/activities/heart/date/${start}/${end}.json`, {
                headers
            }),
            axios.get(`https://api.fitbit.com/1/user/${fitbit_user_id}/sleep/date/${start}/${end}.json`, {
                headers
            }),
            axios.get(`https://api.fitbit.com/1/user/${fitbit_user_id}/activities/steps/date/${start}/${end}.json`, {
                headers
            }),
            axios.get(`https://api.fitbit.com/1/user/${fitbit_user_id}/hrv/date/${start}/${end}.json`, {
                headers
            })
        ]);

        // Optional endpoints that might not be available for all devices
        const optionalResults = await Promise.allSettled([
            // SpO2 data for main sleep periods
            axios.get(`https://api.fitbit.com/1/user/${fitbit_user_id}/spo2/date/${start}/${end}.json`, {
                headers
            }).catch(error => {
                console.log('SpO2 data not available:', error.response?.status, error.response?.data);
                return null;
            }),
            // Temperature data from skin temperature sensor during main sleep
            axios.get(`https://api.fitbit.com/1/user/${fitbit_user_id}/temp/skin/date/${start}/${end}.json`, {
                headers
            }).catch(error => {
                console.log('Temperature data not available:', error.response?.status, error.response?.data);
                return null;
            }),
            // Breathing rate data from main sleep
            axios.get(`https://api.fitbit.com/1/user/${fitbit_user_id}/br/date/${start}/${end}.json`, {
                headers
            }).catch(error => {
                console.log('Breathing rate data not available:', error.response?.status, error.response?.data);
                return null;
            })
        ]);

        // Log any failed requests for required endpoints
        results.forEach((result, index) => {
            if (result.status === 'rejected') {
                const endpoints = ['heart', 'sleep', 'steps', 'hrv'];
                console.log(`${endpoints[index]} API request failed:`, result.reason?.response?.status, result.reason?.response?.data);
            }
        });

        // Process successful results
        const [heartData, sleepData, activityData, hrvData] = results.map(result => 
            result.status === 'fulfilled' ? result.value.data : null
        );

        const [spo2Data, tempData, breathingData] = optionalResults.map(result =>
            result.status === 'fulfilled' && result.value ? result.value.data : null
        );

        // Process and store data in database
        const stmt = db.prepare(`
            INSERT OR REPLACE INTO daily_summary (
                user_id, date, resting_hr, steps, hrv_rmssd, 
                spo2_avg, skin_temp_delta, breathing_rate,
                total_sleep, deep_sleep, light_sleep, rem_sleep, wake_minutes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        let daysProcessed = 0;
        // Process each day's data
        if (heartData && heartData['activities-heart']) {
            for (const day of heartData['activities-heart']) {
                const sleep = sleepData?.sleep?.find((s: any) => s.dateOfSleep === day.dateTime);
                const hrv = hrvData?.hrv?.find((h: any) => h.dateTime === day.dateTime);
                const spo2 = spo2Data?.find((s: any) => s.dateTime === day.dateTime);
                const temp = tempData?.tempSkin?.find((t: any) => t.dateTime === day.dateTime);
                const breathing = breathingData?.br?.find((b: any) => b.dateTime === day.dateTime);
                const steps = activityData?.['activities-steps']?.find((a: any) => a.dateTime === day.dateTime);

                stmt.run(
                    userId,
                    day.dateTime,
                    day.value?.restingHeartRate,
                    steps?.value || 0,
                    hrv?.value?.dailyRmssd || null,
                    spo2?.value?.avg || null,
                    temp?.value?.nightlyRelative || null,
                    breathing?.value?.breathingRate || null,
                    sleep?.duration || 0,
                    sleep?.levels?.summary?.deep?.minutes || 0,
                    sleep?.levels?.summary?.light?.minutes || 0,
                    sleep?.levels?.summary?.rem?.minutes || 0,
                    sleep?.levels?.summary?.wake?.minutes || 0
                );
                daysProcessed++;
            }
        }

        console.log(`Successfully processed ${daysProcessed} days of data`);
        res.json({ success: true, daysProcessed });
    } catch (error) {
        console.error('Fitbit sync error:', error);
        res.status(500).json({ error: 'Failed to sync Fitbit data' });
    }
});

// Individual metric endpoints
router.get('/:userId/:metric', async (req: Request<{ userId: string; metric: string }>, res: Response) => {
    const { userId, metric } = req.params;
    const { startDate, endDate } = req.query;

    try {
        const { access_token, fitbit_user_id } = await getValidAccessToken(userId);

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

        const response = await axios.get(`https://api.fitbit.com/1/user/${fitbit_user_id}/${endpoint}`, {
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

// Check connection status
router.get('/status/:userId', async (req: Request<{ userId: string }>, res: Response) => {
    const { userId } = req.params;

    try {
        const connection = db.prepare(`
            SELECT expires_at, updated_at FROM fitbit_connections 
            WHERE user_id = ?
        `).get(userId) as { expires_at: string; updated_at: string } | undefined;

        if (!connection) {
            return res.json({ connected: false });
        }

        // Check if token is valid
        const isValid = parseISO(connection.expires_at) > new Date();
        
        res.json({ 
            connected: isValid,
            lastSync: connection.updated_at
        });
    } catch (error) {
        console.error('Fitbit status check error:', error);
        res.status(500).json({ error: 'Failed to check Fitbit connection status' });
    }
});

// Disconnect Fitbit
router.post('/disconnect', async (req: Request, res: Response) => {
    const { userId } = req.body;
    
    if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
    }

    try {
        const result = db.prepare('DELETE FROM fitbit_connections WHERE user_id = ?').run(userId);
        if (result.changes === 0) {
            return res.status(404).json({ error: 'No Fitbit connection found for this user' });
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Fitbit disconnect error:', error);
        res.status(500).json({ error: 'Failed to disconnect Fitbit' });
    }
});

export const fitbitRouter = router; 
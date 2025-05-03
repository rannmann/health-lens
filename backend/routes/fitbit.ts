import express, { Request, Response } from 'express';
import axios from 'axios';
import db from '../config/database';
import { addDays, format, parseISO } from 'date-fns';
import {
    ENDPOINT_CONFIGS,
    getValidAccessToken,
    refreshAccessToken,
    processEndpointData,
    endpointFetchers
} from '../services/fitbit/fitbitService';

const router = express.Router();

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

// Add a lock map to prevent concurrent backfills
const backfillLocks = new Map<string, boolean>();

// Modify the backfill endpoint to use the enhanced rate limiting
router.post('/backfill/:userId', async (req: Request<{ userId: string }>, res: Response) => {
    const { userId } = req.params;
    const { startDate, endpoints, customEndDate } = req.body;

    if (!startDate) {
        return res.status(400).json({ error: 'Start date is required for backfill' });
    }

    // Prevent concurrent backfills for the same user
    if (backfillLocks.get(userId)) {
        return res.status(409).json({ error: 'A backfill is already in progress for this user.' });
    }
    backfillLocks.set(userId, true);

    try {
        // Initialize progress for all endpoints
        const initProgress = db.prepare(`
            INSERT OR REPLACE INTO fitbit_sync_progress (user_id, endpoint, last_synced_date, status)
            VALUES (?, ?, ?, ?)
        `);

        // Start backfill process in background
        res.json({ 
            message: 'Backfill process started', 
            userId,
            startDate,
            endpoints: endpoints || Object.keys(ENDPOINT_CONFIGS),
            customEndDate: customEndDate || null
        });

        const { access_token, fitbit_user_id } = await getValidAccessToken(userId);
        // Use customEndDate if provided, otherwise yesterday
        const endDate = customEndDate || format(addDays(new Date(), -1), 'yyyy-MM-dd');

        // Only process selected endpoints if provided
        const endpointKeys = endpoints && Array.isArray(endpoints) && endpoints.length > 0
            ? endpoints
            : Object.keys(ENDPOINT_CONFIGS);

        for (const endpointKey of endpointKeys) {
            const config = ENDPOINT_CONFIGS[endpointKey];
            const fetcher = endpointFetchers[endpointKey];
            if (!config || !fetcher) continue;
            try {
                initProgress.run(userId, endpointKey, startDate, 'in_progress');
                let currentDate = new Date(endDate); // Start from most recent
                const startDateTime = new Date(startDate);
                let hasMoreData = true;

                while (hasMoreData && currentDate >= startDateTime) {
                    let chunkStartDate = addDays(currentDate, -(config.maxDays - 1));
                    if (chunkStartDate < startDateTime) {
                        chunkStartDate = startDateTime;
                    }
                    const chunkStart = format(chunkStartDate, 'yyyy-MM-dd');
                    const chunkEnd = format(currentDate, 'yyyy-MM-dd');
                    try {
                        const data = await fetcher(fitbit_user_id, access_token, chunkStart, chunkEnd, userId);
                        await processEndpointData(userId, endpointKey, data, chunkStart, chunkEnd);
                        db.prepare(`
                            UPDATE fitbit_sync_progress 
                            SET last_synced_date = ?, 
                                status = 'in_progress',
                                updated_at = CURRENT_TIMESTAMP
                            WHERE user_id = ? AND endpoint = ?
                        `).run(chunkEnd, userId, endpointKey);
                        const hasData = data && (
                            data.activities?.length > 0 ||
                            data.sleep?.length > 0 ||
                            data.hrv?.length > 0 ||
                            data.br?.length > 0 ||
                            data.temperature?.length > 0 ||
                            data['activities-active-zone-minutes']?.length > 0
                        );
                        if (!hasData && currentDate < new Date('2009-01-01')) {
                            hasMoreData = false;
                        }
                    } catch (error: any) {
                        if (error.response?.status === 429) {
                            continue;
                        }
                        throw error;
                    }
                    currentDate = addDays(chunkStartDate, -1);
                }
                db.prepare(`
                    UPDATE fitbit_sync_progress 
                    SET status = 'completed',
                        updated_at = CURRENT_TIMESTAMP
                    WHERE user_id = ? AND endpoint = ?
                `).run(userId, endpointKey);
            } catch (error: any) {
                console.error(`Error backfilling ${endpointKey}:`, error);
                db.prepare(`
                    UPDATE fitbit_sync_progress 
                    SET status = 'failed',
                        error = ?,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE user_id = ? AND endpoint = ?
                `).run(error.message, userId, endpointKey);
                if (config.required) {
                    throw error;
                }
            }
        }
    } catch (error: any) {
        console.error('Backfill error:', error);
    } finally {
        backfillLocks.delete(userId);
    }
});

// Add this endpoint to check backfill progress
router.get('/backfill-status/:userId', async (req: Request<{ userId: string }>, res: Response) => {
    const { userId } = req.params;

    try {
        const progress = db.prepare(`
            SELECT endpoint, last_synced_date, status, error, updated_at
            FROM fitbit_sync_progress
            WHERE user_id = ?
        `).all(userId);

        res.json({ progress });
    } catch (error) {
        console.error('Error checking backfill status:', error);
        res.status(500).json({ error: 'Failed to check backfill status' });
    }
});

router.get('/sync/:userId', async (req: Request<{ userId: string }>, res: Response) => {
    const { userId } = req.params;
    // Use query params if provided
    const { startDate: queryStart, endDate: queryEnd } = req.query;
    try {
        const { access_token, fitbit_user_id } = await getValidAccessToken(userId);
        // Find the most recent date in daily_summary for this user
        const lastSummary = db.prepare(`
            SELECT MAX(date) as last_date
            FROM daily_summary
            WHERE user_id = ?
        `).get(userId) as { last_date: string | null };

        // Use today as end date
        let endDate = queryEnd ? String(queryEnd) : format(new Date(), 'yyyy-MM-dd');
        // If we have no data, require backfill
        let startDate: string;
        if (queryStart) {
            startDate = String(queryStart);
        } else if (lastSummary?.last_date) {
            startDate = lastSummary.last_date;
        } else {
            // No previous data, require backfill
            return res.status(400).json({
                error: 'No previous data found. Please use the backfill option to import your full Fitbit history.'
            });
        }

        // Only proceed if there's new data to sync
        if (new Date(startDate) > new Date(endDate)) {
            return res.json({ 
                message: 'Already up to date',
                lastSync: lastSummary?.last_date
            });
        }

        // Process each endpoint using the new fetchers
        for (const [endpointKey, config] of Object.entries(ENDPOINT_CONFIGS)) {
            try {
                const fetcher = endpointFetchers[endpointKey];
                if (!fetcher) continue;
                const data = await fetcher(fitbit_user_id, access_token, startDate, endDate, userId);
                await processEndpointData(userId, endpointKey, data, startDate, endDate);

                // Update sync progress
                db.prepare(`
                    INSERT OR REPLACE INTO fitbit_sync_progress 
                    (user_id, endpoint, last_synced_date, status, updated_at)
                    VALUES (?, ?, ?, 'completed', CURRENT_TIMESTAMP)
                `).run(userId, endpointKey, endDate);

            } catch (error: any) {
                console.error(`Error syncing ${endpointKey}:`, error);
                if (config.required) {
                    throw error;
                }
            }
        }

        res.json({ 
            success: true,
            message: 'Sync completed',
            syncRange: { startDate, endDate },
            needsBackfill: !lastSummary?.last_date
        });
        
    } catch (error: any) {
        if (error.message && error.message.includes('No Fitbit connection found')) {
            res.status(400).json({ error: 'No Fitbit connection found for this user. Please reconnect your Fitbit account.' });
        } else if (error.message && error.message.includes('No valid refresh token found')) {
            res.status(400).json({ error: 'No valid refresh token found. Please reconnect your Fitbit account.' });
        } else if (error.message && error.message.includes('User not found')) {
            res.status(404).json({ error: 'User not found. Please reconnect your Fitbit account.' });
        } else {
            console.error('Fitbit sync error:', error);
            res.status(500).json({ error: 'Failed to sync Fitbit data' });
        }
    }
});

// Refactored individual metric endpoint to use endpointFetchers
router.get('/:userId/:metric', async (req: Request<{ userId: string; metric: string }>, res: Response) => {
    const { userId, metric } = req.params;
    const { startDate, endDate } = req.query;

    try {
        const { access_token, fitbit_user_id } = await getValidAccessToken(userId);
        // Map metric to endpointKey
        const metricMap: Record<string, string> = {
            'heart-rate': 'heart',
            'steps': 'steps',
            'sleep': 'sleep',
            'hrv': 'hrv',
            'spo2': 'spo2',
            'temperature': 'temperature',
            'azm': 'azm',
            'breathing': 'breathing'
        };
        const endpointKey = metricMap[metric];
        const fetcher = endpointFetchers[endpointKey];
        if (!fetcher) {
            return res.status(400).json({ error: 'Invalid metric' });
        }
        const data = await fetcher(fitbit_user_id, access_token, startDate as string, endDate as string, userId);
        res.json(data);
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
router.get('/status', async (req: Request, res: Response) => {
    const { userId } = req.query;

    if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
    }

    try {
        const connection = db.prepare(`
            SELECT access_token, refresh_token, expires_at, updated_at 
            FROM fitbit_connections 
            WHERE user_id = ?
        `).get(userId) as { 
            access_token: string; 
            refresh_token: string;
            expires_at: string; 
            updated_at: string; 
        } | undefined;

        if (!connection) {
            return res.json({ connected: false });
        }

        // Check if access token is still valid
        const expiresAt = parseISO(connection.expires_at);
        const now = new Date();
        const isAccessTokenValid = expiresAt > now;

        // If access token is expired, try to refresh it
        if (!isAccessTokenValid) {
            try {
                // Attempt to refresh the token
                await refreshAccessToken(userId as string);
                // If refresh successful, connection is valid
                return res.json({ 
                    connected: true,
                    lastSync: connection.updated_at
                });
            } catch (refreshError) {
                console.error('Token refresh failed:', refreshError);
                // If refresh fails, connection is invalid
                return res.json({ connected: false });
            }
        }

        // If we get here, access token is still valid
        res.json({ 
            connected: true,
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
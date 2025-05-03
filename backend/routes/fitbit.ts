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

// Add these interfaces after the FitbitToken interface
interface EndpointConfig {
    path: string;
    maxDays: number;
    required: boolean;
}

interface SyncProgress {
    endpoint: string;
    lastSyncedDate: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    error?: string;
}

// Add these interfaces after the existing interfaces
interface RateLimitInfo {
    limit: number;
    remaining: number;
    resetTime: Date;
}

interface UserRateLimit {
    userId: string;
    rateLimitInfo: RateLimitInfo;
    lastUpdated: Date;
}

// Add this rate limit tracking before the ENDPOINT_CONFIGS
const userRateLimits = new Map<string, UserRateLimit>();

// Add these endpoint configurations before the router definitions
const ENDPOINT_CONFIGS: Record<string, EndpointConfig> = {
    heart: {
        path: 'activities/heart',
        maxDays: 365,  // 1 year
        required: true
    },
    sleep: {
        path: 'sleep',
        maxDays: 100,
        required: true
    },
    steps: {
        path: 'activities/steps',
        maxDays: 1095,  // 3 years
        required: true
    },
    hrv: {
        path: 'hrv',
        maxDays: 30,
        required: true
    },
    azm: {
        path: 'activities/active-zone-minutes',
        maxDays: 1095,  // 3 years
        required: true
    },
    spo2: {
        path: 'spo2',
        maxDays: 1095,  // Unlimited, but we'll use 3 years for consistency
        required: false
    },
    temperature: {
        path: 'temp/skin',
        maxDays: 30,
        required: false
    },
    breathing: {
        path: 'br',
        maxDays: 30,
        required: false
    }
};

// Add these interfaces for data processing
interface DailySummary {
    user_id: string;
    date: string;
    resting_hr?: number;
    steps?: number;
    hrv_rmssd?: number;
    spo2_avg?: number;
    breathing_rate?: number;
    skin_temp_delta?: number;
    total_sleep?: number;
    deep_sleep?: number;
    light_sleep?: number;
    rem_sleep?: number;
    wake_minutes?: number;
    azm_total?: number;
    azm_fatburn?: number;
    azm_cardio?: number;
    azm_peak?: number;
}

// Helper function to process and store daily summary data
function upsertDailySummary(summary: DailySummary) {
    const fields = Object.keys(summary).filter(k => summary[k as keyof DailySummary] !== undefined);
    const placeholders = fields.map(() => '?').join(', ');
    const updateClauses = fields.map(f => `${f} = excluded.${f}`).join(', ');
    
    const sql = `
        INSERT INTO daily_summary (${fields.join(', ')})
        VALUES (${placeholders})
        ON CONFLICT(user_id, date) DO UPDATE SET
        ${updateClauses}
    `;
    
    db.prepare(sql).run(...fields.map(f => summary[f as keyof DailySummary]));
}

// Helper to process data by endpoint
async function processEndpointData(
    userId: string,
    endpointKey: string,
    data: any,
    startDate: string,
    endDate: string
) {
    switch (endpointKey) {
        case 'heart':
            // Heart data comes as array of daily values
            if (data['activities-heart']) {
                for (const day of data['activities-heart']) {
                    if (day.value?.restingHeartRate) {
                        upsertDailySummary({
                            user_id: userId,
                            date: day.dateTime,
                            resting_hr: day.value.restingHeartRate
                        });
                    }
                }
            }
            break;
            
        case 'sleep':
            // Sleep data comes as array of sleep records
            if (data.sleep) {
                // Group sleep by date since there can be multiple sleep records per day
                const sleepByDate = new Map<string, {
                    total: number,
                    wake: number,
                    deep: number,
                    light: number,
                    rem: number
                }>();

                for (const sleep of data.sleep) {
                    const date = sleep.dateOfSleep;
                    const current = sleepByDate.get(date) || {
                        total: 0,
                        wake: 0,
                        deep: 0,
                        light: 0,
                        rem: 0
                    };

                    current.total += sleep.minutesAsleep || 0;
                    current.wake += sleep.minutesAwake || 0;

                    if (sleep.levels?.summary) {
                        current.deep += sleep.levels.summary.deep?.minutes || 0;
                        current.light += sleep.levels.summary.light?.minutes || 0;
                        current.rem += sleep.levels.summary.rem?.minutes || 0;
                    }

                    sleepByDate.set(date, current);
                }

                // Insert aggregated sleep data for each date
                for (const [date, summary] of sleepByDate.entries()) {
                    upsertDailySummary({
                        user_id: userId,
                        date,
                        total_sleep: summary.total,
                        wake_minutes: summary.wake,
                        deep_sleep: summary.deep,
                        light_sleep: summary.light,
                        rem_sleep: summary.rem
                    });
                }
            }
            break;
            
        case 'hrv':
            // HRV data comes as array of daily values
            if (data.hrv) {
                for (const day of data.hrv) {
                    if (day.value?.dailyRmssd) {
                        upsertDailySummary({
                            user_id: userId,
                            date: day.dateTime,
                            hrv_rmssd: day.value.dailyRmssd
                        });
                    }
                }
            }
            break;
            
        case 'steps':
            // Steps data comes as array of daily values
            if (data['activities-steps']) {
                for (const day of data['activities-steps']) {
                    upsertDailySummary({
                        user_id: userId,
                        date: day.dateTime,
                        steps: parseInt(day.value)
                    });
                }
            }
            break;
            
        case 'azm':
            // Active Zone Minutes data comes as array of daily values
            if (data['activities-active-zone-minutes']) {
                for (const day of data['activities-active-zone-minutes']) {
                    upsertDailySummary({
                        user_id: userId,
                        date: day.dateTime,
                        azm_total: day.value.activeZoneMinutes || 0,
                        azm_fatburn: day.value.fatBurnActiveZoneMinutes || 0,
                        azm_cardio: day.value.cardioActiveZoneMinutes || 0,
                        azm_peak: day.value.peakActiveZoneMinutes || 0
                    });
                }
            }
            break;
            
        case 'spo2':
            // SpO2 data comes as an array of daily values (from API)
            if (Array.isArray(data)) {
                for (const day of data) {
                    if (day.value?.avg !== undefined && day.dateTime) {
                        upsertDailySummary({
                            user_id: userId,
                            date: day.dateTime,
                            spo2_avg: day.value.avg
                        });
                    }
                }
            }
            break;
            
        case 'breathing':
            // Breathing rate comes as array of daily values
            if (data.br) {
                for (const day of data.br) {
                    if (day.value?.breathingRate) {
                        upsertDailySummary({
                            user_id: userId,
                            date: day.dateTime,
                            breathing_rate: day.value.breathingRate
                        });
                    }
                }
            }
            break;
            
        case 'temperature':
            // Temperature data comes as tempSkin array (from API)
            if (data.tempSkin) {
                for (const day of data.tempSkin) {
                    if (day.value?.nightlyRelative !== undefined && day.dateTime) {
                        upsertDailySummary({
                            user_id: userId,
                            date: day.dateTime,
                            skin_temp_delta: day.value.nightlyRelative
                        });
                    }
                }
            }
            break;
    }
}

// Helper function to refresh access token
async function refreshAccessToken(userId: string): Promise<FitbitToken> {
    const token = db.prepare(`
        SELECT refresh_token FROM fitbit_connections 
        WHERE user_id = ?
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

// Replace the existing fetchWithRateLimit with this enhanced version
async function fetchWithRateLimit(url: string, headers: any, userId: string, retryCount = 0): Promise<any> {
    // Get current rate limit info for user
    const now = new Date();
    const userLimit = userRateLimits.get(userId);
    
    // If we have rate limit info and it's not reset time yet
    if (userLimit && userLimit.rateLimitInfo.remaining <= 0) {
        const waitTime = userLimit.rateLimitInfo.resetTime.getTime() - now.getTime();
        if (waitTime > 0) {
            console.log(`Rate limit reached for user ${userId}. Waiting ${Math.ceil(waitTime/1000)} seconds...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
    }

    try {
        const response = await axios.get(url, { headers });
        
        // Update rate limit info from headers
        const rateLimitInfo: RateLimitInfo = {
            limit: parseInt(response.headers['fitbit-rate-limit-limit'] || '150'),
            remaining: parseInt(response.headers['fitbit-rate-limit-remaining'] || '0'),
            resetTime: new Date(now.getTime() + parseInt(response.headers['fitbit-rate-limit-reset'] || '3600') * 1000)
        };

        userRateLimits.set(userId, {
            userId,
            rateLimitInfo,
            lastUpdated: now
        });

        return response.data;
    } catch (error: any) {
        if (axios.isAxiosError(error) && error.response?.status === 429) {
            // Get reset time from header or default to 1 hour
            const resetSeconds = parseInt(error.response.headers['fitbit-rate-limit-reset'] || '3600');
            const resetTime = new Date(now.getTime() + resetSeconds * 1000);
            
            // Update rate limit info
            userRateLimits.set(userId, {
                userId,
                rateLimitInfo: {
                    limit: 150,
                    remaining: 0,
                    resetTime
                },
                lastUpdated: now
            });

            if (retryCount < 3) {
                console.log(`Rate limited for user ${userId}. Waiting ${resetSeconds} seconds before retry...`);
                await new Promise(resolve => setTimeout(resolve, resetSeconds * 1000));
                return fetchWithRateLimit(url, headers, userId, retryCount + 1);
            }
        }
        throw error;
    }
}

// Add this helper function to manage concurrent requests
async function processBatchWithRateLimit(
    userId: string, 
    requests: Array<{ url: string, headers: any }>, 
    batchSize = 10
): Promise<any[]> {
    const results = [];
    
    // Process in batches to respect rate limits
    for (let i = 0; i < requests.length; i += batchSize) {
        const batch = requests.slice(i, i + batchSize);
        const batchResults = await Promise.all(
            batch.map(req => fetchWithRateLimit(req.url, req.headers, userId)
                .catch(error => ({ error })))
        );
        results.push(...batchResults);

        // Check remaining rate limit and add delay if needed
        const userLimit = userRateLimits.get(userId);
        if (userLimit && userLimit.rateLimitInfo.remaining < batchSize) {
            const waitTime = Math.max(
                1000, // Minimum 1 second delay
                (userLimit.rateLimitInfo.resetTime.getTime() - Date.now()) / 2 // Half the time until reset
            );
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
    }

    return results;
}

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

// --- Fitbit API Helper Functions ---

async function fetchFitbitData(
    fitbit_user_id: string,
    access_token: string,
    endpointPath: string,
    startDate: string,
    endDate: string,
    userId: string
): Promise<any> {
    const url = `https://api.fitbit.com/1/user/${fitbit_user_id}/${endpointPath}/date/${startDate}/${endDate}.json`;
    const headers = {
        'Authorization': `Bearer ${access_token}`,
        'Accept-Language': 'en_US'
    };
    return await fetchWithRateLimit(url, headers, userId);
}

async function fetchHeartData(fitbit_user_id: string, access_token: string, startDate: string, endDate: string, userId: string) {
    return fetchFitbitData(fitbit_user_id, access_token, ENDPOINT_CONFIGS.heart.path, startDate, endDate, userId);
}
async function fetchSleepData(fitbit_user_id: string, access_token: string, startDate: string, endDate: string, userId: string) {
    return fetchFitbitData(fitbit_user_id, access_token, ENDPOINT_CONFIGS.sleep.path, startDate, endDate, userId);
}
async function fetchStepsData(fitbit_user_id: string, access_token: string, startDate: string, endDate: string, userId: string) {
    return fetchFitbitData(fitbit_user_id, access_token, ENDPOINT_CONFIGS.steps.path, startDate, endDate, userId);
}
async function fetchHRVData(fitbit_user_id: string, access_token: string, startDate: string, endDate: string, userId: string) {
    return fetchFitbitData(fitbit_user_id, access_token, ENDPOINT_CONFIGS.hrv.path, startDate, endDate, userId);
}
async function fetchAZMData(fitbit_user_id: string, access_token: string, startDate: string, endDate: string, userId: string) {
    return fetchFitbitData(fitbit_user_id, access_token, ENDPOINT_CONFIGS.azm.path, startDate, endDate, userId);
}
async function fetchSpO2Data(fitbit_user_id: string, access_token: string, startDate: string, endDate: string, userId: string) {
    return fetchFitbitData(fitbit_user_id, access_token, ENDPOINT_CONFIGS.spo2.path, startDate, endDate, userId);
}
async function fetchTemperatureData(fitbit_user_id: string, access_token: string, startDate: string, endDate: string, userId: string) {
    return fetchFitbitData(fitbit_user_id, access_token, ENDPOINT_CONFIGS.temperature.path, startDate, endDate, userId);
}
async function fetchBreathingData(fitbit_user_id: string, access_token: string, startDate: string, endDate: string, userId: string) {
    return fetchFitbitData(fitbit_user_id, access_token, ENDPOINT_CONFIGS.breathing.path, startDate, endDate, userId);
}

const endpointFetchers: Record<string, (fitbit_user_id: string, access_token: string, startDate: string, endDate: string, userId: string) => Promise<any>> = {
    heart: fetchHeartData,
    sleep: fetchSleepData,
    steps: fetchStepsData,
    hrv: fetchHRVData,
    azm: fetchAZMData,
    spo2: fetchSpO2Data,
    temperature: fetchTemperatureData,
    breathing: fetchBreathingData
};


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
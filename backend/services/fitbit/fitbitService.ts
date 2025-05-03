import axios from 'axios';
import db from '../../config/database';
import { addDays, format, parseISO } from 'date-fns';

// --- Interfaces ---
export interface FitbitToken {
    access_token: string;
    refresh_token: string;
    expires_at: string;
    scope: string;
}

export interface EndpointConfig {
    path: string;
    maxDays: number;
    required: boolean;
}

export interface SyncProgress {
    endpoint: string;
    lastSyncedDate: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    error?: string;
}

export interface RateLimitInfo {
    limit: number;
    remaining: number;
    resetTime: Date;
}

export interface UserRateLimit {
    userId: string;
    rateLimitInfo: RateLimitInfo;
    lastUpdated: Date;
}

export interface DailySummary {
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

// --- Endpoint Configs ---
export const ENDPOINT_CONFIGS: Record<string, EndpointConfig> = {
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

// --- Rate Limit Tracking ---
const userRateLimits = new Map<string, UserRateLimit>();

// --- Upsert Helper ---
export function upsertDailySummary(summary: DailySummary) {
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

// --- Data Processing ---
export async function processEndpointData(
    userId: string,
    endpointKey: string,
    data: any,
    startDate: string,
    endDate: string
) {
    switch (endpointKey) {
        case 'heart':
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
            if (data.sleep) {
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

// --- Token Management ---
export async function refreshAccessToken(userId: string): Promise<FitbitToken> {
    const token = db.prepare(`
        SELECT refresh_token FROM fitbit_connections 
        WHERE user_id = ?
    `).get(userId) as { refresh_token: string };
    if (!token) {
        throw new Error('No valid refresh token found');
    }
    try {
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

export async function getValidAccessToken(userId: string): Promise<{ access_token: string; fitbit_user_id: string }> {
    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
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
    const expiresAt = parseISO(connection.expires_at);
    const now = new Date();
    const minutesUntilExpiration = (expiresAt.getTime() - now.getTime()) / (60 * 1000);
    const needsRefresh = minutesUntilExpiration < 5;
    if (needsRefresh) {
        const newToken = await refreshAccessToken(userId);
        return { access_token: newToken.access_token, fitbit_user_id: connection.fitbit_user_id };
    }
    return { access_token: connection.access_token, fitbit_user_id: connection.fitbit_user_id };
}

// --- Rate Limiting and Fetching ---
export async function fetchWithRateLimit(url: string, headers: any, userId: string, retryCount = 0): Promise<any> {
    const now = new Date();
    const userLimit = userRateLimits.get(userId);
    if (userLimit && userLimit.rateLimitInfo.remaining <= 0) {
        const waitTime = userLimit.rateLimitInfo.resetTime.getTime() - now.getTime();
        if (waitTime > 0) {
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
    }
    try {
        const response = await axios.get(url, { headers });
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
            const resetSeconds = parseInt(error.response.headers['fitbit-rate-limit-reset'] || '3600');
            const resetTime = new Date(now.getTime() + resetSeconds * 1000);
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
                await new Promise(resolve => setTimeout(resolve, resetSeconds * 1000));
                return fetchWithRateLimit(url, headers, userId, retryCount + 1);
            }
        }
        throw error;
    }
}

export async function processBatchWithRateLimit(
    userId: string, 
    requests: Array<{ url: string, headers: any }>, 
    batchSize = 10
): Promise<any[]> {
    const results = [];
    for (let i = 0; i < requests.length; i += batchSize) {
        const batch = requests.slice(i, i + batchSize);
        const batchResults = await Promise.all(
            batch.map(req => fetchWithRateLimit(req.url, req.headers, userId)
                .catch(error => ({ error })))
        );
        results.push(...batchResults);
        const userLimit = userRateLimits.get(userId);
        if (userLimit && userLimit.rateLimitInfo.remaining < batchSize) {
            const waitTime = Math.max(
                1000,
                (userLimit.rateLimitInfo.resetTime.getTime() - Date.now()) / 2
            );
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
    }
    return results;
}

// --- Fitbit API Fetchers ---
export async function fetchFitbitData(
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

export async function fetchHeartData(fitbit_user_id: string, access_token: string, startDate: string, endDate: string, userId: string) {
    return fetchFitbitData(fitbit_user_id, access_token, ENDPOINT_CONFIGS.heart.path, startDate, endDate, userId);
}
export async function fetchSleepData(fitbit_user_id: string, access_token: string, startDate: string, endDate: string, userId: string) {
    return fetchFitbitData(fitbit_user_id, access_token, ENDPOINT_CONFIGS.sleep.path, startDate, endDate, userId);
}
export async function fetchStepsData(fitbit_user_id: string, access_token: string, startDate: string, endDate: string, userId: string) {
    return fetchFitbitData(fitbit_user_id, access_token, ENDPOINT_CONFIGS.steps.path, startDate, endDate, userId);
}
export async function fetchHRVData(fitbit_user_id: string, access_token: string, startDate: string, endDate: string, userId: string) {
    return fetchFitbitData(fitbit_user_id, access_token, ENDPOINT_CONFIGS.hrv.path, startDate, endDate, userId);
}
export async function fetchAZMData(fitbit_user_id: string, access_token: string, startDate: string, endDate: string, userId: string) {
    return fetchFitbitData(fitbit_user_id, access_token, ENDPOINT_CONFIGS.azm.path, startDate, endDate, userId);
}
export async function fetchSpO2Data(fitbit_user_id: string, access_token: string, startDate: string, endDate: string, userId: string) {
    return fetchFitbitData(fitbit_user_id, access_token, ENDPOINT_CONFIGS.spo2.path, startDate, endDate, userId);
}
export async function fetchTemperatureData(fitbit_user_id: string, access_token: string, startDate: string, endDate: string, userId: string) {
    return fetchFitbitData(fitbit_user_id, access_token, ENDPOINT_CONFIGS.temperature.path, startDate, endDate, userId);
}
export async function fetchBreathingData(fitbit_user_id: string, access_token: string, startDate: string, endDate: string, userId: string) {
    return fetchFitbitData(fitbit_user_id, access_token, ENDPOINT_CONFIGS.breathing.path, startDate, endDate, userId);
}

export const endpointFetchers: Record<string, (fitbit_user_id: string, access_token: string, startDate: string, endDate: string, userId: string) => Promise<any>> = {
    heart: fetchHeartData,
    sleep: fetchSleepData,
    steps: fetchStepsData,
    hrv: fetchHRVData,
    azm: fetchAZMData,
    spo2: fetchSpO2Data,
    temperature: fetchTemperatureData,
    breathing: fetchBreathingData
}; 
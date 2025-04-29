import express, { Request, Response } from 'express';
import axios from 'axios';
import db from '../config/database';

interface WeatherSettings {
    zip_code: string | null;
    api_key: string | null;
}

const router = express.Router();

// Get Weather connection status and settings
router.get('/status', async (req: Request, res: Response) => {
    try {
        const { userId } = req.query;
        if (!userId) {
            return res.status(400).json({ error: 'userId is required' });
        }

        // Get user's weather settings from database
        const userSettings = db.prepare('SELECT zip_code, api_key FROM weather_settings WHERE user_id = ?').get(userId) as WeatherSettings | undefined;
        
        if (!userSettings?.zip_code || !userSettings?.api_key) {
            return res.json({
                connected: false,
                zipCode: null,
                apiKey: null
            });
        }

        // Test the API key with a simple current weather request
        try {
            await axios.get(`https://api.openweathermap.org/data/2.5/weather`, {
                params: {
                    zip: userSettings.zip_code,
                    appid: userSettings.api_key,
                    units: 'metric'
                }
            });

            return res.json({
                connected: true,
                zipCode: userSettings.zip_code,
                apiKey: userSettings.api_key
            });
        } catch (error) {
            // API key might be invalid
            return res.json({
                connected: false,
                zipCode: null,
                apiKey: null
            });
        }
    } catch (error) {
        console.error('Weather status error:', error);
        res.status(500).json({ error: 'Failed to check weather settings' });
    }
});

// Get current weather data
router.get('/current', async (req: Request, res: Response) => {
    try {
        const zipCode = process.env.WEATHER_ZIP_CODE;
        const apiKey = process.env.WEATHER_API_KEY;

        const [weatherResponse, airPollutionResponse] = await Promise.all([
            axios.get(`https://api.openweathermap.org/data/2.5/weather?zip=${zipCode}&appid=${apiKey}&units=metric`),
            axios.get(`https://api.openweathermap.org/data/2.5/air_pollution?zip=${zipCode}&appid=${apiKey}`)
        ]);

        const weatherData = weatherResponse.data;
        const airPollutionData = airPollutionResponse.data;

        // Store current weather data
        const stmt = db.prepare(`
            INSERT OR REPLACE INTO weather_reading (
                user_id, timestamp, temp, humidity, pressure, wind_speed, uv_index, aqi
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        stmt.run(
            'default_user',
            new Date().toISOString(),
            weatherData.main.temp,
            weatherData.main.humidity,
            weatherData.main.pressure,
            weatherData.wind.speed,
            weatherData.uvi || 0,
            airPollutionData.list[0].main.aqi
        );

        res.json({
            temperature: weatherData.main.temp,
            humidity: weatherData.main.humidity,
            pressure: weatherData.main.pressure,
            windSpeed: weatherData.wind.speed,
            uvIndex: weatherData.uvi || 0,
            aqi: airPollutionData.list[0].main.aqi
        });
    } catch (error) {
        console.error('Weather fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch weather data' });
    }
});

// Get historical weather data
router.get('/history', async (req: Request, res: Response) => {
    const { startDate, endDate } = req.query;
    try {
        const zipCode = process.env.WEATHER_ZIP_CODE;
        const apiKey = process.env.WEATHER_API_KEY;

        // Note: OpenWeatherMap's historical data requires a paid plan
        // This is a placeholder for the actual implementation
        const response = await axios.get(
            `https://api.openweathermap.org/data/2.5/onecall/timemachine?zip=${zipCode}&appid=${apiKey}&units=metric`,
            {
                params: {
                    start: startDate,
                    end: endDate
                }
            }
        );

        res.json(response.data);
    } catch (error) {
        console.error('Weather history error:', error);
        res.status(500).json({ error: 'Failed to fetch historical weather data' });
    }
});

// Save Weather settings
router.post('/settings', async (req: Request, res: Response) => {
    try {
        const { userId, zipCode, apiKey } = req.body;
        if (!userId || !zipCode || !apiKey) {
            return res.status(400).json({ error: 'userId, zipCode, and apiKey are required' });
        }

        // Test the API key first
        try {
            await axios.get(`https://api.openweathermap.org/data/2.5/weather`, {
                params: {
                    zip: zipCode,
                    appid: apiKey,
                    units: 'metric'
                }
            });
        } catch (error) {
            return res.status(400).json({ error: 'Invalid OpenWeatherMap API key or ZIP code' });
        }

        // Save or update settings
        db.prepare(`
            INSERT OR REPLACE INTO weather_settings (user_id, zip_code, api_key, updated_at)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        `).run(userId, zipCode, apiKey);

        res.json({ success: true });
    } catch (error) {
        console.error('Failed to save weather settings:', error);
        res.status(500).json({ error: 'Failed to save weather settings' });
    }
});

export const weatherRouter = router; 
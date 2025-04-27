import express, { Request, Response } from 'express';
import axios from 'axios';
import db from '../config/database';

const router = express.Router();

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

export const weatherRouter = router; 
import express from 'express';
import { fetchHistoricalData, fetchCurrentData } from '../services/weather/openMeteo';
import { fetchAirQuality, validateApiKey } from '../services/weather/openWeatherMap';
import { getCoordinatesFromZip } from '../services/weather/geocoding';
import db from '../config/database';
import { userIdMiddleware } from '../middleware/auth';

const router = express.Router();

// Apply userIdMiddleware to all routes
router.use(userIdMiddleware);

interface WeatherSettings {
  zip_code: string;
  openweathermap_api_key: string;
}

interface SyncStatus {
  provider: string;
  last_sync: string;
  error: string | null;
}

// Get weather settings status
router.get('/status', async (req, res) => {
  try {
    const userId = (req as any).userId;
    const settings = db.prepare(`
      SELECT zip_code, openweathermap_api_key
      FROM weather_settings
      WHERE user_id = ?
    `).get(userId) as WeatherSettings | undefined;
    if (!settings) {
      return res.json({
        connected: false,
        message: 'Weather settings not found'
      });
    }
    const syncStatus = db.prepare(`
      SELECT provider, last_sync, error
      FROM weather_sync_status
      WHERE user_id = ?
    `).all(userId) as SyncStatus[];
    return res.json({
      connected: true,
      zipCode: settings.zip_code,
      apiKey: settings.openweathermap_api_key,
      syncStatus: syncStatus.reduce<Record<string, { lastSync: string; error: string | null }>>((acc, status) => {
        acc[status.provider] = {
          lastSync: status.last_sync,
          error: status.error
        };
        return acc;
      }, {})
    });
  } catch (error) {
    console.error('Error getting weather status:', error);
    res.status(500).json({ error: 'Failed to get weather status' });
  }
});

// Save weather settings
router.post('/settings', async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { zipCode, apiKey } = req.body;
    if (!zipCode || !apiKey) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    // Validate OpenWeatherMap API key
    const isValidKey = await validateApiKey(apiKey);
    if (!isValidKey) {
      return res.status(400).json({ error: 'Invalid OpenWeatherMap API key' });
    }
    // Save settings
    db.prepare(`
      INSERT OR REPLACE INTO weather_settings (
        user_id, zip_code, openweathermap_api_key, updated_at
      ) VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `).run(userId, zipCode, apiKey);
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving weather settings:', error);
    res.status(500).json({ error: 'Failed to save weather settings' });
  }
});

// Sync weather data
router.post('/sync', async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { startDate, endDate } = req.body;
    const settings = db.prepare(`
      SELECT zip_code, openweathermap_api_key
      FROM weather_settings
      WHERE user_id = ?
    `).get(userId) as WeatherSettings | undefined;
    if (!settings) {
      return res.status(400).json({ error: 'Weather settings not found' });
    }
    // Get coordinates from ZIP code
    const coords = await getCoordinatesFromZip(settings.zip_code, settings.openweathermap_api_key);
    // Fetch data from both providers
    const [weatherData, aqiData] = await Promise.all([
      fetchHistoricalData(coords.latitude, coords.longitude, startDate, endDate),
      fetchAirQuality(coords.latitude, coords.longitude, settings.openweathermap_api_key)
    ]);
    // Save the combined data
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO weather_reading (
        user_id, date, temp_high, temp_low, temp_avg,
        humidity_avg, pressure_avg, wind_speed_avg,
        aqi_avg, source
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    weatherData.forEach(data => {
      stmt.run(
        userId,
        data.date,
        data.temp_high,
        data.temp_low,
        data.temp_avg,
        data.humidity_avg,
        data.pressure_avg,
        data.wind_speed_avg,
        data.date === aqiData.date ? aqiData.aqi_avg : null,
        'combined'
      );
    });
    // Update sync status
    const updateStatus = db.prepare(`
      INSERT OR REPLACE INTO weather_sync_status (
        user_id, provider, last_sync, updated_at
      ) VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);
    updateStatus.run(userId, 'openmeteo');
    updateStatus.run(userId, 'openweathermap');
    res.json({ success: true });
  } catch (error) {
    console.error('Error syncing weather data:', error);
    res.status(500).json({ error: 'Failed to sync weather data' });
  }
});

export const weatherRouter = router; 
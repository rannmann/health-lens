import axios from 'axios';

interface AirQualityData {
  date: string;
  aqi_avg: number;
}

export async function fetchAirQuality(
  latitude: number,
  longitude: number,
  apiKey: string
): Promise<AirQualityData> {
  try {
    const response = await axios.get(
      'http://api.openweathermap.org/data/2.5/air_pollution',
      {
        params: {
          lat: latitude,
          lon: longitude,
          appid: apiKey
        }
      }
    );

    const date = new Date().toISOString().split('T')[0];
    return {
      date,
      aqi_avg: response.data.list[0].main.aqi
    };
  } catch (error) {
    console.error('Error fetching AQI data from OpenWeatherMap:', error);
    throw error;
  }
}

export async function validateApiKey(apiKey: string): Promise<boolean> {
  try {
    await axios.get(
      'http://api.openweathermap.org/data/2.5/air_pollution',
      {
        params: {
          lat: 0,
          lon: 0,
          appid: apiKey
        }
      }
    );
    return true;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      return false;
    }
    throw error;
  }
} 
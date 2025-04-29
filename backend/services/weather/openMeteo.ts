import axios from 'axios';

interface OpenMeteoResponse {
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    temperature_2m_mean: number[];
    relative_humidity_2m_mean: number[];
    surface_pressure_mean: number[];
    wind_speed_10m_mean: number[];
  };
}

interface WeatherData {
  date: string;
  temp_high: number;
  temp_low: number;
  temp_avg: number;
  humidity_avg: number;
  pressure_avg: number;
  wind_speed_avg: number;
}

export async function fetchHistoricalData(
  latitude: number,
  longitude: number,
  startDate: string,
  endDate: string
): Promise<WeatherData[]> {
  try {
    const response = await axios.get<OpenMeteoResponse>(
      'https://archive-api.open-meteo.com/v1/archive',
      {
        params: {
          latitude,
          longitude,
          start_date: startDate,
          end_date: endDate,
          daily: [
            'temperature_2m_max',
            'temperature_2m_min',
            'temperature_2m_mean',
            'relative_humidity_2m_mean',
            'surface_pressure_mean',
            'wind_speed_10m_mean'
          ],
          timezone: 'auto'
        }
      }
    );

    const { daily } = response.data;
    
    return daily.time.map((date, index) => ({
      date,
      temp_high: daily.temperature_2m_max[index],
      temp_low: daily.temperature_2m_min[index],
      temp_avg: daily.temperature_2m_mean[index],
      humidity_avg: daily.relative_humidity_2m_mean[index],
      pressure_avg: daily.surface_pressure_mean[index],
      wind_speed_avg: daily.wind_speed_10m_mean[index]
    }));
  } catch (error) {
    console.error('Error fetching data from Open-Meteo:', error);
    throw error;
  }
}

export async function fetchCurrentData(
  latitude: number,
  longitude: number
): Promise<WeatherData> {
  const today = new Date().toISOString().split('T')[0];
  const data = await fetchHistoricalData(latitude, longitude, today, today);
  return data[0];
} 
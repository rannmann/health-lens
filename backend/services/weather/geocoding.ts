import axios from 'axios';

interface Coordinates {
  latitude: number;
  longitude: number;
}

export async function getCoordinatesFromZip(
  zipCode: string,
  apiKey: string,
  countryCode = 'US'
): Promise<Coordinates> {
  try {
    const response = await axios.get(
      'http://api.openweathermap.org/geo/1.0/zip',
      {
        params: {
          zip: `${zipCode},${countryCode}`,
          appid: apiKey
        }
      }
    );

    return {
      latitude: response.data.lat,
      longitude: response.data.lon
    };
  } catch (error) {
    console.error('Error getting coordinates from ZIP code:', error);
    throw error;
  }
} 
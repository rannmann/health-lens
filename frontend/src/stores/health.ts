import { defineStore } from 'pinia';
import axios from 'axios';

interface DailySummary {
    date: string;
    resting_hr: number;
    steps: number;
    hrv_rmssd: number;
    spo2_avg: number;
    breathing_rate: number;
    skin_temp_delta: number;
    total_sleep: number;
    deep_sleep: number;
    light_sleep: number;
    rem_sleep: number;
    wake_minutes: number;
    azm_total: number;
    azm_fatburn: number;
    azm_cardio: number;
    azm_peak: number;
}

interface AwairReading {
    timestamp: string;
    score: number;
    pm25: number;
    voc: number;
    co2: number;
    humidity: number;
    temperature: number;
}

interface WeatherReading {
    timestamp: string;
    temp: number;
    humidity: number;
    pressure: number;
    wind_speed: number;
    uv_index: number;
    aqi: number;
    pollen_index: number;
}

interface MedicationEvent {
    id: number;
    timestamp: string;
    name: string;
    action: string;
    dose: string | null;
    notes: string | null;
}

interface SymptomEvent {
    id: number;
    timestamp: string;
    symptom: string;
    severity: number;
    notes: string | null;
}

export const useHealthStore = defineStore('health', {
    state: () => ({
        dailySummaries: [] as DailySummary[],
        awairReadings: [] as AwairReading[],
        weatherReadings: [] as WeatherReading[],
        medicationEvents: [] as MedicationEvent[],
        symptomEvents: [] as SymptomEvent[],
        loading: false,
        error: null as string | null
    }),

    actions: {
        async fetchDailySummaries(startDate: string, endDate: string) {
            this.loading = true;
            try {
                const response = await axios.get(`/api/fitbit/sync/default_user?startDate=${startDate}&endDate=${endDate}`);
                this.dailySummaries = response.data;
            } catch (error) {
                this.error = 'Failed to fetch daily summaries';
                console.error(error);
            } finally {
                this.loading = false;
            }
        },

        async fetchAwairReadings(deviceId: string, startDate: string, endDate: string) {
            this.loading = true;
            try {
                const response = await axios.get(`/api/awair/sync/${deviceId}?startDate=${startDate}&endDate=${endDate}`);
                this.awairReadings = response.data;
            } catch (error) {
                this.error = 'Failed to fetch Awair readings';
                console.error(error);
            } finally {
                this.loading = false;
            }
        },

        async fetchWeatherReadings(startDate: string, endDate: string) {
            this.loading = true;
            try {
                const response = await axios.get(`/api/weather/history?startDate=${startDate}&endDate=${endDate}`);
                this.weatherReadings = response.data;
            } catch (error) {
                this.error = 'Failed to fetch weather readings';
                console.error(error);
            } finally {
                this.loading = false;
            }
        },

        async fetchMedicationEvents(startDate: string, endDate: string) {
            this.loading = true;
            try {
                const response = await axios.get(`/api/medication?startDate=${startDate}&endDate=${endDate}`);
                this.medicationEvents = response.data;
            } catch (error) {
                this.error = 'Failed to fetch medication events';
                console.error(error);
            } finally {
                this.loading = false;
            }
        },

        async fetchSymptomEvents(startDate: string, endDate: string) {
            this.loading = true;
            try {
                const response = await axios.get(`/api/symptom?startDate=${startDate}&endDate=${endDate}`);
                this.symptomEvents = response.data;
            } catch (error) {
                this.error = 'Failed to fetch symptom events';
                console.error(error);
            } finally {
                this.loading = false;
            }
        },

        async addMedicationEvent(event: Omit<MedicationEvent, 'id'>) {
            try {
                const response = await axios.post('/api/medication', event);
                this.medicationEvents.push(response.data);
            } catch (error) {
                this.error = 'Failed to add medication event';
                console.error(error);
            }
        },

        async addSymptomEvent(event: Omit<SymptomEvent, 'id'>) {
            try {
                const response = await axios.post('/api/symptom', event);
                this.symptomEvents.push(response.data);
            } catch (error) {
                this.error = 'Failed to add symptom event';
                console.error(error);
            }
        }
    }
}); 
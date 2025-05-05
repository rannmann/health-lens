import { defineStore } from 'pinia';
import api from '../api/axios';
import type { DailySummary, AwairReading, WeatherReading, MedicationEvent, SymptomEvent } from '../types';

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
                const response = await api.get('/fitbit/sync', {
                    params: { startDate, endDate }
                });
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
                const response = await api.get(`/awair/sync/${deviceId}`, {
                    params: { startDate, endDate }
                });
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
                const response = await api.get('/weather/history', {
                    params: { startDate, endDate }
                });
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
                const response = await api.get('/medications', {
                    params: { startDate, endDate }
                });
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
                const response = await api.get('/symptom', {
                    params: { startDate, endDate }
                });
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
                const response = await api.post('/medications', event);
                this.medicationEvents.push(response.data);
            } catch (error) {
                this.error = 'Failed to add medication event';
                console.error(error);
            }
        },

        async addSymptomEvent(event: Omit<SymptomEvent, 'id'>) {
            try {
                const response = await api.post('/symptom', event);
                this.symptomEvents.push(response.data);
            } catch (error) {
                this.error = 'Failed to add symptom event';
                console.error(error);
            }
        }
    }
}); 
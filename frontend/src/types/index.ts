export interface DailySummary {
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

export interface AwairReading {
    timestamp: string;
    score: number;
    pm25: number;
    voc: number;
    co2: number;
    humidity: number;
    temperature: number;
}

export interface WeatherReading {
    timestamp: string;
    temp: number;
    humidity: number;
    pressure: number;
    wind_speed: number;
    uv_index: number;
    aqi: number;
    pollen_index: number;
}

export interface MedicationEvent {
    id: string;
    timestamp: string;
    name: string;
    action: 'start' | 'stop' | 'dose_change';
    dose: string;
    notes: string;
}

export interface SymptomEvent {
    id: string;
    timestamp: string;
    symptom: string;
    severity: number;
    notes: string;
} 
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = process.env.DB_PATH || path.join(__dirname, '../data/health-lens.db');

// Create database directory if it doesn't exist
const dbDir = path.dirname(dbPath);
if (!require('fs').existsSync(dbDir)) {
    require('fs').mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

// Enable foreign keys and WAL mode for better performance
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

// Create tables
db.exec(`
    -- User management
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,  -- Our local user ID
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login TEXT
    );

    -- Fitbit connections (one user can have one Fitbit connection)
    CREATE TABLE IF NOT EXISTS fitbit_connections (
        user_id TEXT PRIMARY KEY,  -- References our local user ID
        fitbit_user_id TEXT NOT NULL,  -- The Fitbit-provided user ID
        access_token TEXT NOT NULL,
        refresh_token TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        scope TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Awair settings
    CREATE TABLE IF NOT EXISTS awair_settings (
        user_id TEXT PRIMARY KEY,
        token TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Weather settings
    CREATE TABLE IF NOT EXISTS weather_settings (
        user_id TEXT PRIMARY KEY,
        openweathermap_api_key TEXT,
        zip_code TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Weather provider sync status
    CREATE TABLE IF NOT EXISTS weather_sync_status (
        user_id TEXT,
        provider TEXT,  -- 'openmeteo', 'openweathermap'
        last_sync TEXT,
        error TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, provider),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Weather readings (from any provider)
    CREATE TABLE IF NOT EXISTS weather_reading (
        user_id TEXT,
        date TEXT,
        temp_high REAL,
        temp_low REAL,
        temp_avg REAL,
        humidity_avg REAL,
        pressure_avg REAL,
        wind_speed_avg REAL,
        aqi_avg INTEGER,
        pollen_index INTEGER,
        source TEXT,  -- 'openmeteo', 'openweathermap', etc.
        PRIMARY KEY(user_id, date),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Fitbit sync progress tracking
    CREATE TABLE IF NOT EXISTS fitbit_sync_progress (
        user_id TEXT,
        endpoint TEXT,
        last_synced_date TEXT,
        status TEXT,
        error TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, endpoint),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Daily health metrics (now references our local user ID)
    CREATE TABLE IF NOT EXISTS daily_summary (
        user_id TEXT NOT NULL,
        date TEXT NOT NULL,
        resting_hr INTEGER,
        steps INTEGER,
        hrv_rmssd REAL,
        spo2_avg REAL,
        breathing_rate REAL,
        skin_temp_delta REAL,
        total_sleep INTEGER,
        deep_sleep INTEGER,
        light_sleep INTEGER,
        rem_sleep INTEGER,
        wake_minutes INTEGER,
        azm_total INTEGER,
        azm_fatburn INTEGER,
        azm_cardio INTEGER,
        azm_peak INTEGER,
        PRIMARY KEY(user_id, date),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Awair readings
    CREATE TABLE IF NOT EXISTS awair_reading (
        user_id TEXT,
        device_id TEXT,
        timestamp TEXT,
        score REAL,
        pm25 REAL,
        voc REAL,
        co2 REAL,
        humidity REAL,
        temperature REAL,
        PRIMARY KEY(user_id, device_id, timestamp),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Medication events
    CREATE TABLE IF NOT EXISTS medication_event (
        user_id TEXT,
        timestamp TEXT,
        name TEXT,
        action TEXT,
        dose TEXT,
        notes TEXT,
        PRIMARY KEY(user_id, timestamp, name),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Symptom events
    CREATE TABLE IF NOT EXISTS symptom_event (
        user_id TEXT,
        timestamp TEXT,
        symptom TEXT,
        severity INTEGER,
        notes TEXT,
        PRIMARY KEY(user_id, timestamp, symptom),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- General notes
    CREATE TABLE IF NOT EXISTS general_note (
        user_id TEXT,
        timestamp TEXT,
        title TEXT,
        content TEXT,
        PRIMARY KEY(user_id, timestamp),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Create indexes for better query performance
    CREATE INDEX IF NOT EXISTS idx_daily_summary_user_date ON daily_summary(user_id, date);
    CREATE INDEX IF NOT EXISTS idx_awair_reading_user_timestamp ON awair_reading(user_id, timestamp);
    CREATE INDEX IF NOT EXISTS idx_weather_reading_user_timestamp ON weather_reading(user_id, date);
    CREATE INDEX IF NOT EXISTS idx_medication_event_user_timestamp ON medication_event(user_id, timestamp);
    CREATE INDEX IF NOT EXISTS idx_symptom_event_user_timestamp ON symptom_event(user_id, timestamp);
`);

export default db; 
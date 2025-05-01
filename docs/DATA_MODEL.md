# HealthLens Data Model

## Overview

The HealthLens data model is designed to efficiently store and relate:
- Automated health metrics
- Environmental data
- Medication changes
- Symptoms and observations
- User notes and events

## Core Tables

### Users
```sql
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login TEXT
);
```

### Daily Summary
Stores aggregated daily health metrics from Fitbit:
```sql
CREATE TABLE daily_summary (
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
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### Medication Events
```sql
CREATE TABLE medication_event (
    user_id TEXT,
    timestamp TEXT,
    name TEXT,
    action TEXT,  -- 'start', 'stop', 'change'
    dose TEXT,
    frequency TEXT,
    notes TEXT,
    PRIMARY KEY(user_id, timestamp, name),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### Symptoms
```sql
CREATE TABLE symptom_config (
    user_id TEXT,
    symptom_id TEXT,
    name TEXT,
    category TEXT,
    is_active BOOLEAN,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(user_id, symptom_id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE symptom_event (
    user_id TEXT,
    symptom_id TEXT,
    timestamp TEXT,
    severity INTEGER,
    notes TEXT,
    PRIMARY KEY(user_id, timestamp, symptom_id),
    FOREIGN KEY (user_id, symptom_id) REFERENCES symptom_config(user_id, symptom_id)
);
```

### Environmental Data
```sql
CREATE TABLE weather_reading (
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
    source TEXT,
    PRIMARY KEY(user_id, date),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE awair_reading (
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
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### Notes & Events
```sql
CREATE TABLE general_note (
    user_id TEXT,
    timestamp TEXT,
    title TEXT,
    content TEXT,
    type TEXT,  -- 'general', 'life_event', 'medical'
    PRIMARY KEY(user_id, timestamp),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### View Configurations
```sql
CREATE TABLE saved_view (
    user_id TEXT,
    view_id TEXT,
    name TEXT,
    config JSON,  -- Stores visualization settings
    is_default BOOLEAN,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(user_id, view_id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

## Relationships

```
User
 ├── DailySummary (1:many)
 ├── MedicationEvent (1:many)
 ├── SymptomConfig (1:many)
 │    └── SymptomEvent (1:many)
 ├── WeatherReading (1:many)
 ├── AwairReading (1:many)
 ├── GeneralNote (1:many)
 └── SavedView (1:many)
```

## Indexes

```sql
CREATE INDEX idx_daily_summary_user_date ON daily_summary(user_id, date);
CREATE INDEX idx_medication_event_user_name ON medication_event(user_id, name);
CREATE INDEX idx_symptom_event_user_symptom ON symptom_event(user_id, symptom_id);
CREATE INDEX idx_weather_reading_user_date ON weather_reading(user_id, date);
CREATE INDEX idx_awair_reading_user_timestamp ON awair_reading(user_id, timestamp);
CREATE INDEX idx_general_note_user_timestamp ON general_note(user_id, timestamp);
```

## Data Integrity

### Foreign Keys
- All tables reference the users table
- Symptom events reference symptom configuration
- ON DELETE CASCADE for all foreign keys

### Constraints
- Required fields are NOT NULL
- Appropriate data types for each field
- Composite primary keys where needed

## Notes

- Timestamps stored in ISO 8601 format
- JSON fields used for flexible configuration storage
- Indexes optimized for time-series queries
- Schema supports future extensions 
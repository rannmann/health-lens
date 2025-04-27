# HealthLens
A view into your health data across multiple domains, all hosted locally.

# 1. Project Goals

1. **Consolidate multi‐source health data** into a uniform, date‑indexed store for both human visualization and machine analysis:
   - **Fitbit**: HRV, resting HR, sleep (total, deep, light, REM, wake), SpO₂, breathing rate, skin‑temp variation, Active Zone Minutes (total, fat‑burn, cardio, peak), **steps**.
   - **Awair**: 15‑minute averages of air quality score, PM₂.₅/PM₁₀, CO₂, VOCs, humidity, temperature; support multiple devices.
   - **Local weather**: daily/hourly AQI (if available), pollen/allergen index, temp, humidity, pressure, wind, UV index.
2. **Track user annotations**:
   - **Medications & supplements**: timestamped start/stop/changes; annotate on graphs.
   - **Symptoms**: timestamped entries with severity tags; correlate with other metrics.
3. **Flexible data model**: anticipate new metrics over time; expose raw data plus summary tables.
4. **Local‑first, extendable**: Node.js + Vue.js app, single local SQLite file, single (future) JSON/CSV export and REST API for scripts.

---

# 2. Technology Stack

- **Backend**: Node.js + Express
- **DB**: SQLite via `knex` or `better‑sqlite3`
- **Auth**: Fitbit OAuth2 (code flow) with token storage in SQLite
- **Task Scheduling**: `node‑cron` for daily sync / backfill jobs
- **Frontend**: Vue 3 + Vite, Pinia for state
- **Charts**: ApexCharts (`vue‑apexcharts`) for interactive time‑series and annotations
- **HTTP Client**: `axios` or `node‑fetch`

---

# 3. High‑Level Architecture

```
┌─────────────────┐     HTTPS     ┌──────────────┐     SQL      ┌───────────┐
│ Vue Frontend    │  ↔  /api/*   │ Express API  │  ↔  queries  │ SQLite DB │
│ (localhost:8080)│              │ (localhost:3000)            │ file      │
└─────────────────┘              └──────────────┘             └───────────┘
        ▲                                                         ▲
        │                                                         │
        └─── Webhooks / Cron jobs for scheduled data pulls ────────┘
```

- **/api/** routes for Fitbit, Awair, weather, meds, symptoms, exports.
- **Scheduler** runs backfill (range pulls) and daily incremental sync.

---

# 4. Data Integrations

## 4.1 Fitbit

- **Auth flow**: OAuth2 code grant → store access/refresh tokens.
- **Endpoints (range calls)**:
  - `/1/user/-/activities/heart/date/<start>/<end>.json` → RHR + resting metrics + steps
  - `/1/user/-/hrv/date/<start>/<end>.json` → HRV time series
  - `/1/user/-/sleep/date/<start>/<end>.json` → sleep stage durations
  - `/1/user/-/sleep/breathing-rate/date/<start>/<end>.json` → avg breaths/min
  - `/1/user/-/sleep/spo2/date/<start>/<end>.json` → sleep SpO₂
  - `/1/user/-/temperature/skin/date/<start>/<end>.json` → skin temp variation
  - `/1/user/-/activities/active-zone-minutes/date/<start>/<end>.json` → AZM zones
- **Rate limits**: ~150 calls/hr; do 1 call per range endpoint for backfill, 1-day pulls for sync.

## 4.2 Awair

- **API**: developer.getawair.com
- **Auth**: personal access token in `.env`
- **Devices**: store device IDs per user
- **Endpoint** (15‑min averages): `GET /v1/users/self/devices/<device_id>/air-data?from=<ts>&to=<ts>&avg=15min`
- **Aggregate** when >1 device: average each metric by timestamp.

## 4.3 Local Weather

- **Service**: OpenWeatherMap (or similar) with ZIP code
- **Endpoints**:
  - Current & hourly/daily: `/data/2.5/onecall?zip={zip}&appid={API_KEY}`
- **Metrics**: temp, humidity, pressure, wind_speed, UV index, AQI (via separate `/air_pollution`), pollen lookup (via Allergy API if available).


---

# 5. Data Model & Schema (Sketch)

```sql
-- Core table: one row per date per user
CREATE TABLE daily_summary (
  user_id        TEXT NOT NULL,
  date           TEXT NOT NULL,
  resting_hr     INTEGER,
  steps          INTEGER,
  hrv_rmssd      REAL,
  spo2_avg       REAL,
  breathing_rate REAL,
  skin_temp_delta REAL,
  total_sleep    INTEGER,
  deep_sleep     INTEGER,
  light_sleep    INTEGER,
  rem_sleep      INTEGER,
  wake_minutes   INTEGER,
  azm_total      INTEGER,
  azm_fatburn    INTEGER,
  azm_cardio     INTEGER,
  azm_peak       INTEGER,
  PRIMARY KEY(user_id, date)
);

-- Awair 15‑min readings
CREATE TABLE awair_reading (
  user_id    TEXT,
  device_id  TEXT,
  timestamp  TEXT,
  score      REAL,
  pm25       REAL,
  voc        REAL,
  co2        REAL,
  humidity   REAL,
  temperature REAL,
  PRIMARY KEY(user_id, device_id, timestamp)
);

-- Weather hourly/daily
CREATE TABLE weather_reading (
  user_id   TEXT,
  timestamp TEXT,
  temp      REAL,
  humidity  REAL,
  pressure  REAL,
  wind_speed REAL,
  uv_index  REAL,
  aqi       INTEGER,
  pollen_index INTEGER,
  PRIMARY KEY(user_id, timestamp)
);

-- Medications & supplements timeline
CREATE TABLE medication_event (
  user_id    TEXT,
  timestamp  TEXT,
  name       TEXT,
  action     TEXT,  -- e.g. 'start', 'stop', 'dose_change'
  dose       TEXT,
  notes      TEXT,
  PRIMARY KEY(user_id, timestamp, name)
);

-- Symptom log
CREATE TABLE symptom_event (
  user_id    TEXT,
  timestamp  TEXT,
  symptom    TEXT,
  severity   INTEGER,
  notes      TEXT,
  PRIMARY KEY(user_id, timestamp, symptom)
);
```

---

## 6. Frontend & User Flows

1. **Onboarding**:
   - Enter Fitbit credentials (via OAuth modal)
   - Enter Awair token + select devices
   - Enter ZIP code for weather
2. **Sync Dashboard**:
   - Manual/auto-run backfill and daily sync status
3. **Data Explorer**:
   - Time‑series charts per metric
   - Overlays + trend‑line toggles
   - Annotation layer: show medication/symptom events on timelines
   - Date‑range picker + metric selector
4. **Exports**:
   - Download JSON/CSV for any date range (all metrics + events)

---

## 7. Local Deployment

- **Env**: `.env.local` holds Fitbit client ID/secret, Awair token, weather API key, redirect URI.
- `npm install && npm run dev`
- Visit `http://localhost:8080` → onboard → backfill kicks off.


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
- **DB**: SQLite via `better-sqlite3` with WAL mode enabled
- **Auth**: Fitbit OAuth2 (code flow) with token storage in SQLite
- **Task Scheduling**: `node-cron` for daily sync / backfill jobs
- **Frontend**: Vue 3 + Vite, Pinia for state
- **Charts**: ApexCharts (`vue-apexcharts`) for interactive time-series and annotations
- **HTTP Client**: `axios` or `node-fetch`

---

# 3. High‑Level Architecture

```
┌─────────────────┐     HTTPS    ┌──────────────┐     SQL      ┌───────────┐
│ Vue Frontend    │  ↔  /api/*   │ Express API  │  ↔  queries  │ SQLite DB │
│ (localhost:8080)│              │ (localhost:3000)            │ file      │
└─────────────────┘              └──────────────┘              └───────────┘
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

# 5. Data Model Overview

The application uses SQLite with WAL mode for better performance and foreign key constraints enabled. Key relationships include:

## Core Tables
- **Users**: Central user management with local user IDs
- **Daily Summary**: Health metrics per user per day (sleep, activity, heart rate, etc.)
- **Weather Reading**: Daily weather metrics including temperature, AQI, and pollen data
- **Awair Reading**: 15-minute air quality measurements from Awair devices
- **Events**: Medication events, symptom tracking, and general notes

## Integration Settings & Sync Status
- **Fitbit Connections**: OAuth tokens and user connection info
- **Awair Settings**: Device tokens and configuration
- **Weather Settings**: API keys and location preferences
- **Sync Status Tables**: Track last sync times and errors for each integration

Each table uses appropriate indexes for query performance and maintains created_at/updated_at timestamps where relevant. All tables reference the central users table with ON DELETE CASCADE foreign keys for data integrity.

For detailed schema information, see the database initialization code.

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


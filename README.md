# HealthLens

A comprehensive health analytics platform for chronic illness management, focused on discovering patterns and correlations in health data.

## Vision & Purpose

HealthLens helps people with complex chronic illnesses identify their triggers and track treatment effectiveness by:
- Automatically collecting health metrics (Fitbit), environmental data (Awair), and weather conditions
- Tracking medication changes and their impacts over time
- Recording and analyzing symptoms and health events
- Providing visualization tools to identify patterns and correlations
- Enabling AI-assisted pattern recognition through data exports

The platform is designed for patients managing multiple medications and complex symptoms, making it easier to:
- Track historical medication changes and their effects
- Identify potential triggers and correlations
- Share relevant history with healthcare providers
- Maintain detailed health records without daily manual tracking

## Project Goals

1. **Consolidate Multi-Source Health Data**
   - **Fitbit**: HRV, resting HR, sleep metrics, SpO₂, breathing rate, skin temp, activity zones, steps
   - **Awair**: Air quality score, PM2.5, CO₂, VOCs, humidity, temperature
   - **Weather**: AQI, pollen index, temperature, humidity, pressure, wind

2. **Minimize Manual Entry**
   - Automated data collection where possible
   - Focus on tracking medication changes rather than daily medication logs
   - Simple symptom severity tracking (1-10 scale)

3. **Enable Pattern Recognition**
   - Interactive time-series visualization
   - Medication change annotations on graphs
   - Customizable metric overlays
   - AI-ready data exports

4. **Local-First, Privacy-Focused**
   - All data stored locally in SQLite
   - No cloud dependencies
   - Open-source and extensible

## Key Features

### Automated Data Collection
- Fitbit metrics (HRV, sleep, SpO₂, activity, etc.)
- Awair air quality data
- Local weather conditions (including AQI, pollen)

### Medication Management
- Track medication changes as timeline events
- Record dosage and frequency adjustments
- Attach notes to specific medications/doses
- Visualize medication changes alongside health metrics

### Symptom Tracking
- User-defined symptom list
- Severity tracking (1-10 scale)
- Customizable symptom categories
- Active/inactive symptom management

### Analysis Tools
- Interactive time-series visualization
- Configurable metric overlays
- Saved view configurations
- Medication timeline view
- AI-ready data exports

### Notes & Events
- General health notes
- Medication-specific observations
- Life event tracking
- Searchable note history

## Technology Stack

- **Backend**: Node.js + Express
- **Database**: SQLite with WAL mode
- **Frontend**: Vue 3 + Vite, Pinia for state
- **Charts**: ApexCharts for interactive time-series
- **APIs**: Fitbit (OAuth2), Awair, OpenWeatherMap

## Getting Started

1. Clone the repository
2. Create `.env.local` with required API keys:
   - Fitbit client ID/secret
   - Awair token
   - OpenWeatherMap API key
3. Run:
   ```bash
   npm install
   npm run dev
   ```
4. Visit `http://localhost:8080` and complete the onboarding

## Documentation

- [ROADMAP.md](ROADMAP.md) - Development roadmap and feature planning
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) - Technical architecture and design
- [docs/DATA_MODEL.md](docs/DATA_MODEL.md) - Database schema and relationships
- [docs/USER_GUIDE.md](docs/USER_GUIDE.md) - User documentation and best practices

## Contributing

HealthLens is an open-source project built to help chronic illness patients better understand their health patterns. While initially developed for personal use, we welcome contributions that align with the project's goals of being:
- Privacy-focused (local-first)
- Easy to use despite complexity
- Focused on pattern recognition
- Automated where possible

## License

[License information here]

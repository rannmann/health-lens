# HealthLens Architecture

## System Overview

HealthLens is built as a local-first application with a Node.js backend and Vue.js frontend. The architecture prioritizes:
- Data privacy through local storage
- Automated data collection
- Efficient querying for pattern recognition
- Extensibility for future integrations

```
┌─────────────────┐     HTTPS    ┌──────────────┐     SQL      ┌───────────┐
│ Vue Frontend    │  ↔  /api/*   │ Express API  │  ↔  queries  │ SQLite DB │
│ (localhost:8080)│              │ (localhost:3000)            │ file      │
└─────────────────┘              └──────────────┘              └───────────┘
        ▲                               ▲
        │                               │
        └─── Background Services ───────┘
            - Fitbit Sync
            - Awair Data Collection
            - Weather Updates
```

## Core Components

### 1. Frontend (Vue.js)

#### Views
- Dashboard: Primary visualization interface
- Medication Timeline: Historical medication changes
- Symptom Manager: Symptom configuration and tracking
- Notes & Events: General health observations

#### State Management
- Pinia stores for:
  - User settings
  - Current view configurations
  - Active data filters
  - Cached query results

#### Components
- Interactive time-series graphs
- Data entry forms
- Configuration panels
- Search interfaces

### 2. Backend (Node.js + Express)

#### API Routes
- Authentication endpoints
- Data collection endpoints
- Query endpoints
- Export endpoints

#### Services
- Data synchronization
- External API integration
- Query optimization
- Data transformation

### 3. Database (SQLite)

#### Core Tables
- Users
- Daily Summaries
- Medication Events
- Symptom Records
- Environmental Data

#### Features
- WAL mode for performance
- Foreign key constraints
- Appropriate indexing
- Data validation

## Data Flow

### 1. Data Collection
- Automated collection from external sources
- Manual entry through frontend forms
- Background synchronization services

### 2. Data Processing
- Normalization of incoming data
- Validation and error handling
- Efficient storage strategies

### 3. Data Access
- Optimized queries for visualization
- Caching for frequent requests
- Efficient data export

## Security Considerations

### Local First
- All data stored locally
- No cloud dependencies
- User controls their data

### API Security
- Token management
- Input validation
- Error handling

## Performance Considerations

### Database
- Appropriate indexes
- Query optimization
- Data pruning strategies

### Frontend
- Efficient rendering
- Data caching
- Lazy loading

## Extension Points

### New Data Sources
- Standardized integration interface
- Data transformation pipeline
- Validation framework

### New Features
- Plugin architecture (future)
- Custom visualization support
- Export format extensions 
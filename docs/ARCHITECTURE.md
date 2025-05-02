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

#### Technology Stack
- Vue 3 with TypeScript
- Vite for build tooling
- Design system with CSS custom properties
- Pinia for state management
- Vue Router for navigation
- ApexCharts for data visualization

#### Project Structure
```
frontend/
├── src/
│   ├── api/        # API client configuration
│   ├── assets/     # Static assets
│   ├── components/ # Reusable UI components
│   ├── layouts/    # Page layouts
│   ├── router/     # Route definitions
│   ├── stores/     # Pinia state management
│   ├── styles/     # Global styles and design system
│   │   ├── base/   # Base styles and resets
│   │   └── theme/  # Design tokens and variables
│   ├── types/      # TypeScript definitions
│   └── views/      # Page components
```

#### Views
- `Dashboard.vue`: Primary visualization interface
  - Date range selection
  - Configurable metric displays
  - Multiple chart types (line, bar)
  - Medication and symptom annotations
- `Medications.vue`: Medication tracking interface
- `Symptoms.vue`: Symptom management and tracking
- `Settings.vue`: Application configuration
- `NotesView.vue`: Health notes and events

#### State Management
The `health.ts` Pinia store manages:
- Daily health summaries (Fitbit data)
- Awair environmental readings
- Weather data
- Medication events
- Symptom events
- Loading states and error handling

#### Components
Core UI Components:
- `BaseButton.vue`: Standard button component
- `BaseCard.vue`: Card container component
- `MedicationScheduler.vue`: Complex medication scheduling interface
  - Multi-step form interface
  - Flexible scheduling patterns
  - Time and day selection
  - Custom interval support

Planned/Needed:
- Reusable chart components
- Form input components
- Loading and error states
- Data entry modals
- Metric selection components

#### Design System
The application uses a comprehensive design system implemented through CSS custom properties:
- Typography scale
- Color system
- Spacing scale
- Component-specific tokens
- Consistent interactive states
- Accessibility considerations

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
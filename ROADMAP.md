# HealthLens Development Roadmap

## MVP Phase 1: Core Infrastructure

### Data Collection & Storage
- [x] SQLite database setup with WAL mode
- [x] Fitbit OAuth integration
- [x] Awair device connection
- [x] Weather data integration
- [ ] Basic data validation and error handling
- [ ] Data import/export functionality

### Frontend Implementation
- [x] Vue 3 + TypeScript setup
- [x] Basic routing structure
- [x] Health data store implementation
- [x] Dashboard view with charts
- [ ] Reusable UI components
  - [x] Basic navigation
  - [ ] Chart components
  - [ ] Form components
  - [ ] Loading states
  - [ ] Error displays
- [ ] Comprehensive error handling
- [ ] Loading state management

### Medication Tracking
- [x] Basic medication interface
- [ ] Medication change tracking system
  - [ ] Add/edit medication entries
  - [ ] Track dosage and frequency changes
  - [ ] Store medication notes and observations
- [ ] Medication timeline view
  - [ ] Chronological view of all medication changes
  - [ ] Filter by date range
  - [ ] Search functionality

### Symptom Management
- [x] Basic symptom interface
- [ ] User-defined symptom configuration
  - [ ] Add/edit/deactivate symptoms
  - [ ] Symptom categorization
  - [ ] Severity scale (1-10)
- [ ] Symptom tracking interface
  - [ ] Quick entry form
  - [ ] Bulk entry for historical data

### Basic Visualization
- [x] Primary time-series graph
  - [x] Basic metric selection
  - [x] Date range selection
  - [x] Medication change annotations
- [x] Basic data views
  - [x] Current medications list
  - [x] Active symptoms list
  - [x] Recent changes timeline

## MVP Phase 2: Enhanced Analytics

### Advanced Visualization
- [ ] Configurable graph overlays
  - [ ] Multiple metric comparison
  - [ ] Customizable colors and styles
  - [ ] Toggle individual elements
- [ ] Saved view configurations
  - [ ] Default views
  - [ ] User-defined views
  - [ ] Quick view switching
- [ ] Interactive features
  - [ ] Zoom/pan controls
  - [ ] Click-to-view details
  - [ ] Highlight periods of interest

### Medication Analysis
- [ ] Medication history view
  - [ ] Success/failure grouping
  - [ ] Historical effectiveness notes
  - [ ] Duration and dosage summary
- [ ] Medication impact analysis
  - [ ] Before/after metric comparison
  - [ ] Side effect tracking
  - [ ] Correlation suggestions

### Notes & Events
- [ ] General note system
  - [ ] Rich text entry
  - [ ] Date-based organization
  - [ ] Searchable content
- [ ] Event annotations
  - [ ] Life events
  - [ ] Medical events
  - [ ] Custom categories

### Data Export
- [ ] AI-ready data formatting
  - [ ] Chronological summaries
  - [ ] Recent period focus (1-2 months)
  - [ ] Key event highlighting
- [ ] Export customization
  - [ ] Date range selection
  - [ ] Data type filtering
  - [ ] Format options

## Future Enhancements

### Pattern Recognition
- [ ] Basic correlation detection
- [ ] Trend analysis
- [ ] Anomaly detection
- [ ] Pattern suggestions

### User Experience
- [ ] Dashboard customization
- [ ] Quick entry shortcuts
- [ ] Keyboard navigation
- [ ] Mobile-responsive design

### Data Integration
- [ ] Additional health device support
- [ ] Lab result parsing (future consideration)
- [ ] Healthcare provider report generation

### Community Features
- [ ] Documentation improvements
- [ ] Installation guides
- [ ] Configuration templates
- [ ] Example setups

## Technical Debt & Infrastructure

### Performance
- [ ] Query optimization
- [ ] Data pruning strategies
- [ ] Caching implementation
- [ ] Background sync optimization

### Security
- [ ] Data backup solutions
- [ ] Token management
- [ ] Error handling improvements
- [ ] Input validation

### Testing
- [ ] Unit test coverage
- [ ] Integration tests
- [ ] End-to-end testing
- [ ] Performance benchmarks

## Notes

- Priority is given to features that reduce manual data entry
- Focus on stability and reliability over feature quantity
- User experience should accommodate varying energy levels
- All features should support the core goal of pattern recognition 
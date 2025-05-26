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

### Unified Timeline & Event System
- [ ] Timeline Event model/table (life events, surgeries, notable medication/symptom changes, etc.)
- [ ] Timeline CRUD API endpoints
- [ ] Timeline events reference medications/symptoms where relevant (foreign key/ID)
- [ ] Timeline frontend integration (fetch, add, edit, delete events)
- [ ] Filtering and impact-level controls (major, moderate, minor)
- [ ] Orphaned Timeline Event review: prompt user to review orphaned events (e.g., when a medication/symptom is deleted)

### Medications
- [ ] Medication entity: full detail (name, dose, schedule, start/stop, user notes, etc.)
- [ ] Medication CRUD API endpoints
- [ ] Medication trial timeline (Gantt-style) view
- [ ] Auto-generate Timeline events for new/discontinued medications (not for dose/schedule changes)
- [ ] Deleting a medication or symptom orphans associated Timeline events for user review

### Symptoms
- [ ] Symptom entity: configuration, severity tracking, history
- [ ] Symptom CRUD API endpoints
- [ ] Auto-generate Timeline events for new symptom onset/remission (not for daily severity changes)
- [ ] Deleting a symptom orphans associated Timeline events for user review

### Daily Check-in
- [ ] Daily Check-in form (medication changes, symptom status, journal entry)
- [ ] Only notable changes (as defined above) are promoted to Timeline events
- [ ] View past check-ins (drill-down from Timeline or separate view)

### Specialized Views
- [ ] Medications: detailed history, trial timeline, user notes
- [ ] Symptoms: configuration, severity trends, history
- [ ] Timeline: broad, uncluttered, high-level view with filters

### Remove/Consolidate
- Remove "General note system" as a standalone feature (notes now live within Timeline events or medication/symptom notes)
- Remove "Medication change tracking system" and "Symptom tracking interface" as separate backend features (now part of unified event system)

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
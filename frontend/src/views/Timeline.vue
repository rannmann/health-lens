<script setup lang="ts">
import { ref, computed } from 'vue';
import { 
  ExclamationTriangleIcon, 
  SparklesIcon, 
  FaceFrownIcon, 
  DocumentTextIcon, 
  PlusIcon,
  BeakerIcon,
  ClipboardDocumentCheckIcon,
  ScissorsIcon,
  ShieldCheckIcon,
  CloudIcon,
  SwatchIcon,
  FunnelIcon
} from '@heroicons/vue/24/solid';
import BaseCard from '@/components/BaseCard.vue';
import BaseModal from '@/components/BaseModal.vue';

interface Category {
  id: number;
  name: string;
  icon: any;
  color: string;
}

interface Event {
  id: number;
  year: number;
  month?: number;
  categoryId: number;
  title: string;
  description: string;
  tag: string;
  sourceType?: 'medication' | 'symptom' | 'note' | 'manual';
  sourceId?: string;
  severity?: number;
  relatedEvents?: number[]; // IDs of related events
  confidence?: 'high' | 'medium' | 'low'; // Confidence in the event's significance
  impact?: 'major' | 'moderate' | 'minor'; // Impact on health
}

// Demo categories with Heroicons
const categories: Category[] = [
  { id: 1, name: 'Illness', icon: ExclamationTriangleIcon, color: '#D32F2F' },
  { id: 2, name: 'Life Event', icon: SparklesIcon, color: '#1976D2' },
  { id: 3, name: 'Symptom', icon: FaceFrownIcon, color: '#7B1FA2' },
  { id: 4, name: 'Note', icon: DocumentTextIcon, color: '#455A64' },
  { id: 5, name: 'Medication', icon: SwatchIcon, color: '#388E3C' },
  { id: 6, name: 'Treatment', icon: BeakerIcon, color: '#F57C00' },
  { id: 7, name: 'Diagnosis', icon: ClipboardDocumentCheckIcon, color: '#00796B' },
  { id: 8, name: 'Surgery', icon: ScissorsIcon, color: '#C2185B' },
  { id: 9, name: 'Vaccination', icon: ShieldCheckIcon, color: '#0097A7' },
  { id: 10, name: 'Environmental', icon: CloudIcon, color: '#5D4037' }
];

// Tag color mapping
const tagColors: Record<string, string> = {
  onset: '#D32F2F',
  diagnosis: '#1976D2',
  remission: '#388E3C'
};

// Demo events
const events = ref<Event[]>([
  {
    id: 1,
    year: 2020,
    month: 1,
    categoryId: 1,
    title: 'GI Issues Began',
    description: 'Started after trial of vegan diet. Issues persisted after stopping.',
    tag: 'onset'
  },
  {
    id: 2,
    year: 2024,
    categoryId: 1,
    title: 'Diagnosed with ME/CFS',
    description: 'Diagnosis after 4 years of symptoms.',
    tag: 'diagnosis'
  },
  {
    id: 3,
    year: 2018,
    categoryId: 2,
    title: 'Moved to new house',
    description: 'July: Relocated to a new home.',
    tag: ''
  },
  {
    id: 4,
    year: 2019,
    categoryId: 4,
    title: 'Peak Fitness Year',
    description: 'Felt healthiest and most active.',
    tag: ''
  },
  {
    id: 5,
    year: 2021,
    categoryId: 3,
    title: 'New Symptom: Fatigue',
    description: 'Persistent fatigue started in spring.',
    tag: 'onset'
  },
  // Additional demo events for testing
  { id: 6, year: 2020, categoryId: 3, title: 'New Symptom: Headache', description: 'Recurring headaches began.', tag: 'onset' },
  { id: 7, year: 2020, categoryId: 1, title: 'Hospitalization', description: 'Admitted for severe GI pain.', tag: '' },
  { id: 8, year: 2020, categoryId: 2, title: 'Started New Job', description: 'Remote work, tech industry.', tag: '' },
  { id: 9, year: 2020, categoryId: 4, title: 'Note: Stressful Year', description: 'Pandemic and job change.', tag: '' },
  { id: 10, year: 2020, categoryId: 1, title: 'Remission', description: 'GI symptoms improved in fall.', tag: 'remission' },
  { id: 11, year: 2020, categoryId: 2, title: 'Adopted a Dog', description: 'Brought home Luna.', tag: '' },
  { id: 12, year: 2020, categoryId: 4, title: 'Note: Started Therapy', description: 'Weekly sessions.', tag: '' },
  { id: 13, year: 2020, categoryId: 3, title: 'New Symptom: Insomnia', description: 'Trouble sleeping most nights.', tag: 'onset' },
  { id: 14, year: 2020, categoryId: 1, title: 'Diagnosis: IBS', description: 'Diagnosed after GI workup.', tag: 'diagnosis' },
  { id: 15, year: 2020, categoryId: 4, title: 'Note: Major Life Reflection', description: 'Reevaluated priorities.', tag: '' },
  { id: 16, year: 2019, categoryId: 1, title: 'Flu', description: 'High fever, 1 week.', tag: 'onset' },
  { id: 17, year: 2019, categoryId: 2, title: 'Moved to new city', description: 'October: Relocated for work.', tag: '' },
  { id: 18, year: 2019, categoryId: 4, title: 'Note: Started Weightlifting', description: 'Began regular gym routine.', tag: '' },
  { id: 19, year: 2019, categoryId: 3, title: 'New Symptom: Joint Pain', description: 'Knees and wrists.', tag: 'onset' },
  { id: 20, year: 2018, categoryId: 1, title: 'Chickenpox', description: 'Mild case, spring.', tag: 'onset' },
  { id: 21, year: 2018, categoryId: 4, title: 'Note: Graduated College', description: 'Computer Science degree.', tag: '' },
  { id: 22, year: 2017, categoryId: 2, title: 'Moved to new house', description: 'July: Relocated to a new home.', tag: '' },
  { id: 23, year: 2017, categoryId: 4, title: 'Note: Started Meditation', description: 'Daily practice.', tag: '' },
  { id: 24, year: 2017, categoryId: 1, title: 'Sinus Infection', description: 'Antibiotics prescribed.', tag: 'onset' },
  { id: 25, year: 2017, categoryId: 3, title: 'New Symptom: Dizziness', description: 'Occasional, unexplained.', tag: 'onset' }
]);

// Group events by year (descending)
const groupedEvents = computed(() => {
  const groups: Record<number, any[]> = {};
  for (const event of events.value) {
    if (!groups[event.year]) groups[event.year] = [];
    groups[event.year].push(event);
  }
  // Sort years descending
  return Object.entries(groups)
    .sort((a, b) => Number(b[0]) - Number(a[0]))
    .map(([year, evs]) => ({ year: Number(year), events: evs }));
});

// Year color palette using theme/chart colors
const yearColors = [
  '#0070d6', // primary-500 (blue, 8.13:1)
  '#8b5cf6', // chart-2 (purple, 4.54:1)
  '#6366f1', // chart-6 (indigo, 5.13:1)
  '#a6761d', // brown (4.53:1)
  '#666666', // gray (5.93:1)
  '#10b981', // green (3.94:1, border ok)
  '#8d1919', // dark red (custom, 8.62:1)
  '#0058ad', // primary-600 (darker blue, 11.13:1)
  '#334155', // neutral-700 (dark slate, 10.77:1)
  '#b91c1c', // error-700 (dark red, 8.62:1)
];
function getYearColor(year: number) {
  return yearColors[year % yearColors.length];
}

function getCategory(catId: number) {
  return categories.find(c => c.id === catId) || { name: 'Unknown', icon: '❓', color: '#ccc' };
}

const today = new Date();
const formattedDate = today.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

// For demo: hardcoded user birthdate (YYYY-MM-DD)
const userBirthdate = '1990-07-15';

function getAgeOnDate(birthdate: string, date: Date): number {
  const birth = new Date(birthdate);
  let age = date.getFullYear() - birth.getFullYear();
  const m = date.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && date.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

function getYearAgeRange(birthdate: string, year: number): string {
  const jan1 = new Date(year, 0, 1);
  const dec31 = new Date(year, 11, 31);
  const ageStart = getAgeOnDate(birthdate, jan1);
  const ageEnd = getAgeOnDate(birthdate, dec31);
  return ageStart === ageEnd ? `${ageStart}` : `${ageStart}–${ageEnd}`;
}

// Add new computed property for filtering
const filteredEvents = computed(() => {
  return events.value.filter(event => {
    // Add any filtering logic here
    return true;
  });
});

// Add new method for adding events from other components
function addEventFromSource(sourceType: 'medication' | 'symptom' | 'note', sourceData: any) {
  const newEvent: Event = {
    id: events.value.length + 1,
    year: new Date(sourceData.timestamp).getFullYear(),
    month: new Date(sourceData.timestamp).getMonth() + 1,
    categoryId: getCategoryIdForSource(sourceType),
    title: sourceData.title || sourceData.name,
    description: sourceData.description || sourceData.notes || '',
    tag: sourceData.tag || '',
    sourceType,
    sourceId: sourceData.id,
    severity: sourceData.severity,
    confidence: 'medium',
    impact: 'moderate'
  };
  events.value.push(newEvent);
}

function getCategoryIdForSource(sourceType: 'medication' | 'symptom' | 'note'): number {
  switch (sourceType) {
    case 'medication': return 5;
    case 'symptom': return 3;
    case 'note': return 4;
    default: return 4;
  }
}

const showAddEventModal = ref(false);
const showFilters = ref(false);
const activeFilters = ref({
  category: '',
  impact: '',
  search: ''
});

const newEvent = ref({
  id: 0,
  year: 0,
  month: 0,
  categoryId: 0,
  title: '',
  description: '',
  tag: '',
  sourceType: 'manual' as const,
  sourceId: '',
  severity: 0,
  confidence: 'medium' as const,
  impact: 'moderate' as const,
  date: new Date().toISOString().split('T')[0]
});

function addNewEvent() {
  const [year, month] = newEvent.value.date.split('-');
  const event: Event = {
    id: events.value.length + 1,
    year: parseInt(year),
    month: parseInt(month),
    categoryId: newEvent.value.categoryId,
    title: newEvent.value.title,
    description: newEvent.value.description,
    tag: newEvent.value.tag,
    sourceType: newEvent.value.sourceType,
    sourceId: newEvent.value.sourceId,
    severity: newEvent.value.severity,
    confidence: newEvent.value.confidence,
    impact: newEvent.value.impact
  };
  events.value.push(event);
  showAddEventModal.value = false;
}
</script>

<template>
  <BaseCard class="timeline-container" title="Medical History Timeline" :subtitle="'Last updated: ' + formattedDate">
    <div class="timeline-controls">
      <div class="action-section">
        <button @click="showFilters = !showFilters" class="button button--secondary">
          <FunnelIcon class="icon" />
          {{ showFilters ? 'Hide Filters' : 'Show Filters' }}
        </button>
        <button @click="showAddEventModal = true" class="button button--primary">
          <PlusIcon class="icon" />
          Add Event
        </button>
      </div>
    </div>

    <div v-if="showFilters" class="filter-section">
      <select v-model="activeFilters.category" class="input">
        <option value="">All Categories</option>
        <option v-for="cat in categories" :key="cat.id" :value="cat.id">
          {{ cat.name }}
        </option>
      </select>
      <select v-model="activeFilters.impact" class="input">
        <option value="">All Impact Levels</option>
        <option value="major">Major Impact</option>
        <option value="moderate">Moderate Impact</option>
        <option value="minor">Minor Impact</option>
      </select>
      <input 
        v-model="activeFilters.search" 
        type="text" 
        class="input" 
        placeholder="Search events..."
      >
    </div>

    <div class="timeline-view">
      <div class="timeline-legend">
        <div class="legend-grid">
          <span v-for="cat in categories" :key="cat.id" class="legend-item">
            <span class="legend-icon-bg">
              <component :is="cat.icon" class="icon-svg" :style="{ color: cat.color }" />
            </span>
            <span class="legend-label">{{ cat.name }}</span>
          </span>
        </div>
      </div>
      <div class="timeline">
        <div v-for="group in groupedEvents" :key="group.year" class="timeline-year"
          :style="{ borderLeftColor: getYearColor(group.year) }">
          <div class="year-header" :style="{ color: getYearColor(group.year) }">
            {{ group.year }}
            <span class="year-age">(Age {{ getYearAgeRange(userBirthdate, group.year) }})</span>
          </div>
          <div class="year-events">
            <div v-for="(event, idx) in group.events" :key="event.id" class="timeline-event-condensed">
              <div class="event-row">
                <component :is="getCategory(event.categoryId).icon" class="icon-svg event"
                  :style="{ color: getCategory(event.categoryId).color }" />
                <span class="event-title">{{ event.title }}</span>
                <span v-if="event.tag" class="event-tag-inline" :style="{ backgroundColor: tagColors[event.tag] }">
                  {{ event.tag }}
                </span>
                <span v-if="event.impact" class="event-impact" :class="'impact-' + event.impact">
                  {{ event.impact }}
                </span>
              </div>
              <div class="event-description-condensed" v-if="event.description">{{ event.description }}</div>
              <div v-if="event.sourceType" class="event-source">
                <span class="source-badge" :class="'source-' + event.sourceType">
                  {{ event.sourceType }}
                </span>
              </div>
              <div v-if="idx < group.events.length - 1" class="event-divider"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </BaseCard>

  <!-- Add Event Modal -->
  <BaseModal v-if="showAddEventModal" @close="showAddEventModal = false">
    <template #title>Add Timeline Event</template>
    <div class="add-event-form">
      <div class="form-group">
        <label>Category</label>
        <select v-model="newEvent.categoryId" class="input">
          <option v-for="cat in categories" :key="cat.id" :value="cat.id">
            {{ cat.name }}
          </option>
        </select>
      </div>
      <div class="form-group">
        <label>Title</label>
        <input v-model="newEvent.title" type="text" class="input" />
      </div>
      <div class="form-group">
        <label>Description</label>
        <textarea v-model="newEvent.description" class="input"></textarea>
      </div>
      <div class="form-group">
        <label>Date</label>
        <input v-model="newEvent.date" type="date" class="input" />
      </div>
      <div class="form-group">
        <label>Impact</label>
        <select v-model="newEvent.impact" class="input">
          <option value="major">Major</option>
          <option value="moderate">Moderate</option>
          <option value="minor">Minor</option>
        </select>
      </div>
      <div class="form-group">
        <label>Tag</label>
        <select v-model="newEvent.tag" class="input">
          <option value="">None</option>
          <option value="onset">Onset</option>
          <option value="diagnosis">Diagnosis</option>
          <option value="remission">Remission</option>
        </select>
      </div>
    </div>
    <template #actions>
      <button @click="addNewEvent" class="button button--primary">Add Event</button>
      <button @click="showAddEventModal = false" class="button button--secondary">Cancel</button>
    </template>
  </BaseModal>
</template>

<style scoped>
.timeline-view {
  max-width: 90vw;
  margin: 0 auto;
  padding: 2rem 1rem;
}

.timeline-legend {
  margin-bottom: 1.2em;
  font-size: 0.95em;
  background: var(--surface-secondary, #f8f9fa);
  padding: 0.8em;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-light);
}

.legend-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 0.5em;
  align-items: center;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.4em;
  font-size: 0.95em;
  white-space: nowrap;
}

.legend-icon-bg {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.1em;
  height: 1.1em;
  background: #fff;
  border-radius: 50%;
  border: 1px solid #ddd;
  flex-shrink: 0;
}

.icon-svg {
  width: 0.9em;
  height: 0.9em;
  margin: 0;
  display: block;
}

.legend-label {
  font-size: 0.95em;
  color: var(--text-secondary);
}

.timeline {
  padding-left: 1.5rem;
}

.timeline-year {
  margin-bottom: 2rem;
  border-left: 3px solid #eee;
  padding-left: 0.5em;
}

.year-header {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: var(--primary-600, #1976d2);
  display: flex;
  align-items: center;
  gap: 0.7em;
}

.year-age {
  font-size: 0.87em;
  color: var(--text-tertiary, #64748b);
  font-weight: 300;
}

.year-events {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.timeline-event-condensed {
  padding: 0.2em 0 0.2em 0;
}

.event-row {
  display: flex;
  align-items: center;
  gap: 0.5em;
  font-size: 1em;
}

.event-title {
  font-weight: 500;
  font-size: 1em;
  margin-right: 0.1em;
}

.event-tag-inline {
  display: inline-block;
  font-size: 0.75em;
  color: #fff;
  padding: 0.05em 0.4em;
  border-radius: 0.7em;
  margin-left: 0em;
  vertical-align: middle;
  font-weight: 400;
  letter-spacing: 0.01em;
}

.event-description-condensed {
  font-size: 0.92em;
  color: #777;
  margin-left: 2em;
  margin-bottom: 0.1em;
  font-weight: 300;
  line-height: 1.3;
}

.event-divider {
  height: 1px;
  background: #ececec;
  margin: 0.2em 0 0.2em 1.5em;
  width: calc(100% - 1.5em);
}

.timeline-controls {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 1rem;
  gap: 0.5rem;
}

.filter-section {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  padding: 1rem;
  background: var(--surface-secondary, #f8f9fa);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-light);
}

.action-section {
  display: flex;
  gap: 0.75rem;
}

.button {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: var(--radius-md);
  font-weight: 500;
  font-size: 0.95rem;
  transition: all 0.2s ease;
  border: 1px solid transparent;
  cursor: pointer;
  white-space: nowrap;
}

.button--primary {
  background-color: var(--primary-500, #2563eb);
  color: white;
  border-color: var(--primary-600, #1d4ed8);
}

.button--primary:hover {
  background-color: var(--primary-600, #1d4ed8);
}

.button--secondary {
  background-color: var(--surface-secondary, #f8f9fa);
  color: var(--text-secondary, #4b5563);
  border-color: var(--border-medium, #e5e7eb);
}

.button--secondary:hover {
  background-color: var(--surface-hover, #f1f5f9);
  border-color: var(--border-hover, #cbd5e1);
}

.button .icon {
  width: 1.1rem;
  height: 1.1rem;
  stroke-width: 2;
}

.event-impact {
  font-size: 0.75em;
  padding: 0.1em 0.4em;
  border-radius: 0.7em;
  margin-left: 0.5em;
}

.impact-major {
  background-color: #D32F2F;
  color: white;
}

.impact-moderate {
  background-color: #F57C00;
  color: white;
}

.impact-minor {
  background-color: #757575;
  color: white;
}

.event-source {
  margin-left: 2em;
  margin-top: 0.2em;
}

.source-badge {
  font-size: 0.75em;
  padding: 0.1em 0.4em;
  border-radius: 0.7em;
  background-color: #E0E0E0;
  color: #424242;
}

.source-medication {
  background-color: #E8F5E9;
  color: #2E7D32;
}

.source-symptom {
  background-color: #F3E5F5;
  color: #6A1B9A;
}

.source-note {
  background-color: #ECEFF1;
  color: #37474F;
}

.add-event-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-weight: 500;
  color: var(--text-secondary);
}

/* Print styles */
@media print {
  .timeline-controls,
  .filter-section {
    display: none;
  }

  .timeline-container {
    box-shadow: none;
    border: none;
  }

  .timeline-view {
    padding: 0;
  }

  .timeline-legend {
    background: none;
    border: none;
    padding: 0;
    margin-bottom: 1rem;
  }

  .legend-grid {
    grid-template-columns: repeat(4, 1fr);
  }

  .timeline-year {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .year-events {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .event-divider {
    border-color: #000;
  }

  .event-title,
  .event-description-condensed {
    color: #000;
  }

  .year-header {
    color: #000;
  }

  .year-age {
    color: #666;
  }
}
</style>
<script setup lang="ts">
import { ref, computed } from 'vue';
import { ExclamationTriangleIcon, SparklesIcon, FaceFrownIcon, DocumentTextIcon } from '@heroicons/vue/24/solid';

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
}

// Demo categories with Heroicons
const categories: Category[] = [
  { id: 1, name: 'Illness', icon: ExclamationTriangleIcon, color: '#D32F2F' },
  { id: 2, name: 'Life Event', icon: SparklesIcon, color: '#1976D2' },
  { id: 3, name: 'Symptom', icon: FaceFrownIcon, color: '#7B1FA2' },
  { id: 4, name: 'Note', icon: DocumentTextIcon, color: '#455A64' }
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
</script>

<template>
  <div class="timeline-view">
    <h1>Medical History Timeline</h1>
    <div class="timeline-legend">
      <div class="legend-row">
        <span class="legend-title">Categories:</span>
        <span v-for="cat in categories" :key="cat.id" class="legend-item">
          <span class="legend-icon-bg">
            <component :is="cat.icon" class="icon-svg" :style="{ color: cat.color }" />
          </span>
          <span class="legend-label">{{ cat.name }}</span>
        </span>
      </div>
    </div>
    <div class="timeline">
      <div v-for="group in groupedEvents" :key="group.year" class="timeline-year" :style="{ borderLeftColor: getYearColor(group.year) }">
        <div class="year-header" :style="{ color: getYearColor(group.year) }">
          {{ group.year }}
          <span class="year-count">({{ group.events.length }} events)</span>
        </div>
        <div class="year-events">
          <div v-for="(event, idx) in group.events" :key="event.id" class="timeline-event-condensed">
            <div class="event-row">
              <component :is="getCategory(event.categoryId).icon" class="icon-svg event" :style="{ color: getCategory(event.categoryId).color }" />
              <span class="event-title">{{ event.title }}</span>
              <span v-if="event.tag" class="event-tag-inline" :style="{ backgroundColor: tagColors[event.tag] }">{{ event.tag }}</span>
            </div>
            <div class="event-description-condensed" v-if="event.description">{{ event.description }}</div>
            <div v-if="idx < group.events.length - 1" class="event-divider"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.timeline-view {
  max-width: 700px;
  margin: 0 auto;
  padding: 2rem 1rem;
}
.timeline-legend {
  display: flex;
  flex-direction: column;
  gap: 0.3em;
  margin-bottom: 1.2em;
  font-size: 0.98em;
}
.legend-row {
  display: flex;
  align-items: center;
  gap: 1.2em;
  margin-bottom: 0.2em;
}
.legend-title {
  font-weight: 500;
  margin-right: 0.7em;
  font-size: 0.97em;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 0.3em;
  font-size: 0.97em;
}
.legend-icon-bg {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.2em;
  height: 1.2em;
  background: #f3f3f3;
  border-radius: 50%;
  border: 1px solid #ccc;
}
.icon-svg {
  width: 1em;
  height: 1em;
  margin: 0;
  display: block;
}
.icon-svg.event {
  width: 1.3em;
  height: 1.3em;
}
.legend-label {
  font-size: 0.97em;
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
.year-count {
  font-size: 0.95em;
  color: #888;
  font-weight: 400;
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
</style> 
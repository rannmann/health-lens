<script setup lang="ts">
import { ref, computed } from 'vue';
import { ExclamationTriangleIcon, HomeIcon, FaceFrownIcon, DocumentTextIcon } from '@heroicons/vue/24/solid';

// Demo categories with Heroicons
const categories = [
  { id: 1, name: 'Illness', icon: ExclamationTriangleIcon, color: '#E57373' },
  { id: 2, name: 'Life Event', icon: HomeIcon, color: '#64B5F6' },
  { id: 3, name: 'Symptom', icon: FaceFrownIcon, color: '#FFD54F' },
  { id: 4, name: 'Note', icon: DocumentTextIcon, color: '#A1887F' }
];

// Tag color mapping
const tagColors: Record<string, string> = {
  onset: '#E57373',
  diagnosis: '#64B5F6',
  remission: '#81C784'
};

// Demo events
const events = ref([
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
            <component :is="cat.icon" class="legend-icon-svg" :style="{ color: cat.color }" />
          </span>
          <span class="legend-label">{{ cat.name }}</span>
        </span>
      </div>
      <div class="legend-row">
        <span class="legend-title">Tags:</span>
        <span v-for="(color, tag) in tagColors" :key="tag" class="legend-item">
          <span class="legend-tag" :style="{ backgroundColor: color }"></span>
          <span class="legend-label">{{ tag.charAt(0).toUpperCase() + tag.slice(1) }}</span>
        </span>
      </div>
    </div>
    <div class="timeline">
      <div v-for="group in groupedEvents" :key="group.year" class="timeline-year">
        <div class="year-header">{{ group.year }}</div>
        <div class="year-events">
          <div v-for="event in group.events" :key="event.id" class="timeline-event">
            <span
              class="event-badge"
              :style="{
                borderColor: getCategory(event.categoryId).color,
                backgroundColor: getCategory(event.categoryId).color
              }"
              :aria-label="getCategory(event.categoryId).name"
            >
              <component :is="getCategory(event.categoryId).icon" class="event-icon-svg" />
            </span>
            <div class="event-content">
              <div class="event-title">{{ event.title }}</div>
              <div class="event-description" v-if="event.description">{{ event.description }}</div>
              <div class="event-tag" v-if="event.tag" :style="{ backgroundColor: tagColors[event.tag] }">{{ event.tag }}</div>
            </div>
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
.legend-color-swatch {
  width: 1em;
  height: 1em;
  border-radius: 50%;
  border: 1px solid #ccc;
  display: inline-block;
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
.legend-icon-svg {
  width: 0.9em;
  height: 0.9em;
}
.legend-tag {
  display: inline-block;
  width: 1.1em;
  height: 1.1em;
  border-radius: 0.3em;
  margin-right: 0.2em;
}
.legend-label {
  font-size: 0.97em;
}
.timeline {
  border-left: 3px solid #eee;
  padding-left: 1.5rem;
}
.timeline-year {
  margin-bottom: 2.5rem;
}
.year-header {
  font-size: 1.3rem;
  font-weight: bold;
  margin-bottom: 0.7rem;
  color: var(--primary-600, #1976d2);
}
.year-events {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}
.timeline-event {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding-left: 0;
  background: #fafbfc;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.03);
  position: relative;
}
.event-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5em;
  height: 2.5em;
  border: 3px solid;
  border-radius: 50%;
  font-size: 1.5em;
  margin-right: 1em;
  transition: background 0.2s, border 0.2s;
}
.event-icon-svg {
  width: 1.5em;
  height: 1.5em;
  color: #fff;
}
.event-content {
  flex: 1;
}
.event-title {
  font-weight: bold;
  font-size: 1.1rem;
  margin-bottom: 0.2em;
}
.event-description {
  font-size: 0.98rem;
  color: #444;
  margin-bottom: 0.2em;
}
.event-tag {
  display: inline-block;
  font-size: 0.85em;
  color: #fff;
  padding: 0.1em 0.7em;
  border-radius: 0.7em;
  margin-top: 0.2em;
}
</style> 
<template>
  <div class="container symptoms-page">
    <h1 class="symptoms__title">Symptoms</h1>

    <BaseCard class="symptoms__card" title="Manage Symptoms">
      <div class="symptom-lists grid" style="gap: var(--space-8); grid-template-columns: 1fr 1fr;">
        <div class="active-symptoms">
          <h3 class="symptoms__section-title">Active Symptoms</h3>
          <ul>
            <li v-for="symptom in activeSymptoms" :key="symptom.id" class="symptoms__item">
              <span>{{ symptom.name }}</span>
              <button class="button button--secondary" @click="deactivateSymptom(symptom.id)">Deactivate</button>
              <button class="button button--secondary" @click="startRename(symptom)">Rename</button>
            </li>
          </ul>
        </div>
        <div class="inactive-symptoms">
          <h3 class="symptoms__section-title">Inactive/Available Symptoms</h3>
          <ul>
            <li v-for="symptom in inactiveSymptoms" :key="symptom.id" class="symptoms__item">
              <span>{{ symptom.name }}</span>
              <button class="button button--primary" @click="activateSymptom(symptom.id)">Activate</button>
              <button class="button button--secondary" @click="startRename(symptom)">Rename</button>
            </li>
          </ul>
        </div>
      </div>
      <form @submit.prevent="addSymptom" class="symptoms__add-form">
        <input v-model="newSymptomName" class="input" placeholder="Add new symptom..." required />
        <button type="submit" class="button button--primary">Add Symptom</button>
      </form>
      <div v-if="renamingSymptom" class="symptoms__rename-form">
        <input v-model="renameValue" class="input" />
        <button class="button button--primary" @click="confirmRename">Save</button>
        <button class="button button--secondary" @click="cancelRename">Cancel</button>
      </div>
    </BaseCard>

    <BaseCard class="symptoms__card" title="Log Symptom Event">
      <form @submit.prevent="addSymptomEvent" class="symptoms__event-form">
        <div class="form-group">
          <label for="symptom">Symptom</label>
          <select id="symptom" v-model="eventForm.symptom_id" class="input" required>
            <option v-for="symptom in activeSymptoms" :key="symptom.id" :value="symptom.id">
              {{ symptom.name }}
            </option>
          </select>
        </div>
        <div class="form-group">
          <label for="severity">Severity (1-10)</label>
          <div class="severity-input" style="display: flex; align-items: center; gap: var(--space-4);">
            <input
              id="severity"
              v-model="eventForm.severity"
              type="range"
              min="1"
              max="10"
              required
              style="flex: 1;"
            >
            <span class="severity-value" style="min-width: 2.5rem; text-align: center;">{{ eventForm.severity }}</span>
          </div>
        </div>
        <div class="form-group">
          <label for="timestamp">Date & Time</label>
          <input
            id="timestamp"
            v-model="eventForm.timestamp"
            type="datetime-local"
            class="input"
            required
          >
        </div>
        <div class="form-group">
          <label for="notes">Notes</label>
          <textarea
            id="notes"
            v-model="eventForm.notes"
            rows="3"
            class="input"
            placeholder="Any additional details about the symptom..."
          ></textarea>
        </div>
        <button type="submit" class="button button--primary">Log Symptom Event</button>
      </form>
    </BaseCard>

    <BaseCard class="symptoms__card" title="Symptom History">
      <div class="symptoms-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-6);">
        <div class="filter-controls" style="display: flex; gap: var(--space-4);">
          <select v-model="filter.symptom_id" class="input">
            <option value="">All Symptoms</option>
            <option v-for="symptom in allSymptoms" :key="symptom.id" :value="symptom.id">
              {{ symptom.name }}
            </option>
          </select>
          <input
            type="text"
            v-model="filter.search"
            class="input"
            placeholder="Search notes..."
          >
          <select v-model="filter.time" class="input">
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">Past Week</option>
            <option value="month">Past Month</option>
          </select>
        </div>
      </div>
      <div v-if="filteredEvents.length === 0" class="empty-state text-secondary" style="text-align: center; padding: var(--space-8);">
        No symptom events logged yet.
      </div>
      <div v-else class="symptom-timeline" style="display: flex; flex-direction: column; gap: var(--space-4);">
        <div
          v-for="event in filteredEvents"
          :key="event.id"
          class="symptom-card card"
          :class="'severity-' + Math.ceil(event.severity / 2)"
          style="border-left: 4px solid var(--primary-500);"
        >
          <div class="symptom-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-2);">
            <h3 class="text-lg" style="margin: 0;">{{ event.symptom_name }}</h3>
            <div class="symptom-actions" style="display: flex; gap: var(--space-2);">
              <button class="button button--secondary" @click="editEvent(event)">Edit</button>
              <button class="button button--secondary" @click="deleteEvent(event.id)">Delete</button>
            </div>
          </div>
          <div class="symptom-details">
            <p class="severity-indicator" style="display: flex; align-items: center; gap: var(--space-2);">
              <strong>Severity:</strong>
              <span class="severity-dots" style="color: var(--error-500); letter-spacing: -1px;">
                {{ '●'.repeat(event.severity) }}
              </span>
              {{ event.severity }}/10
            </p>
            <p><strong>Date:</strong> {{ formatDateTime(event.timestamp) }}</p>
            <p v-if="event.notes" class="symptom-notes text-secondary" style="margin-top: var(--space-2); border-top: 1px solid var(--border-light); font-style: italic; padding-top: var(--space-2);">
              {{ event.notes }}
            </p>
          </div>
        </div>
      </div>
    </BaseCard>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { format, subDays, isWithinInterval, startOfToday, endOfToday, parseISO } from 'date-fns'
import type { Symptom, SymptomEvent } from '@/types'
import BaseCard from '@/components/BaseCard.vue'

const allSymptoms = ref<Symptom[]>([])
const activeSymptoms = computed(() => allSymptoms.value.filter(s => s.active))
const inactiveSymptoms = computed(() => allSymptoms.value.filter(s => !s.active))

const newSymptomName = ref('')
const renamingSymptom = ref<Symptom | null>(null)
const renameValue = ref('')

const eventForm = ref({
  symptom_id: '',
  severity: 5,
  timestamp: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
  notes: ''
})

const events = ref<SymptomEvent[]>([])
const filter = ref({
  symptom_id: '',
  search: '',
  time: 'all'
})

const fetchSymptoms = async () => {
  const res = await fetch('/api/symptom/list')
  if (res.ok) {
    allSymptoms.value = await res.json()
  }
}

const fetchEvents = async () => {
  let url = '/api/symptom/event'
  const params = []
  if (filter.value.symptom_id) params.push(`symptom_id=${filter.value.symptom_id}`)
  // Optionally add date filtering here
  if (params.length) url += '?' + params.join('&')
  const res = await fetch(url)
  if (res.ok) {
    events.value = await res.json()
  }
}

const addSymptom = async () => {
  if (!newSymptomName.value.trim()) return
  const res = await fetch('/api/symptom/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: newSymptomName.value.trim() })
  })
  if (res.ok) {
    newSymptomName.value = ''
    await fetchSymptoms()
  }
}

const activateSymptom = async (id: number) => {
  await fetch(`/api/symptom/${id}/activate`, { method: 'POST' })
  await fetchSymptoms()
}

const deactivateSymptom = async (id: number) => {
  await fetch(`/api/symptom/${id}/deactivate`, { method: 'POST' })
  await fetchSymptoms()
}

const startRename = (symptom: Symptom) => {
  renamingSymptom.value = symptom
  renameValue.value = symptom.name
}
const confirmRename = async () => {
  if (!renamingSymptom.value) return
  await fetch(`/api/symptom/${renamingSymptom.value.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: renameValue.value })
  })
  renamingSymptom.value = null
  renameValue.value = ''
  await fetchSymptoms()
}
const cancelRename = () => {
  renamingSymptom.value = null
  renameValue.value = ''
}

const addSymptomEvent = async () => {
  if (!eventForm.value.symptom_id) return
  const res = await fetch('/api/symptom/event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...eventForm.value,
      severity: Number(eventForm.value.severity)
    })
  })
  if (res.ok) {
    eventForm.value = {
      symptom_id: '',
      severity: 5,
      timestamp: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      notes: ''
    }
    await fetchEvents()
  }
}

const editEvent = (event: SymptomEvent) => {
  // Implement edit event logic (modal, etc.)
  alert('Edit event not implemented yet')
}
const deleteEvent = async (id: number) => {
  if (confirm('Are you sure you want to delete this symptom event?')) {
    await fetch(`/api/symptom/event/${id}`, { method: 'DELETE' })
    await fetchEvents()
  }
}

const filteredEvents = computed(() => {
  let filtered = [...events.value]
  if (filter.value.symptom_id) {
    filtered = filtered.filter(e => e.symptom_id === Number(filter.value.symptom_id))
  }
  if (filter.value.search) {
    const search = filter.value.search.toLowerCase()
    filtered = filtered.filter(e => e.notes?.toLowerCase().includes(search))
  }
  const now = new Date()
  switch (filter.value.time) {
    case 'today':
      filtered = filtered.filter(e =>
        isWithinInterval(parseISO(e.timestamp), {
          start: startOfToday(),
          end: endOfToday()
        })
      )
      break
    case 'week':
      filtered = filtered.filter(e =>
        parseISO(e.timestamp) > subDays(now, 7)
      )
      break
    case 'month':
      filtered = filtered.filter(e =>
        parseISO(e.timestamp) > subDays(now, 30)
      )
      break
  }
  return filtered.sort((a, b) =>
    parseISO(b.timestamp).getTime() - parseISO(a.timestamp).getTime()
  )
})

const formatDateTime = (timestamp: string) => {
  return format(parseISO(timestamp), 'MMM d, yyyy h:mm a')
}

onMounted(async () => {
  await fetchSymptoms()
  await fetchEvents()
})
</script>

<style scoped>
.symptoms-page {
  max-width: var(--container-lg);
  margin: 0 auto;
  padding: var(--space-8) var(--space-4);
}

.symptoms__title {
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  color: var(--text-primary);
  margin-bottom: var(--space-8);
}

.symptoms__section-title {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--text-primary);
  margin-bottom: var(--space-4);
}

.symptoms__card {
  margin-bottom: var(--space-8);
}

.symptoms__item {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-2) 0;
}

.symptoms__add-form {
  display: flex;
  gap: var(--space-4);
  margin-top: var(--space-4);
}

.symptoms__rename-form {
  display: flex;
  gap: var(--space-4);
  margin-top: var(--space-4);
}
</style> 
<template>
  <div class="symptoms">
    <h1>Symptoms</h1>
    
    <div class="symptom-form">
      <h2>Log Symptom</h2>
      <form @submit.prevent="addSymptom">
        <div class="form-group">
          <label for="symptom">Symptom</label>
          <input
            id="symptom"
            v-model="newSymptom.symptom"
            type="text"
            required
            list="common-symptoms"
          >
          <datalist id="common-symptoms">
            <option value="Headache"></option>
            <option value="Fatigue"></option>
            <option value="Nausea"></option>
            <option value="Dizziness"></option>
            <option value="Joint Pain"></option>
            <option value="Muscle Pain"></option>
            <option value="Fever"></option>
            <option value="Cough"></option>
          </datalist>
        </div>
        
        <div class="form-group">
          <label for="severity">Severity (1-10)</label>
          <div class="severity-input">
            <input
              id="severity"
              v-model="newSymptom.severity"
              type="range"
              min="1"
              max="10"
              required
            >
            <span class="severity-value">{{ newSymptom.severity }}</span>
          </div>
        </div>
        
        <div class="form-group">
          <label for="timestamp">Date & Time</label>
          <input
            id="timestamp"
            v-model="newSymptom.timestamp"
            type="datetime-local"
            required
          >
        </div>
        
        <div class="form-group">
          <label for="notes">Notes</label>
          <textarea
            id="notes"
            v-model="newSymptom.notes"
            rows="3"
            placeholder="Any additional details about the symptom..."
          ></textarea>
        </div>
        
        <button type="submit">Log Symptom</button>
      </form>
    </div>
    
    <div class="symptoms-list">
      <div class="symptoms-header">
        <h2>Symptom History</h2>
        <div class="filter-controls">
          <input
            type="text"
            v-model="searchTerm"
            placeholder="Search symptoms..."
            @input="filterSymptoms"
          >
          <select v-model="timeFilter" @change="filterSymptoms">
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">Past Week</option>
            <option value="month">Past Month</option>
          </select>
        </div>
      </div>
      
      <div v-if="filteredSymptoms.length === 0" class="empty-state">
        No symptoms logged yet.
      </div>
      
      <div v-else class="symptom-timeline">
        <div
          v-for="symptom in filteredSymptoms"
          :key="symptom.id"
          class="symptom-card"
          :class="'severity-' + Math.ceil(symptom.severity / 2)"
        >
          <div class="symptom-header">
            <h3>{{ symptom.symptom }}</h3>
            <div class="symptom-actions">
              <button @click="editSymptom(symptom)">Edit</button>
              <button @click="deleteSymptom(symptom.id)">Delete</button>
            </div>
          </div>
          
          <div class="symptom-details">
            <p class="severity-indicator">
              <strong>Severity:</strong>
              <span class="severity-dots">
                {{ "●".repeat(symptom.severity) }}
              </span>
              {{ symptom.severity }}/10
            </p>
            <p><strong>Date:</strong> {{ formatDateTime(symptom.timestamp) }}</p>
            <p v-if="symptom.notes" class="symptom-notes">
              {{ symptom.notes }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { format, subDays, isWithinInterval, startOfToday, endOfToday, parseISO } from 'date-fns'

interface Symptom {
  id: string
  symptom: string
  severity: number
  timestamp: string
  notes?: string
}

const symptoms = ref<Symptom[]>([])
const searchTerm = ref('')
const timeFilter = ref('all')

const newSymptom = ref<Omit<Symptom, 'id'>>({
  symptom: '',
  severity: 5,
  timestamp: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
  notes: ''
})

const filteredSymptoms = computed(() => {
  let filtered = [...symptoms.value]
  
  // Apply search filter
  if (searchTerm.value) {
    const search = searchTerm.value.toLowerCase()
    filtered = filtered.filter(s => 
      s.symptom.toLowerCase().includes(search) ||
      s.notes?.toLowerCase().includes(search)
    )
  }
  
  // Apply time filter
  const now = new Date()
  switch (timeFilter.value) {
    case 'today':
      filtered = filtered.filter(s => 
        isWithinInterval(parseISO(s.timestamp), {
          start: startOfToday(),
          end: endOfToday()
        })
      )
      break
    case 'week':
      filtered = filtered.filter(s => 
        parseISO(s.timestamp) > subDays(now, 7)
      )
      break
    case 'month':
      filtered = filtered.filter(s => 
        parseISO(s.timestamp) > subDays(now, 30)
      )
      break
  }
  
  // Sort by timestamp, most recent first
  return filtered.sort((a, b) => 
    parseISO(b.timestamp).getTime() - parseISO(a.timestamp).getTime()
  )
})

const fetchSymptoms = async () => {
  try {
    const response = await fetch('/api/symptom')
    if (response.ok) {
      symptoms.value = await response.json()
    }
  } catch (error) {
    console.error('Error fetching symptoms:', error)
  }
}

const addSymptom = async () => {
  try {
    const response = await fetch('/api/symptom', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(newSymptom.value)
    })
    
    if (response.ok) {
      await fetchSymptoms()
      // Reset form
      newSymptom.value = {
        symptom: '',
        severity: 5,
        timestamp: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        notes: ''
      }
    }
  } catch (error) {
    console.error('Error adding symptom:', error)
  }
}

const editSymptom = (symptom: Symptom) => {
  // Implement edit functionality
  console.log('Edit symptom:', symptom)
}

const deleteSymptom = async (id: string) => {
  if (confirm('Are you sure you want to delete this symptom entry?')) {
    try {
      const response = await fetch(`/api/symptom/${id}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        await fetchSymptoms()
      }
    } catch (error) {
      console.error('Error deleting symptom:', error)
    }
  }
}

const formatDateTime = (timestamp: string) => {
  return format(parseISO(timestamp), 'MMM d, yyyy h:mm a')
}

const filterSymptoms = () => {
  // Implement filter functionality
  console.log('Filter symptoms')
}

onMounted(() => {
  fetchSymptoms()
})
</script>

<style scoped>
.symptoms {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.symptom-form {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
}

.form-group {
  margin-bottom: 1rem;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

input,
textarea,
select {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

.severity-input {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.severity-input input[type="range"] {
  flex: 1;
}

.severity-value {
  min-width: 2.5rem;
  text-align: center;
}

button {
  background: #4CAF50;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
}

button:hover {
  background: #45a049;
}

.symptoms-list {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.symptoms-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.filter-controls {
  display: flex;
  gap: 1rem;
}

.filter-controls input,
.filter-controls select {
  width: auto;
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: #666;
}

.symptom-timeline {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.symptom-card {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 1rem;
}

.symptom-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.symptom-actions {
  display: flex;
  gap: 0.5rem;
}

.symptom-actions button {
  padding: 0.25rem 0.5rem;
  font-size: 0.875rem;
}

.symptom-details p {
  margin: 0.5rem 0;
}

.severity-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.severity-dots {
  color: #ff4560;
  letter-spacing: -1px;
}

.symptom-notes {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #eee;
  font-style: italic;
}

/* Severity color classes */
.severity-1 { border-left: 4px solid #00E396; }
.severity-2 { border-left: 4px solid #FEB019; }
.severity-3 { border-left: 4px solid #FF4560; }
.severity-4 { border-left: 4px solid #775DD0; }
.severity-5 { border-left: 4px solid #FF0000; }
</style> 
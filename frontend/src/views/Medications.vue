<template>
  <div class="medications">
    <h1>Medications</h1>
    
    <div class="medication-form">
      <h2>Add Medication</h2>
      <form @submit.prevent="addMedication">
        <div class="form-group">
          <label for="name">Name</label>
          <input
            id="name"
            v-model="newMedication.name"
            type="text"
            required
          >
        </div>
        
        <div class="form-group">
          <label for="dosage">Dosage</label>
          <input
            id="dosage"
            v-model="newMedication.dosage"
            type="text"
            required
          >
        </div>
        
        <div class="form-group">
          <label for="frequency">Frequency</label>
          <input
            id="frequency"
            v-model="newMedication.frequency"
            type="text"
            required
          >
        </div>
        
        <div class="form-group">
          <label for="startDate">Start Date</label>
          <input
            id="startDate"
            v-model="newMedication.startDate"
            type="date"
            required
          >
        </div>
        
        <div class="form-group">
          <label for="endDate">End Date (Optional)</label>
          <input
            id="endDate"
            v-model="newMedication.endDate"
            type="date"
          >
        </div>
        
        <div class="form-group">
          <label for="notes">Notes</label>
          <textarea
            id="notes"
            v-model="newMedication.notes"
            rows="3"
          ></textarea>
        </div>
        
        <button type="submit">Add Medication</button>
      </form>
    </div>
    
    <div class="medication-list">
      <h2>Current Medications</h2>
      <div v-if="medications.length === 0" class="empty-state">
        No medications added yet.
      </div>
      <div v-else class="medication-cards">
        <div
          v-for="medication in medications"
          :key="medication.id"
          class="medication-card"
        >
          <div class="medication-header">
            <h3>{{ medication.name }}</h3>
            <div class="medication-actions">
              <button @click="editMedication(medication)">Edit</button>
              <button @click="deleteMedication(medication.id)">Delete</button>
            </div>
          </div>
          <div class="medication-details">
            <p><strong>Dosage:</strong> {{ medication.dosage }}</p>
            <p><strong>Frequency:</strong> {{ medication.frequency }}</p>
            <p><strong>Start Date:</strong> {{ formatDate(medication.startDate) }}</p>
            <p v-if="medication.endDate">
              <strong>End Date:</strong> {{ formatDate(medication.endDate) }}
            </p>
            <p v-if="medication.notes">
              <strong>Notes:</strong> {{ medication.notes }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

interface Medication {
  id: string
  name: string
  dosage: string
  frequency: string
  startDate: string
  endDate?: string
  notes?: string
}

const router = useRouter()
const medications = ref<Medication[]>([])
const newMedication = ref<Omit<Medication, 'id'>>({
  name: '',
  dosage: '',
  frequency: '',
  startDate: '',
  endDate: '',
  notes: ''
})

const fetchMedications = async () => {
  try {
    const response = await fetch('/api/medications')
    if (response.ok) {
      medications.value = await response.json()
    }
  } catch (error) {
    console.error('Error fetching medications:', error)
  }
}

const addMedication = async () => {
  try {
    const response = await fetch('/api/medications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(newMedication.value)
    })
    
    if (response.ok) {
      await fetchMedications()
      // Reset form
      newMedication.value = {
        name: '',
        dosage: '',
        frequency: '',
        startDate: '',
        endDate: '',
        notes: ''
      }
    }
  } catch (error) {
    console.error('Error adding medication:', error)
  }
}

const editMedication = (medication: Medication) => {
  router.push(`/medications/${medication.id}`)
}

const deleteMedication = async (id: string) => {
  if (confirm('Are you sure you want to delete this medication?')) {
    try {
      const response = await fetch(`/api/medications/${id}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        await fetchMedications()
      }
    } catch (error) {
      console.error('Error deleting medication:', error)
    }
  }
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString()
}

onMounted(() => {
  fetchMedications()
})
</script>

<style scoped>
.medications {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.medication-form {
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
textarea {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
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

.medication-list {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: #666;
}

.medication-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}

.medication-card {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 1rem;
}

.medication-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.medication-actions {
  display: flex;
  gap: 0.5rem;
}

.medication-actions button {
  padding: 0.25rem 0.5rem;
  font-size: 0.875rem;
}

.medication-details p {
  margin: 0.5rem 0;
}
</style> 
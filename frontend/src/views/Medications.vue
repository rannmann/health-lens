<template>
  <div class="medications">
    <h1>Medications</h1>
    
    <div v-if="!isAddingMedication" class="add-button-container">
      <button @click="isAddingMedication = true" class="add-button">
        Add New Medication
      </button>
    </div>

    <div v-else class="medication-form">
      <div class="form-header">
        <h2>Add Medication</h2>
        <button @click="isAddingMedication = false" class="close-button">×</button>
      </div>
      <MedicationScheduler @save="handleMedicationSave" />
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
              <button @click="deleteMedication(medication.id)" class="delete-button">Delete</button>
            </div>
          </div>
          <div class="medication-details">
            <p><strong>Dose:</strong> {{ formatDose(medication.dose) }}</p>
            <p><strong>Schedule:</strong> {{ formatSchedule(medication.schedule) }}</p>
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
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import MedicationScheduler from '../components/MedicationScheduler.vue';
import type { 
  Medication, 
  MedicationDose, 
  FrequencySchedule,
  MedicationSchedule 
} from '../types/medication';

const router = useRouter();
const medications = ref<Medication[]>([]);
const isAddingMedication = ref(false);

const fetchMedications = async () => {
  try {
    const response = await fetch('/api/medications');
    if (response.ok) {
      medications.value = await response.json();
    }
  } catch (error) {
    console.error('Error fetching medications:', error);
  }
};

const handleMedicationSave = async (medicationSchedule: MedicationSchedule) => {
  try {
    const response = await fetch('/api/medications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(medicationSchedule)
    });
    
    if (response.ok) {
      await fetchMedications();
      isAddingMedication.value = false;
    }
  } catch (error) {
    console.error('Error adding medication:', error);
  }
};

const editMedication = (medication: Medication) => {
  router.push(`/medications/${medication.id}`);
};

const deleteMedication = async (id: string) => {
  if (confirm('Are you sure you want to delete this medication?')) {
    try {
      const response = await fetch(`/api/medications/${id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        await fetchMedications();
      }
    } catch (error) {
      console.error('Error deleting medication:', error);
    }
  }
};

const formatDose = (dose: MedicationDose) => {
  return `${dose.amount} ${dose.unit} ${dose.route}`;
};

const formatSchedule = (schedule: FrequencySchedule) => {
  const times = schedule.timesOfDay
    .map(t => t.label || formatTime(t))
    .join(', ');
    
  switch (schedule.type) {
    case 'daily':
      return `Daily at ${times}`;
    case 'weekly':
      const days = schedule.daysOfWeek
        ?.map(d => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d])
        .join(', ');
      return `${days} at ${times}`;
    case 'monthly':
      const monthDays = schedule.daysOfMonth?.join(', ');
      return `Monthly on day(s) ${monthDays} at ${times}`;
    default:
      return schedule.customPattern || 'Custom schedule';
  }
};

const formatTime = (time: { hour: number; minute: number }) => {
  return new Date(0, 0, 0, time.hour, time.minute)
    .toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

onMounted(() => {
  fetchMedications();
});
</script>

<style scoped>
.medications {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.add-button-container {
  margin-bottom: 2rem;
  text-align: right;
}

.add-button {
  background: #4CAF50;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 500;
}

.add-button:hover {
  background: #45a049;
}

.medication-form {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
  position: relative;
}

.form-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.close-button {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.5rem;
  line-height: 1;
  color: #666;
}

.close-button:hover {
  color: #000;
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
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1rem;
  background: #f8fafc;
}

.medication-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.medication-header h3 {
  margin: 0;
  color: #1a202c;
}

.medication-actions {
  display: flex;
  gap: 0.5rem;
}

.medication-actions button {
  padding: 0.25rem 0.75rem;
  font-size: 0.875rem;
  border-radius: 4px;
  cursor: pointer;
}

.medication-actions button:not(.delete-button) {
  background: #3b82f6;
  color: white;
  border: none;
}

.delete-button {
  background: #ef4444;
  color: white;
  border: none;
}

.medication-details p {
  margin: 0.5rem 0;
  color: #4a5568;
}

.medication-details strong {
  color: #2d3748;
}
</style> 
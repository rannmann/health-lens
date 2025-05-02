<template>
  <div class="medications">
    <h1 class="medications__title">Medications</h1>
    
    <div v-if="!isAddingMedication" class="medications__actions">
      <button @click="isAddingMedication = true" class="button button--success">
        Add New Medication
      </button>
    </div>

    <BaseCard v-else>
      <template #title>Add Medication</template>
      <template #actions>
        <button @click="isAddingMedication = false" class="button button--icon">
          <span aria-hidden="true">×</span>
        </button>
      </template>
      <MedicationScheduler @save="handleMedicationSave" />
    </BaseCard>
    
    <BaseCard>
      <template #title>Current Medications</template>
      <div v-if="medications.length === 0" class="empty-state">
        No medications added yet.
      </div>
      <div v-else class="medications-grid">
        <BaseCard
          v-for="medication in medications"
          :key="medication.id"
          :title="medication.name"
          class="medication-card"
        >
          <template #actions>
            <button @click="editMedication(medication)" class="button button--icon button--secondary">
              Edit
            </button>
            <button @click="deleteMedication(medication.id)" class="button button--icon button--error">
              Delete
            </button>
          </template>
          <div class="medication-details">
            <p class="medication-detail">
              <span class="medication-detail__label">Dose:</span>
              <span class="medication-detail__value">{{ formatDose(medication.dose) }}</span>
            </p>
            <p class="medication-detail">
              <span class="medication-detail__label">Schedule:</span>
              <span class="medication-detail__value">{{ formatSchedule(medication.schedule) }}</span>
            </p>
            <p v-if="medication.notes" class="medication-detail">
              <span class="medication-detail__label">Notes:</span>
              <span class="medication-detail__value">{{ medication.notes }}</span>
            </p>
          </div>
        </BaseCard>
      </div>
    </BaseCard>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import BaseCard from '../components/BaseCard.vue';
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
  max-width: var(--container-lg);
  margin: 0 auto;
}

.medications__title {
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  color: var(--text-primary);
  margin-bottom: var(--space-8);
}

.medications__actions {
  margin-bottom: var(--space-6);
  text-align: right;
}

.empty-state {
  text-align: center;
  padding: var(--space-8);
  color: var(--text-tertiary);
  font-size: var(--text-lg);
}

.medications-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--space-4);
}

.medication-card {
  height: 100%;
}

.medication-details {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.medication-detail {
  margin: 0;
  line-height: var(--leading-relaxed);
}

.medication-detail__label {
  font-weight: var(--font-medium);
  color: var(--text-secondary);
  margin-right: var(--space-2);
}

.medication-detail__value {
  color: var(--text-primary);
}

.button--icon {
  width: var(--space-8);
  height: var(--space-8);
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  font-size: var(--text-lg);
  line-height: 1;
}
</style> 
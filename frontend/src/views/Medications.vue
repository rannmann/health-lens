<template>
  <div class="medications">
    <h1 class="medications__title">Medications</h1>
    
    <div class="medications__actions">
      <button @click="openAddModal" class="button button--success">
        Add New Medication
      </button>
    </div>

    <!-- Add/Edit Medication Modal -->
    <BaseModal v-if="showModal" @close="closeModal" width="420px">
      <h2 style="margin-bottom: 1rem;">{{ editMedicationData ? 'Edit Medication' : (addDoseMedication ? 'Add Dose' : 'Add Medication') }}</h2>
      <MedicationScheduler
        :medication="editMedicationData || addDoseMedication"
        :mode="addDoseMedication ? 'addDose' : (editMedicationData ? 'edit' : 'add')"
        @save="handleMedicationSave"
        @cancel="closeModal"
      />
    </BaseModal>
    
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
            <button @click="openEditModal(medication)" class="button button--icon button--secondary">
              Edit
            </button>
            <button @click="deleteMedication(medication.id)" class="button button--icon button--error">
              Delete
            </button>
          </template>
          <div class="medication-details">
            <p class="medication-detail">
              <span class="medication-detail__label">Prescription:</span>
              <span class="medication-detail__value">{{ medication.isPrescription ? 'Yes' : 'No' }}</span>
            </p>
            <p class="medication-detail">
              <span class="medication-detail__label">Start Date:</span>
              <span class="medication-detail__value">{{ medication.startDate }}</span>
            </p>
            <p v-if="medication.endDate" class="medication-detail">
              <span class="medication-detail__label">End Date:</span>
              <span class="medication-detail__value">{{ medication.endDate }}</span>
            </p>
            <p v-if="medication.notes" class="medication-detail">
              <span class="medication-detail__label">Notes:</span>
              <span class="medication-detail__value">{{ medication.notes }}</span>
            </p>
            <div class="dose-history">
              <h4>Dose History</h4>
              <div v-for="dose in medication.doses" :key="dose.id" class="dose-history__item">
                <div>
                  <span class="medication-detail__label">Dose:</span>
                  <span class="medication-detail__value">{{ formatDose(dose.dose) }}</span>
                </div>
                <div>
                  <span class="medication-detail__label">Schedule:</span>
                  <span class="medication-detail__value">{{ formatSchedule(dose.frequency) }}</span>
                </div>
                <div>
                  <span class="medication-detail__label">Start:</span>
                  <span class="medication-detail__value">{{ dose.startDate }}</span>
                  <span v-if="dose.endDate">&nbsp;–&nbsp;{{ dose.endDate }}</span>
                </div>
                <div v-if="dose.notes">
                  <span class="medication-detail__label">Notes:</span>
                  <span class="medication-detail__value">{{ dose.notes }}</span>
                </div>
              </div>
              <button @click="openAddDoseModal(medication)" class="button button--secondary button--small">Add Dose</button>
            </div>
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
import BaseModal from '../components/BaseModal.vue';
import type { 
  Medication, 
  MedicationDose, 
  FrequencySchedule,
  MedicationSchedule,
  Dose
} from '../types/medication';
import api from '../api/axios';

const router = useRouter();
const medications = ref<Medication[]>([]);
const showModal = ref(false);
const editMedicationData = ref<Medication | null>(null);
const addDoseMedication = ref<Medication | null>(null);

const fetchMedications = async () => {
  try {
    const response = await api.get('/medications');
    medications.value = response.data;
  } catch (error) {
    console.error('Error fetching medications:', error);
  }
};

const openAddModal = () => {
  editMedicationData.value = null;
  addDoseMedication.value = null;
  showModal.value = true;
};

const openEditModal = (medication: Medication) => {
  editMedicationData.value = medication;
  addDoseMedication.value = null;
  showModal.value = true;
};

const openAddDoseModal = (medication: Medication) => {
  editMedicationData.value = null;
  addDoseMedication.value = medication;
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
  editMedicationData.value = null;
  addDoseMedication.value = null;
};

const handleMedicationSave = async (payload: any) => {
  try {
    if (addDoseMedication.value) {
      // Add a new dose to an existing medication
      await api.post(`/medications/${addDoseMedication.value.id}/doses`, payload);
    } else if (editMedicationData.value) {
      // Update medication info
      await api.put(`/medications/${editMedicationData.value.id}`, payload);
    } else {
      // Add new medication
      await api.post('/medications', payload);
    }
    await fetchMedications();
    closeModal();
  } catch (error) {
    console.error('Error saving medication:', error);
  }
};

const deleteMedication = async (id: number) => {
  if (confirm('Are you sure you want to delete this medication?')) {
    try {
      await api.delete(`/medications/${id}`);
      await fetchMedications();
    } catch (error) {
      console.error('Error deleting medication:', error);
    }
  }
};

const formatDose = (dose: Dose) => {
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

.base-modal__overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  z-index: var(--z-modal, 1400);
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
}

.base-modal__content {
  background: var(--surface-primary, #fff);
  border-radius: var(--radius-lg, 12px);
  box-shadow: var(--shadow-lg, 0 8px 32px rgba(0,0,0,0.2));
  padding: var(--space-6, 2rem);
  width: 100%;
  max-width: 420px;
  min-width: 320px;
  margin: 0 1rem;
  outline: none;
  max-height: 90vh;
  overflow-y: auto;
  min-height: 0;
  margin-top: 2vh;
  margin-bottom: 2vh;
}
</style> 
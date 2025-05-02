<template>
  <div class="medication-scheduler">
    <!-- Step 1: Basic Info -->
    <div class="step" v-if="currentStep === 1">
      <h3>Medication Details</h3>
      <div class="form-group">
        <label>Medication Name</label>
        <input v-model="medication.name" type="text" placeholder="Enter medication name" />
      </div>
      <div class="form-group">
        <label>Dose Amount</label>
        <div class="dose-input">
          <input v-model="dose.amount" type="number" step="0.01" />
          <select v-model="dose.unit">
            <option value="mg">mg</option>
            <option value="mcg">mcg</option>
            <option value="ml">ml</option>
            <option value="pill">pill(s)</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label>How do you take this medication?</label>
        <select v-model="dose.route">
          <option value="oral">By mouth</option>
          <option value="injection">Injection</option>
          <option value="topical">On skin</option>
          <option value="inhaled">Inhaled</option>
        </select>
      </div>
    </div>

    <!-- Step 2: Frequency Pattern -->
    <div class="step" v-if="currentStep === 2">
      <h3>How often do you take this medication?</h3>
      
      <!-- Quick Patterns -->
      <div class="quick-patterns">
        <BaseButton 
          v-for="pattern in commonPatterns" 
          :key="pattern.id"
          :variant="isPatternActive(pattern) ? 'primary' : 'secondary'"
          :class="{ active: isPatternActive(pattern) }"
          @click="applyPattern(pattern)"
        >
          {{ pattern.label }}
        </BaseButton>
        <BaseButton 
          variant="secondary"
          :class="{ active: schedule.type === 'custom' }"
          @click="openCustomInterval"
        >
          Custom Interval
        </BaseButton>
      </div>

      <!-- Once Daily Time Selection (if applicable) -->
      <div v-if="isOnceDailySelected && !showCustomIntervalModal" class="time-selection">
        <h4>General time of day (optional)</h4>
        <div class="time-chips">
          <div 
            v-for="time in [
              { label: 'Morning', hour: 8, minute: 0 },
              { label: 'Afternoon', hour: 14, minute: 0 },
              { label: 'Evening', hour: 20, minute: 0 },
              { label: 'Bedtime', hour: 22, minute: 0 }
            ]" 
            :key="time.label"
            class="time-chip"
            :class="{ active: isTimeSelected(time) }"
            @click="setOnceDailyTime(time)"
          >
            {{ time.label }}
          </div>
        </div>
        <p class="help-text">This helps track your medication schedule but doesn't require taking it at an exact time</p>
      </div>

      <!-- Custom Schedule -->
      <div class="custom-schedule" v-if="schedule.type === 'custom' && showCustomIntervalModal">
        <div class="frequency-type">
          <select v-model="schedule.type">
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="custom">Custom Pattern</option>
          </select>
        </div>

        <!-- Daily Times -->
        <div class="times-of-day">
          <h4>Times of Day</h4>
          <div class="time-chips">
            <div 
              v-for="time in commonTimes" 
              :key="time.label"
              class="time-chip"
              :class="{ active: isTimeSelected(time) }"
              @click="toggleTime(time)"
            >
              {{ time.label }}
              <span class="time-detail">{{ formatTime(time) }}</span>
            </div>
          </div>
          <button @click="showCustomTimeModal = true">+ Add Custom Time</button>
        </div>

        <!-- Weekly/Monthly Options -->
        <div v-if="isWeeklySchedule && !showCustomIntervalModal" class="day-selector">
          <h4>Which days of the week?</h4>
          <div class="day-chips">
            <div 
              v-for="day in daysOfWeek" 
              :key="day.value"
              class="day-chip"
              :class="{ active: isDaySelected(day.value) }"
              @click="toggleDay(day.value)"
            >
              {{ day.label }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Step 3: Review -->
    <div class="step" v-if="currentStep === 3">
      <h3>Review Schedule</h3>
      <div class="schedule-summary">
        <h4>{{ medication.name }}</h4>
        <p class="dose-summary">{{ formatDose(dose) }}</p>
        <p class="schedule-text">{{ formatSchedule(schedule) }}</p>
        
        <div class="schedule-timeline">
          <!-- Visual timeline of doses throughout day/week -->
          <div class="timeline-visualization">
            <!-- Render timeline based on schedule -->
          </div>
        </div>
      </div>
    </div>

    <!-- Navigation -->
    <div class="step-navigation">
      <BaseButton 
        v-if="currentStep > 1" 
        @click="currentStep--"
        variant="secondary"
      >Back</BaseButton>
      <BaseButton 
        v-if="currentStep < 3" 
        @click="currentStep++"
        :disabled="!canProceed"
        variant="primary"
      >Next</BaseButton>
      <BaseButton 
        v-else 
        @click="save"
        :disabled="!isValid"
        variant="primary"
      >Save Schedule</BaseButton>
    </div>

    <!-- Custom Time Modal -->
    <modal v-if="showCustomTimeModal">
      <div class="custom-time-modal">
        <h4>Add Custom Time</h4>
        <div class="time-input">
          <input 
            type="time" 
            v-model="customTime.time"
          />
          <input 
            type="text" 
            v-model="customTime.label"
            placeholder="Label (e.g., 'With lunch')"
          />
        </div>
        <div class="modal-actions">
          <button @click="addCustomTime">Add</button>
          <button @click="showCustomTimeModal = false">Cancel</button>
        </div>
      </div>
    </modal>

    <!-- Custom Interval Modal -->
    <modal v-if="showCustomIntervalModal">
      <div class="custom-interval-modal">
        <h4>Custom Interval</h4>
        <div class="interval-input">
          <div class="form-group">
            <label>Take every</label>
            <div class="interval-controls">
              <input 
                type="number" 
                v-model="customInterval.value"
                min="1"
                class="interval-value"
              />
              <select v-model="customInterval.unit">
                <option value="days">days</option>
                <option value="weeks">weeks</option>
                <option value="months">months</option>
              </select>
            </div>
          </div>
        </div>
        <div class="modal-actions">
          <BaseButton @click="applyCustomInterval" variant="primary">Apply</BaseButton>
          <BaseButton @click="showCustomIntervalModal = false" variant="secondary">Cancel</BaseButton>
        </div>
      </div>
    </modal>

    <!-- Custom Schedule Summary -->
    <div v-if="schedule.type === 'custom' && !showCustomIntervalModal" class="custom-schedule-summary">
      <p class="schedule-text">{{ formatSchedule(schedule) }}</p>
      <BaseButton 
        variant="secondary" 
        size="small"
        @click="showCustomIntervalModal = true"
      >
        Edit Schedule
      </BaseButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import BaseButton from './BaseButton.vue';
import type { MedicationDose, FrequencySchedule, TimeOfDay, IntervalUnit, ScheduleType } from '../types/medication';

const currentStep = ref(1);
const showCustomTimeModal = ref(false);
const showCustomIntervalModal = ref(false);

const medication = ref({
  name: '',
  notes: ''
});

const dose = ref({
  amount: 0,
  unit: 'mg',
  route: 'oral'
});

const schedule = ref<FrequencySchedule>({
  type: 'daily' as ScheduleType,
  timesOfDay: [],
  daysOfWeek: [],
  daysOfMonth: []
});

const commonPatterns = [
  { id: 'once-daily', label: 'Once Daily', schedule: {
    type: 'daily',
    timesOfDay: [],
    isFlexible: true
  }},
  { id: 'twice-daily', label: 'Twice Daily', schedule: {
    type: 'daily',
    timesOfDay: [
      { hour: 8, minute: 0, label: 'Morning' },
      { hour: 20, minute: 0, label: 'Evening' }
    ]
  }},
  { id: 'three-daily', label: 'Three Times Daily', schedule: {
    type: 'daily',
    timesOfDay: [
      { hour: 8, minute: 0, label: 'Morning' },
      { hour: 14, minute: 0, label: 'Afternoon' },
      { hour: 20, minute: 0, label: 'Evening' }
    ]
  }}
];

const commonTimes = [
  { hour: 8, minute: 0, label: 'Morning' },
  { hour: 12, minute: 0, label: 'Noon' },
  { hour: 14, minute: 0, label: 'Afternoon' },
  { hour: 18, minute: 0, label: 'Evening' },
  { hour: 22, minute: 0, label: 'Bedtime' }
];

const daysOfWeek = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' }
];

const customTime = ref({
  time: '',
  label: ''
});

const customInterval = ref({
  value: 1,
  unit: 'days' as IntervalUnit
});

// Methods for managing schedule
const applyPattern = (pattern: any) => {
  schedule.value = { ...pattern.schedule };
  // Hide custom interval modal when selecting a different pattern
  showCustomIntervalModal.value = false;
};

const isPatternActive = (pattern: any) => {
  // Compare current schedule with pattern
  return JSON.stringify(schedule.value) === JSON.stringify(pattern.schedule);
};

const toggleTime = (time: TimeOfDay) => {
  const index = schedule.value.timesOfDay.findIndex(t => 
    t.hour === time.hour && t.minute === time.minute
  );
  
  if (index === -1) {
    schedule.value.timesOfDay.push(time);
  } else {
    schedule.value.timesOfDay.splice(index, 1);
  }
};

const isTimeSelected = (time: TimeOfDay) => {
  return schedule.value.timesOfDay.some(t => 
    t.hour === time.hour && t.minute === time.minute
  );
};

const toggleDay = (day: number) => {
  const index = schedule.value.daysOfWeek?.indexOf(day) ?? -1;
  if (!schedule.value.daysOfWeek) schedule.value.daysOfWeek = [];
  
  if (index === -1) {
    schedule.value.daysOfWeek.push(day);
  } else {
    schedule.value.daysOfWeek.splice(index, 1);
  }
};

const isDaySelected = (day: number) => {
  return schedule.value.daysOfWeek?.includes(day) ?? false;
};

const addCustomTime = () => {
  const [hours, minutes] = customTime.value.time.split(':');
  schedule.value.timesOfDay.push({
    hour: parseInt(hours),
    minute: parseInt(minutes),
    label: customTime.value.label || `Custom (${customTime.value.time})`
  });
  showCustomTimeModal.value = false;
  customTime.value = { time: '', label: '' };
};

const isOnceDailySelected = computed(() => {
  return schedule.value.type === 'daily' && 
         schedule.value.isFlexible === true;
});

const setOnceDailyTime = (time: TimeOfDay) => {
  if (isTimeSelected(time)) {
    schedule.value.timesOfDay = [];
  } else {
    schedule.value.timesOfDay = [time];
  }
};

const openCustomInterval = () => {
  // Reset the schedule to a custom type
  schedule.value = {
    type: 'custom' as ScheduleType,
    timesOfDay: [],
    daysOfWeek: [],
    daysOfMonth: []
  };
  showCustomIntervalModal.value = true;
};

const applyCustomInterval = () => {
  const interval = customInterval.value;
  schedule.value = {
    type: 'custom' as ScheduleType,
    timesOfDay: [],
    customPattern: `Every ${interval.value} ${interval.unit}`,
    intervalValue: interval.value,
    intervalUnit: interval.unit as IntervalUnit,
    isFlexible: true
  };
  showCustomIntervalModal.value = false;
};

// Formatting helpers
const formatTime = (time: TimeOfDay) => {
  return new Date(0, 0, 0, time.hour, time.minute)
    .toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

const formatDose = (dose: any) => {
  return `${dose.amount} ${dose.unit} ${dose.route}`;
};

const formatSchedule = (schedule: FrequencySchedule) => {
  switch (schedule.type) {
    case 'daily':
      if (schedule.isFlexible && schedule.timesOfDay.length === 0) {
        return 'Once daily (flexible timing)';
      }
      return `Daily at ${formatTimes(schedule.timesOfDay)}`;
    case 'weekly':
      const days = schedule.daysOfWeek
        ?.map(d => daysOfWeek[d].label)
        .join(', ');
      return `${days} at ${formatTimes(schedule.timesOfDay)}`;
    case 'monthly':
      const monthDays = schedule.daysOfMonth?.join(', ');
      return `Monthly on day(s) ${monthDays} at ${formatTimes(schedule.timesOfDay)}`;
    case 'custom':
      if (schedule.intervalValue === 1) {
        return `Every ${schedule.intervalUnit?.slice(0, -1)}`; // Remove 's' from end
      }
      return `Every ${schedule.intervalValue} ${schedule.intervalUnit}`;
    default:
      return 'Custom schedule';
  }
};

const formatTimes = (times: TimeOfDay[]) => {
  return times.map(t => t.label || formatTime(t)).join(', ');
};

// Validation
const canProceed = computed(() => {
  switch (currentStep.value) {
    case 1:
      return medication.value.name && dose.value.amount > 0;
    case 2:
      if (schedule.value.type === 'custom') {
        return true; // Custom intervals don't require time selection
      }
      return schedule.value.type === 'daily' || schedule.value.timesOfDay.length > 0;
    default:
      return true;
  }
});

const isValid = computed(() => {
  if (schedule.value.type === 'custom') {
    return medication.value.name && 
           dose.value.amount > 0 && 
           schedule.value.intervalValue && 
           schedule.value.intervalUnit;
  }
  return (
    medication.value.name &&
    dose.value.amount > 0 &&
    (schedule.value.type === 'daily' || schedule.value.timesOfDay.length > 0)
  );
});

// Save the medication schedule
const save = () => {
  const medicationSchedule = {
    medication: medication.value,
    dose: dose.value,
    schedule: schedule.value
  };
  
  emit('save', medicationSchedule);
};

const emit = defineEmits(['save']);

const isWeeklySchedule = computed(() => schedule.value.type === 'weekly');
</script>

<style scoped>
.medication-scheduler {
  max-width: 600px;
  margin: 0 auto;
  padding: 1rem;
}

.step {
  margin-bottom: 2rem;
}

.form-group {
  margin-bottom: 1rem;
}

.quick-patterns {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}

.quick-patterns :deep(.base-button) {
  background-color: white;
}

.quick-patterns :deep(.base-button.active) {
  background-color: #3b82f6;
  color: white;
  border-color: #2563eb;
}

.quick-patterns :deep(.base-button.active:hover) {
  background-color: #2563eb;
}

.time-chips {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}

.time-chip {
  padding: 0.5rem 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  cursor: pointer;
  background: white;
  transition: all 0.2s;
}

.time-chip.active {
  background: #3b82f6;
  color: white;
  border-color: #2563eb;
}

.time-detail {
  font-size: 0.8rem;
  opacity: 0.8;
}

.day-chips {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.day-chip {
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #e2e8f0;
  border-radius: 50%;
  cursor: pointer;
}

.day-chip.active {
  background: #3b82f6;
  color: white;
}

.schedule-summary {
  padding: 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
}

.step-navigation {
  display: flex;
  justify-content: space-between;
  margin-top: 2rem;
}

.custom-time-modal {
  padding: 1rem;
}

.time-input {
  display: flex;
  gap: 1rem;
  margin: 1rem 0;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}

.interval-input {
  margin: 1rem 0;
}

.interval-controls {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.interval-value {
  width: 4rem;
  padding: 0.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
}

.help-text {
  font-size: 0.875rem;
  color: #64748b;
  margin-top: 0.5rem;
}

.custom-interval-modal {
  padding: 1.5rem;
  max-width: 400px;
  margin: 0 auto;
}

.interval-controls {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin-top: 0.5rem;
}

.interval-value {
  width: 4rem;
  padding: 0.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
}

.custom-schedule-summary {
  margin-top: 1rem;
  padding: 1rem;
  background-color: #f8fafc;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.custom-schedule-summary .schedule-text {
  margin: 0;
  font-weight: 500;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1.5rem;
}
</style> 
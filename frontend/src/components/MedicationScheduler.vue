<template>
  <div class="medication-scheduler">
    <!-- Step 1: Basic Info -->
    <div class="step" v-if="currentStep === 1">
      <h3 class="step__title">Medication Details</h3>
      <div class="form-group">
        <label class="form-label">Medication Name</label>
        <input 
          v-model="medication.name" 
          type="text" 
          placeholder="Enter medication name"
          class="input"
        />
      </div>
      <div class="form-group">
        <label class="form-label">Dose Amount</label>
        <div class="dose-input">
          <input 
            v-model="dose.amount" 
            type="number" 
            step="0.01"
            class="input dose-input__amount" 
          />
          <select v-model="dose.unit" class="input dose-input__unit">
            <option value="mg">mg</option>
            <option value="mcg">mcg</option>
            <option value="ml">ml</option>
            <option value="pill">pill(s)</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">How do you take this medication?</label>
        <select v-model="dose.route" class="input">
          <option value="oral">By mouth</option>
          <option value="injection">Injection</option>
          <option value="topical">On skin</option>
          <option value="inhaled">Inhaled</option>
        </select>
      </div>
    </div>

    <!-- Step 2: Frequency Pattern -->
    <div class="step" v-if="currentStep === 2">
      <h3 class="step__title">How often do you take this medication?</h3>
      
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

      <!-- Once Daily Time Selection -->
      <div v-if="isOnceDailySelected && !showCustomIntervalModal" class="time-selection">
        <h4 class="time-selection__title">General time of day (optional)</h4>
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
        <div class="form-group">
          <label class="form-label">Frequency Type</label>
          <select v-model="schedule.type" class="input">
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="custom">Custom Pattern</option>
          </select>
        </div>

        <!-- Daily Times -->
        <div class="times-of-day">
          <h4 class="times-of-day__title">Times of Day</h4>
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
          <BaseButton 
            variant="secondary"
            size="small"
            @click="showCustomTimeModal = true"
          >
            + Add Custom Time
          </BaseButton>
        </div>

        <!-- Weekly/Monthly Options -->
        <div v-if="isWeeklySchedule && !showCustomIntervalModal" class="day-selector">
          <h4 class="day-selector__title">Which days of the week?</h4>
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
      <h3 class="step__title">Review Schedule</h3>
      <div class="schedule-summary">
        <h4 class="schedule-summary__title">{{ medication.name }}</h4>
        <p class="schedule-summary__dose">{{ formatDose(dose) }}</p>
        <p class="schedule-summary__schedule">{{ formatSchedule(schedule) }}</p>
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

    <!-- Modals -->
    <modal v-if="showCustomTimeModal" class="modal">
      <div class="modal__content">
        <h4 class="modal__title">Add Custom Time</h4>
        <div class="form-group">
          <input 
            type="time" 
            v-model="customTime.time"
            class="input"
          />
          <input 
            type="text" 
            v-model="customTime.label"
            placeholder="Label (e.g., 'With lunch')"
            class="input"
          />
        </div>
        <div class="modal__actions">
          <BaseButton @click="addCustomTime" variant="primary">Add</BaseButton>
          <BaseButton @click="showCustomTimeModal = false" variant="secondary">Cancel</BaseButton>
        </div>
      </div>
    </modal>

    <modal v-if="showCustomIntervalModal" class="modal">
      <div class="modal__content">
        <h4 class="modal__title">Custom Interval</h4>
        <div class="form-group">
          <label class="form-label">Take every</label>
          <div class="interval-input">
            <input 
              type="number" 
              v-model="customInterval.value"
              min="1"
              class="input interval-input__value"
            />
            <select v-model="customInterval.unit" class="input interval-input__unit">
              <option value="days">days</option>
              <option value="weeks">weeks</option>
              <option value="months">months</option>
            </select>
          </div>
        </div>
        <div class="modal__actions">
          <BaseButton @click="applyCustomInterval" variant="primary">Apply</BaseButton>
          <BaseButton @click="showCustomIntervalModal = false" variant="secondary">Cancel</BaseButton>
        </div>
      </div>
    </modal>
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
  max-width: var(--container-md);
  margin: 0 auto;
}

.step {
  margin-bottom: var(--space-8);
}

.step__title {
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
  color: var(--text-primary);
  margin-bottom: var(--space-6);
}

.form-group {
  margin-bottom: var(--space-4);
}

.form-label {
  display: block;
  font-weight: var(--font-medium);
  color: var(--text-secondary);
  margin-bottom: var(--space-2);
}

.dose-input {
  display: flex;
  gap: var(--space-2);
}

.dose-input__amount {
  width: 120px;
}

.dose-input__unit {
  width: 100px;
}

.quick-patterns {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
  margin-bottom: var(--space-6);
}

.time-selection {
  margin-top: var(--space-6);
}

.time-selection__title {
  font-size: var(--text-lg);
  font-weight: var(--font-medium);
  color: var(--text-primary);
  margin-bottom: var(--space-4);
}

.time-chips,
.day-chips {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
  margin-bottom: var(--space-4);
}

.time-chip,
.day-chip {
  padding: var(--space-2) var(--space-4);
  border: 1px solid var(--border-medium);
  border-radius: var(--radius-md);
  background: var(--surface-secondary);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-base);
}

.time-chip.active,
.day-chip.active {
  background: var(--primary-500);
  color: white;
  border-color: var(--primary-600);
}

.time-detail {
  font-size: var(--text-sm);
  opacity: 0.8;
  margin-left: var(--space-2);
}

.help-text {
  font-size: var(--text-sm);
  color: var(--text-tertiary);
  margin-top: var(--space-2);
}

.times-of-day,
.day-selector {
  margin-top: var(--space-6);
}

.times-of-day__title,
.day-selector__title {
  font-size: var(--text-lg);
  font-weight: var(--font-medium);
  color: var(--text-primary);
  margin-bottom: var(--space-4);
}

.schedule-summary {
  padding: var(--space-4);
  background: var(--surface-secondary);
  border-radius: var(--radius-lg);
}

.schedule-summary__title {
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
  color: var(--text-primary);
  margin-bottom: var(--space-2);
}

.schedule-summary__dose {
  color: var(--text-secondary);
  margin-bottom: var(--space-2);
}

.schedule-summary__schedule {
  color: var(--text-primary);
}

.step-navigation {
  display: flex;
  justify-content: space-between;
  margin-top: var(--space-8);
}

.modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal__content {
  background: var(--surface-primary);
  padding: var(--space-6);
  border-radius: var(--radius-lg);
  width: 100%;
  max-width: 400px;
  box-shadow: var(--shadow-lg);
}

.modal__title {
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
  color: var(--text-primary);
  margin-bottom: var(--space-4);
}

.modal__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
  margin-top: var(--space-6);
}

.interval-input {
  display: flex;
  gap: var(--space-2);
  align-items: center;
}

.interval-input__value {
  width: 80px;
}

.interval-input__unit {
  width: 120px;
}
</style> 
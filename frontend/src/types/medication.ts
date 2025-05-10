export type ScheduleType = 'daily' | 'weekly' | 'monthly' | 'custom';
export type IntervalUnit = 'days' | 'weeks' | 'months';

export interface TimeOfDay {
  hour: number;
  minute: number;
  label?: string;
}

export interface FrequencySchedule {
  type: ScheduleType;
  timesOfDay: TimeOfDay[];
  daysOfWeek?: number[];
  daysOfMonth?: number[];
  customPattern?: string;
  isFlexible?: boolean;
  intervalValue?: number;
  intervalUnit?: IntervalUnit;
}

export interface Dose {
  amount: number;
  unit: string;
  route: string;
}

export interface MedicationDose {
  id: number;
  dose: Dose;
  frequency: FrequencySchedule;
  startDate: string;
  endDate?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Medication {
  id: number;
  name: string;
  isPrescription: boolean;
  startDate: string;
  endDate?: string;
  notes?: string; // general notes
  doses: MedicationDose[];
  created_at?: string;
  updated_at?: string;
}

// For creating a new medication
export interface CreateMedicationInput {
  name: string;
  isPrescription: boolean;
  startDate: string;
  endDate?: string;
  notes?: string;
  initialDose: {
    dose: Dose;
    frequency: FrequencySchedule;
    startDate?: string;
    endDate?: string;
    notes?: string;
  };
}

// For adding a new dose to an existing medication
export interface CreateMedicationDoseInput {
  dose: Dose;
  frequency: FrequencySchedule;
  startDate: string;
  endDate?: string;
  notes?: string;
}

export interface MedicationSchedule {
  medication: Medication;
  dose: Dose;
  schedule: FrequencySchedule;
}

export interface MedicationEvent {
  id?: string;
  medicationId?: string;
  type: 'start' | 'modify' | 'stop';
  dose: MedicationDose;
  effectiveDate: string;
  notes?: string;
} 
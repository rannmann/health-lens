export interface TimeOfDay {
  hour: number;
  minute: number;
  label: string;
}

export type ScheduleType = 'daily' | 'weekly' | 'monthly' | 'custom';
export type IntervalUnit = 'days' | 'weeks' | 'months';

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

export interface Medication {
  name: string;
  notes?: string;
}

export interface Dose {
  amount: number;
  unit: string;
  route: string;
}

export interface MedicationSchedule {
  medication: Medication;
  dose: Dose;
  schedule: FrequencySchedule;
}

export interface MedicationDose {
  amount: number;
  unit: string;
  route: string;
  timing: FrequencySchedule;
}

export interface MedicationEvent {
  id?: string;
  medicationId?: string;
  type: 'start' | 'modify' | 'stop';
  dose: MedicationDose;
  effectiveDate: string;
  notes?: string;
} 
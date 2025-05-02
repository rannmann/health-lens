import express, { Request, Response } from 'express';
import db from '../config/database';
import { format, parseISO } from 'date-fns';
import type { MedicationSchedule } from '../../frontend/src/types/medication';

const router = express.Router();

// Get all medications for a user within a date range
router.get('/:userId', async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;

    try {
        const medications = db.prepare(`
            SELECT * FROM medication_event 
            WHERE user_id = ? 
            AND timestamp BETWEEN ? AND ?
            ORDER BY timestamp DESC
        `).all(userId, startDate, endDate);

        res.json(medications);
    } catch (error) {
        console.error('Error fetching medications:', error);
        res.status(500).json({ error: 'Failed to fetch medications' });
    }
});

// Add a new medication event
router.post('/:userId', async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { name, action, dose, notes, timestamp } = req.body;

    try {
        const formattedTimestamp = timestamp || format(new Date(), "yyyy-MM-dd'T'HH:mm:ss");

        db.prepare(`
            INSERT INTO medication_event (
                user_id, timestamp, name, action, dose, notes
            ) VALUES (?, ?, ?, ?, ?, ?)
        `).run(userId, formattedTimestamp, name, action, dose, notes);

        res.json({ success: true });
    } catch (error) {
        console.error('Error adding medication:', error);
        res.status(500).json({ error: 'Failed to add medication' });
    }
});

// Update a medication event
router.put('/:userId/:timestamp/:name', async (req: Request, res: Response) => {
    const { userId, timestamp, name } = req.params;
    const { action, dose, notes } = req.body;

    try {
        db.prepare(`
            UPDATE medication_event 
            SET action = ?, dose = ?, notes = ?
            WHERE user_id = ? AND timestamp = ? AND name = ?
        `).run(action, dose, notes, userId, timestamp, name);

        res.json({ success: true });
    } catch (error) {
        console.error('Error updating medication:', error);
        res.status(500).json({ error: 'Failed to update medication' });
    }
});

// Delete a medication event
router.delete('/:userId/:timestamp/:name', async (req: Request, res: Response) => {
    const { userId, timestamp, name } = req.params;

    try {
        db.prepare(`
            DELETE FROM medication_event 
            WHERE user_id = ? AND timestamp = ? AND name = ?
        `).run(userId, timestamp, name);

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting medication:', error);
        res.status(500).json({ error: 'Failed to delete medication' });
    }
});

// Get all medications
router.get('/', async (req, res) => {
  try {
    const medications = await db.all(`
      SELECT 
        m.id,
        m.name,
        m.notes,
        m.dose_amount as "dose.amount",
        m.dose_unit as "dose.unit",
        m.dose_route as "dose.route",
        m.schedule_type as "schedule.type",
        m.schedule_times as "schedule.timesOfDay",
        m.schedule_days as "schedule.daysOfWeek",
        m.schedule_month_days as "schedule.daysOfMonth",
        m.schedule_custom_pattern as "schedule.customPattern",
        m.schedule_is_flexible as "schedule.isFlexible",
        m.schedule_interval_value as "schedule.intervalValue",
        m.schedule_interval_unit as "schedule.intervalUnit"
      FROM medications m
      WHERE user_id = ?
      ORDER BY m.name
    `, ['default_user']); // TODO: Replace with actual user ID

    // Parse JSON fields
    const parsedMedications = medications.map(med => ({
      id: med.id,
      name: med.name,
      notes: med.notes,
      dose: {
        amount: med['dose.amount'],
        unit: med['dose.unit'],
        route: med['dose.route']
      },
      schedule: {
        type: med['schedule.type'],
        timesOfDay: JSON.parse(med['schedule.timesOfDay'] || '[]'),
        daysOfWeek: JSON.parse(med['schedule.daysOfWeek'] || '[]'),
        daysOfMonth: JSON.parse(med['schedule.daysOfMonth'] || '[]'),
        customPattern: med['schedule.customPattern'],
        isFlexible: med['schedule.isFlexible'],
        intervalValue: med['schedule.intervalValue'],
        intervalUnit: med['schedule.intervalUnit']
      }
    }));

    res.json(parsedMedications);
  } catch (error) {
    console.error('Error fetching medications:', error);
    res.status(500).json({ error: 'Failed to fetch medications' });
  }
});

// Add new medication
router.post('/', async (req, res) => {
  try {
    const medicationSchedule: MedicationSchedule = req.body;
    const { medication, dose, schedule } = medicationSchedule;

    const result = await db.run(`
      INSERT INTO medications (
        user_id,
        name,
        notes,
        dose_amount,
        dose_unit,
        dose_route,
        schedule_type,
        schedule_times,
        schedule_days,
        schedule_month_days,
        schedule_custom_pattern,
        schedule_is_flexible,
        schedule_interval_value,
        schedule_interval_unit
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'default_user', // TODO: Replace with actual user ID
      medication.name,
      medication.notes,
      dose.amount,
      dose.unit,
      dose.route,
      schedule.type,
      JSON.stringify(schedule.timesOfDay),
      JSON.stringify(schedule.daysOfWeek),
      JSON.stringify(schedule.daysOfMonth),
      schedule.customPattern,
      schedule.isFlexible,
      schedule.intervalValue,
      schedule.intervalUnit
    ]);

    const newMedication = {
      id: result.lastID,
      ...medication,
      dose,
      schedule
    };

    res.status(201).json(newMedication);
  } catch (error) {
    console.error('Error adding medication:', error);
    res.status(500).json({ error: 'Failed to add medication' });
  }
});

// Delete medication
router.delete('/:id', async (req, res) => {
  try {
    await db.run('DELETE FROM medications WHERE id = ? AND user_id = ?', [
      req.params.id,
      'default_user' // TODO: Replace with actual user ID
    ]);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting medication:', error);
    res.status(500).json({ error: 'Failed to delete medication' });
  }
});

export const medicationsRouter = router; 
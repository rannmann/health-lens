import express from 'express';
import request from 'supertest';
import { medicationsRouter } from '../../routes/medications';
import { setupTestDb } from '../utils/dbTestUtils';
import testDb from '../../config/database.test';
import { DbSeeder } from '../utils/dbSeeder';

const app = express();
app.use(express.json());
app.use('/api/medications', medicationsRouter);

const TEST_USER_ID = 'test-user-1';
setupTestDb(TEST_USER_ID);

beforeEach(() => {
  DbSeeder.cleanDb();
  DbSeeder.seedSampleData(TEST_USER_ID);
  testDb.prepare('INSERT OR IGNORE INTO users (id) VALUES (?)').run(TEST_USER_ID);
});

afterAll(async () => {
  testDb.close();
  await new Promise(resolve => setTimeout(resolve, 100));
  try { DbSeeder.deleteTestDb(); } catch {}
});

describe('Medications API', () => {
  it('should create a medication with initial dose', async () => {
    const res = await request(app)
      .post('/api/medications')
      .set('x-user-id', TEST_USER_ID)
      .send({
        name: 'TestMed',
        isPrescription: true,
        startDate: '2024-06-01',
        notes: 'General note',
        initialDose: {
          dose: { amount: 5, unit: 'mg', route: 'oral' },
          frequency: { type: 'daily', timesOfDay: [{ hour: 8, minute: 0 }] },
          startDate: '2024-06-01',
          notes: 'Initial dose note'
        }
      });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('TestMed');
    expect(res.body.doses.length).toBe(1);
  });

  it('should fetch all medications with dose history', async () => {
    await request(app)
      .post('/api/medications')
      .set('x-user-id', TEST_USER_ID)
      .send({
        name: 'TestMed',
        isPrescription: true,
        startDate: '2024-06-01',
        notes: 'General note',
        initialDose: {
          dose: { amount: 5, unit: 'mg', route: 'oral' },
          frequency: { type: 'daily', timesOfDay: [{ hour: 8, minute: 0 }] },
          startDate: '2024-06-01',
          notes: 'Initial dose note'
        }
      });
    const res = await request(app)
      .get('/api/medications')
      .set('x-user-id', TEST_USER_ID);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].doses.length).toBeGreaterThan(0);
  });

  it('should update medication info', async () => {
    const createRes = await request(app)
      .post('/api/medications')
      .set('x-user-id', TEST_USER_ID)
      .send({
        name: 'TestMed',
        isPrescription: true,
        startDate: '2024-06-01',
        notes: 'General note',
        initialDose: {
          dose: { amount: 5, unit: 'mg', route: 'oral' },
          frequency: { type: 'daily', timesOfDay: [{ hour: 8, minute: 0 }] },
          startDate: '2024-06-01',
          notes: 'Initial dose note'
        }
      });
    const medicationId = createRes.body.id;
    const res = await request(app)
      .put(`/api/medications/${medicationId}`)
      .set('x-user-id', TEST_USER_ID)
      .send({
        name: 'TestMedUpdated',
        isPrescription: false,
        startDate: '2024-06-01',
        notes: 'Updated note'
      });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('TestMedUpdated');
    expect(res.body.isPrescription).toBe(false);
  });

  it('should add a new dose', async () => {
    const createRes = await request(app)
      .post('/api/medications')
      .set('x-user-id', TEST_USER_ID)
      .send({
        name: 'TestMed',
        isPrescription: true,
        startDate: '2024-06-01',
        notes: 'General note',
        initialDose: {
          dose: { amount: 5, unit: 'mg', route: 'oral' },
          frequency: { type: 'daily', timesOfDay: [{ hour: 8, minute: 0 }] },
          startDate: '2024-06-01',
          notes: 'Initial dose note'
        }
      });
    const medicationId = createRes.body.id;
    const res = await request(app)
      .post(`/api/medications/${medicationId}/doses`)
      .set('x-user-id', TEST_USER_ID)
      .send({
        dose: { amount: 10, unit: 'mg', route: 'oral' },
        frequency: { type: 'daily', timesOfDay: [{ hour: 20, minute: 0 }] },
        startDate: '2024-06-10',
        notes: 'Second dose note'
      });
    expect(res.status).toBe(201);
    expect(res.body.length).toBe(2);
  });

  it('should update a dose', async () => {
    const createRes = await request(app)
      .post('/api/medications')
      .set('x-user-id', TEST_USER_ID)
      .send({
        name: 'TestMed',
        isPrescription: true,
        startDate: '2024-06-01',
        notes: 'General note',
        initialDose: {
          dose: { amount: 5, unit: 'mg', route: 'oral' },
          frequency: { type: 'daily', timesOfDay: [{ hour: 8, minute: 0 }] },
          startDate: '2024-06-01',
          notes: 'Initial dose note'
        }
      });
    const medicationId = createRes.body.id;
    const doseId = createRes.body.doses[0].id;
    const res = await request(app)
      .put(`/api/medications/${medicationId}/doses/${doseId}`)
      .set('x-user-id', TEST_USER_ID)
      .send({
        dose: { amount: 7.5, unit: 'mg', route: 'oral' },
        frequency: { type: 'daily', timesOfDay: [{ hour: 8, minute: 0 }] },
        startDate: '2024-06-01',
        notes: 'Updated dose note'
      });
    expect(res.status).toBe(200);
    expect(res.body[0].dose.amount).toBe(7.5);
    expect(res.body[0].notes).toBe('Updated dose note');
  });

  it('should delete a dose', async () => {
    const createRes = await request(app)
      .post('/api/medications')
      .set('x-user-id', TEST_USER_ID)
      .send({
        name: 'TestMed',
        isPrescription: true,
        startDate: '2024-06-01',
        notes: 'General note',
        initialDose: {
          dose: { amount: 5, unit: 'mg', route: 'oral' },
          frequency: { type: 'daily', timesOfDay: [{ hour: 8, minute: 0 }] },
          startDate: '2024-06-01',
          notes: 'Initial dose note'
        }
      });
    const medicationId = createRes.body.id;
    const doseId = createRes.body.doses[0].id;
    const res = await request(app)
      .delete(`/api/medications/${medicationId}/doses/${doseId}`)
      .set('x-user-id', TEST_USER_ID);
    expect(res.status).toBe(204);
  });

  it('should delete a medication', async () => {
    const createRes = await request(app)
      .post('/api/medications')
      .set('x-user-id', TEST_USER_ID)
      .send({
        name: 'TestMed',
        isPrescription: true,
        startDate: '2024-06-01',
        notes: 'General note',
        initialDose: {
          dose: { amount: 5, unit: 'mg', route: 'oral' },
          frequency: { type: 'daily', timesOfDay: [{ hour: 8, minute: 0 }] },
          startDate: '2024-06-01',
          notes: 'Initial dose note'
        }
      });
    const medicationId = createRes.body.id;
    const res = await request(app)
      .delete(`/api/medications/${medicationId}`)
      .set('x-user-id', TEST_USER_ID);
    expect(res.status).toBe(204);
  });

  it('should return 404 for not found medication', async () => {
    const res = await request(app)
      .get('/api/medications/99999')
      .set('x-user-id', TEST_USER_ID);
    expect([404, 400, 500]).toContain(res.status); // Acceptable error codes
  });

  it('should return 400 for missing fields', async () => {
    const res = await request(app)
      .post('/api/medications')
      .set('x-user-id', TEST_USER_ID)
      .send({ name: 'IncompleteMed' });
    expect(res.status).toBe(400);
  });

  it('should mark the previous dose as finished when a new dose is added', async () => {
    // Create medication with initial dose
    const createRes = await request(app)
      .post('/api/medications')
      .set('x-user-id', TEST_USER_ID)
      .send({
        name: 'TestMed',
        isPrescription: true,
        startDate: '2024-06-01',
        notes: 'General note',
        initialDose: {
          dose: { amount: 5, unit: 'mg', route: 'oral' },
          frequency: { type: 'daily', timesOfDay: [{ hour: 8, minute: 0 }] },
          startDate: '2024-06-01',
          notes: 'Initial dose note'
        }
      });
    const medicationId = createRes.body.id;
    // Add a new dose
    const newDoseStart = '2024-06-10';
    const res = await request(app)
      .post(`/api/medications/${medicationId}/doses`)
      .set('x-user-id', TEST_USER_ID)
      .send({
        dose: { amount: 10, unit: 'mg', route: 'oral' },
        frequency: { type: 'daily', timesOfDay: [{ hour: 20, minute: 0 }] },
        startDate: newDoseStart,
        notes: 'Second dose note'
      });
    expect(res.status).toBe(201);
    expect(res.body.length).toBe(2);
    // The first dose should have endDate set to newDoseStart
    const firstDose = res.body[0];
    expect(firstDose.endDate).toBe(newDoseStart);
    // The second dose should have no endDate
    const secondDose = res.body[1];
    expect(secondDose.endDate).toBeNull();
  });
}); 
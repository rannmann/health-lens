import { describe, test, expect, beforeAll, beforeEach, afterAll, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fitbitRouter } from '../../routes/fitbit';
import testDb from '../../config/database.test';
import { DbSeeder } from '../utils/dbSeeder';
import * as fitbitService from '../../services/fitbit/fitbitService';

jest.mock('../../config/database', () => ({
  __esModule: true,
  default: require('../../config/database.test').default || require('../../config/database.test')
}));

const app = express();
app.use(express.json());
app.use('/api/fitbit', fitbitRouter);

const TEST_USER_ID = 'test123';

// Helper to load mock data
function loadMock(filename: string) {
  return JSON.parse(
    fs.readFileSync(path.join(__dirname, '../mocks/fitbit', filename), 'utf-8')
  );
}

describe('Fitbit Router', () => {
  beforeAll(async () => {
    await DbSeeder.initializeTestDb(TEST_USER_ID);
  });

  afterAll(async () => {
    testDb.close();
    await new Promise(resolve => setTimeout(resolve, 100));
    try { DbSeeder.deleteTestDb(); } catch {}
  });

  beforeEach(async () => {
    DbSeeder.cleanDb();
    DbSeeder.seedSampleData(TEST_USER_ID);
    testDb.prepare('INSERT OR IGNORE INTO users (id) VALUES (?)').run(TEST_USER_ID);
    // Insert a minimal fitbit_connections row for the test user
    testDb.prepare(`INSERT OR IGNORE INTO fitbit_connections (user_id, fitbit_user_id, access_token, refresh_token, expires_at, scope) VALUES (?, ?, ?, ?, ?, ?)`)
      .run(TEST_USER_ID, 'fake-fitbit-user', 'fake-token', 'fake-refresh', '2099-01-01T00:00:00', 'test-scope');
    jest.restoreAllMocks();
    jest.spyOn(fitbitService, 'getValidAccessToken').mockResolvedValue({
      access_token: 'fake-token',
      fitbit_user_id: 'fake-fitbit-user'
    });
    // Patch endpointFetchers to use the mocked fetchers for all endpoints
    fitbitService.endpointFetchers.steps = jest.fn<
      (fitbit_user_id: string, access_token: string, startDate: string, endDate: string, userId: string) => Promise<any>
    >().mockResolvedValue(loadMock('activities.steps.json'));
    fitbitService.endpointFetchers.heart = jest.fn<
      (fitbit_user_id: string, access_token: string, startDate: string, endDate: string, userId: string) => Promise<any>
    >().mockResolvedValue(loadMock('activities.heart.json'));
    fitbitService.endpointFetchers.azm = jest.fn<
      (fitbit_user_id: string, access_token: string, startDate: string, endDate: string, userId: string) => Promise<any>
    >().mockResolvedValue(loadMock('activities.active-zone-minutes.json'));
    fitbitService.endpointFetchers.sleep = jest.fn<
      (fitbit_user_id: string, access_token: string, startDate: string, endDate: string, userId: string) => Promise<any>
    >().mockResolvedValue(loadMock('sleep.json'));
    fitbitService.endpointFetchers.hrv = jest.fn<
      (fitbit_user_id: string, access_token: string, startDate: string, endDate: string, userId: string) => Promise<any>
    >().mockResolvedValue(loadMock('hrv.json'));
    fitbitService.endpointFetchers.spo2 = jest.fn<
      (fitbit_user_id: string, access_token: string, startDate: string, endDate: string, userId: string) => Promise<any>
    >().mockResolvedValue(loadMock('spo2.json'));
    fitbitService.endpointFetchers.temperature = jest.fn<
      (fitbit_user_id: string, access_token: string, startDate: string, endDate: string, userId: string) => Promise<any>
    >().mockResolvedValue(loadMock('temp.skin.json'));
    fitbitService.endpointFetchers.breathing = jest.fn<
      (fitbit_user_id: string, access_token: string, startDate: string, endDate: string, userId: string) => Promise<any>
    >().mockResolvedValue(loadMock('br.json'));
  });

  test('GET /api/fitbit/:userId/steps returns mocked steps data', async () => {
    const response = await request(app).get(`/api/fitbit/${TEST_USER_ID}/steps`);
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('activities-steps');
    expect(Array.isArray(response.body['activities-steps'])).toBe(true);
    expect(response.body['activities-steps'].length).toBeGreaterThan(0);
  });

  test('GET /api/fitbit/:userId/heart-rate returns mocked heart data', async () => {
    const response = await request(app).get(`/api/fitbit/${TEST_USER_ID}/heart-rate`);
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('activities-heart');
    expect(Array.isArray(response.body['activities-heart'])).toBe(true);
    expect(response.body['activities-heart'].length).toBeGreaterThan(0);
  });

  test('POST /api/fitbit/backfill/:userId starts backfill and returns success', async () => {
    const response = await request(app)
      .post(`/api/fitbit/backfill/${TEST_USER_ID}`)
      .send({ startDate: '2024-01-01' });
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('message', 'Backfill process started');
    expect(response.body).toHaveProperty('userId', TEST_USER_ID);
    // Do not check fetcher calls here, as backfill runs async
  });

  test('GET /api/fitbit/backfill-status/:userId returns progress', async () => {
    // Insert a fake progress row immediately before the request
    testDb.prepare(`INSERT INTO fitbit_sync_progress (user_id, endpoint, last_synced_date, status, updated_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`).run(
      TEST_USER_ID, 'steps', '2024-01-07', 'completed'
    );
    const response = await request(app).get(`/api/fitbit/backfill-status/${TEST_USER_ID}`);
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('progress');
    expect(Array.isArray(response.body.progress)).toBe(true);
    expect(response.body.progress.length).toBeGreaterThan(0);
    expect(response.body.progress[0]).toHaveProperty('endpoint', 'steps');
    expect(response.body.progress[0]).toHaveProperty('status', 'completed');
  });

  test('GET /api/fitbit/sync/:userId returns sync completed', async () => {
    // Insert a last summary row to allow sync, using INSERT OR IGNORE
    testDb.prepare(`INSERT OR IGNORE INTO daily_summary (user_id, date) VALUES (?, ?)`)
      .run(TEST_USER_ID, '2024-01-01');
    const response = await request(app).get(`/api/fitbit/sync/${TEST_USER_ID}`);
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('message', 'Sync completed');
    expect(fitbitService.endpointFetchers.steps).toHaveBeenCalled();
    expect(fitbitService.endpointFetchers.heart).toHaveBeenCalled();
  });

  test('GET /api/fitbit/:userId/sleep returns mocked sleep data', async () => {
    const response = await request(app).get(`/api/fitbit/${TEST_USER_ID}/sleep`);
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('sleep');
    expect(Array.isArray(response.body.sleep)).toBe(true);
    expect(response.body.sleep.length).toBeGreaterThan(0);
  });

  test('GET /api/fitbit/:userId/hrv returns mocked hrv data', async () => {
    const response = await request(app).get(`/api/fitbit/${TEST_USER_ID}/hrv`);
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('hrv');
    expect(Array.isArray(response.body.hrv)).toBe(true);
    expect(response.body.hrv.length).toBeGreaterThan(0);
  });

  test('GET /api/fitbit/:userId/spo2 returns mocked spo2 data', async () => {
    const response = await request(app).get(`/api/fitbit/${TEST_USER_ID}/spo2`);
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true); // spo2 mock is an array
    expect(response.body.length).toBeGreaterThan(0);
  });

  test('GET /api/fitbit/:userId/temperature returns mocked temperature data', async () => {
    const response = await request(app).get(`/api/fitbit/${TEST_USER_ID}/temperature`);
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('tempSkin');
    expect(Array.isArray(response.body.tempSkin)).toBe(true);
    expect(response.body.tempSkin.length).toBeGreaterThan(0);
  });

  test('GET /api/fitbit/:userId/azm returns mocked azm data', async () => {
    const response = await request(app).get(`/api/fitbit/${TEST_USER_ID}/azm`);
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('activities-active-zone-minutes');
    expect(Array.isArray(response.body['activities-active-zone-minutes'])).toBe(true);
    expect(response.body['activities-active-zone-minutes'].length).toBeGreaterThan(0);
  });

  test('GET /api/fitbit/:userId/breathing returns mocked breathing data', async () => {
    const response = await request(app).get(`/api/fitbit/${TEST_USER_ID}/breathing`);
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('br');
    expect(Array.isArray(response.body.br)).toBe(true);
    expect(response.body.br.length).toBeGreaterThan(0);
  });

  test('GET /api/fitbit/:userId/invalid-metric returns 400', async () => {
    const response = await request(app).get(`/api/fitbit/${TEST_USER_ID}/invalid-metric`);
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error', 'Invalid metric');
  });

  test('POST /api/fitbit/disconnect removes fitbit connection', async () => {
    // Insert a fitbit_connections row
    testDb.prepare(`INSERT OR IGNORE INTO fitbit_connections (user_id, fitbit_user_id, access_token, refresh_token, expires_at, scope) VALUES (?, ?, ?, ?, ?, ?)`)
      .run(TEST_USER_ID, 'fake-fitbit-user', 'fake-token', 'fake-refresh', '2099-01-01T00:00:00', 'test-scope');
    const response = await request(app)
      .post('/api/fitbit/disconnect')
      .send({ userId: TEST_USER_ID });
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    // Check that the row is deleted
    const row = testDb.prepare('SELECT * FROM fitbit_connections WHERE user_id = ?').get(TEST_USER_ID);
    expect(row).toBeUndefined();
  });

  test('GET /api/fitbit/status returns connected', async () => {
    // Insert a fitbit_connections row
    testDb.prepare(`INSERT OR IGNORE INTO fitbit_connections (user_id, fitbit_user_id, access_token, refresh_token, expires_at, scope, updated_at) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`)
      .run(TEST_USER_ID, 'fake-fitbit-user', 'fake-token', 'fake-refresh', '2099-01-01T00:00:00', 'test-scope');
    const response = await request(app).get('/api/fitbit/status').query({ userId: TEST_USER_ID });
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('connected', true);
    expect(response.body).toHaveProperty('lastSync');
  });

  test('GET /api/fitbit/status returns not connected for missing user', async () => {
    const response = await request(app).get('/api/fitbit/status').query({ userId: 'nonexistent' });
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('connected', false);
  });

  // Add more tests for other endpoints as needed, mocking their fetchers similarly
}); 
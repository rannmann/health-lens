import { describe, test, expect, beforeAll, beforeEach, afterAll, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fitbitRouter } from '../../routes/fitbit';
import testDb from '../../config/database.test';
import { DbSeeder } from '../utils/dbSeeder';
import * as fitbitService from '../../services/fitbit/fitbitService';

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
    jest.restoreAllMocks();
    jest.spyOn(fitbitService, 'getValidAccessToken').mockResolvedValue({
      access_token: 'fake-token',
      fitbit_user_id: 'fake-fitbit-user'
    });
    // Patch endpointFetchers to use the mocked fetchers
    fitbitService.endpointFetchers.steps = jest.fn<
      (fitbit_user_id: string, access_token: string, startDate: string, endDate: string, userId: string) => Promise<any>
    >().mockResolvedValue(loadMock('activities.steps.json'));
    fitbitService.endpointFetchers.heart = jest.fn<
      (fitbit_user_id: string, access_token: string, startDate: string, endDate: string, userId: string) => Promise<any>
    >().mockResolvedValue(loadMock('activities.heart.json'));
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

  // Add more tests for other endpoints as needed, mocking their fetchers similarly
}); 
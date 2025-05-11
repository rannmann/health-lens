import { describe, test, expect, beforeAll, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { DbSeeder } from '../utils/dbSeeder';
import { healthRouter } from '../../routes/health';
import testDb from '../../config/database.test';
import { setupTestDb } from '../utils/dbTestUtils';

// Create a test app instance
const app = express();
app.use(express.json());
app.use('/api/health', healthRouter);

// Test data
const TEST_USER_ID = 'test123';
const TEST_START_DATE = '2024-01-01';
const TEST_END_DATE = '2024-01-07';

setupTestDb(TEST_USER_ID);

describe('Health Router', () => {
  afterAll(async () => {
    // Close database connection
    testDb.close();
    
    // Wait a bit before trying to delete the file
    await new Promise(resolve => setTimeout(resolve, 100));
    
    try {
      DbSeeder.deleteTestDb();
    } catch (error) {
      console.warn('Could not delete test database file:', error);
    }
  });

  describe('GET /api/health/test', () => {
    test('should return 200 and router status', async () => {
      const response = await request(app)
        .get('/api/health/test')
        .set('x-user-id', TEST_USER_ID);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Health router is working');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('headers');
    });
  });

  describe('GET /api/health/metrics', () => {
    test('should return 400 if required parameters are missing', async () => {
      const response = await request(app)
        .get('/api/health/metrics')
        .set('x-user-id', TEST_USER_ID);
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Start date, end date, and metrics are required');
    });

    test('should return 400 if metrics are invalid', async () => {
      const response = await request(app)
        .get('/api/health/metrics')
        .set('x-user-id', TEST_USER_ID)
        .query({
          startDate: TEST_START_DATE,
          endDate: TEST_END_DATE,
          metrics: 'invalid_metric'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'No valid metrics requested');
    });

    test('should return data for valid metrics', async () => {
      const response = await request(app)
        .get('/api/health/metrics')
        .set('x-user-id', TEST_USER_ID)
        .query({
          startDate: TEST_START_DATE,
          endDate: TEST_END_DATE,
          metrics: 'hrv_rmssd,total_sleep'
        });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      const data = response.body.data;
      expect(data.length).toBeGreaterThan(0);
      expect(data[0]).toHaveProperty('date');
      expect(data[0]).toHaveProperty('hrv_rmssd', 45.6);
      expect(data[0]).toHaveProperty('total_sleep', 420);
      expect(data[1]).toHaveProperty('hrv_rmssd', 48.2);
      expect(data[1]).toHaveProperty('total_sleep', 480);
    });

    test('should handle non-existent user gracefully', async () => {
      const response = await request(app)
        .get('/api/health/metrics')
        .set('x-user-id', 'nonexistent')
        .query({
          startDate: TEST_START_DATE,
          endDate: TEST_END_DATE,
          metrics: 'hrv_rmssd,total_sleep'
        });
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Invalid user ID');
    });
  });
}); 
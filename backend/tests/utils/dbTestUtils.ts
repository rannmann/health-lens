import testDb from '../../config/database.test';
import { DbSeeder } from './dbSeeder';

/**
 * DRY utility to setup and teardown the test DB for Jest suites.
 * Call setupTestDb(TEST_USER_ID) at the top of your test file.
 */
export function setupTestDb(userId: string) {
  beforeAll(async () => {
    await DbSeeder.initializeTestDb(userId);
  });

  beforeEach(() => {
    DbSeeder.cleanDb();
    DbSeeder.seedSampleData(userId);
  });

  afterAll(async () => {
    testDb.close();
    await new Promise(resolve => setTimeout(resolve, 100));
    try {
      DbSeeder.deleteTestDb();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('Could not delete test database file:', error);
    }
  });
} 
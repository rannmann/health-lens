import db from '../config/database';
import { afterAll } from '@jest/globals';

// Clean up database connections after all tests
afterAll(async () => {
  db.close();
}); 
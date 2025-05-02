import prodDb from '../../config/database';
import testDb from '../../config/database.test';
import fs from 'fs';
import path from 'path';

interface SchemaRow {
  sql: string;
}

interface TableRow {
  name: string;
}

interface User {
  id: string;
  created_at?: string;
  last_login?: string | null;
}

interface DailySummary {
  user_id: string;
  date: string;
  hrv_rmssd: number | null;
  total_sleep: number | null;
  resting_hr: number | null;
  steps: number | null;
  deep_sleep: number | null;
  light_sleep: number | null;
  rem_sleep: number | null;
  wake_minutes: number | null;
  azm_total: number | null;
  azm_fatburn: number | null;
  azm_cardio: number | null;
  azm_peak: number | null;
  spo2_avg: number | null;
  breathing_rate: number | null;
  skin_temp_delta: number | null;
}

export class DbSeeder {
  /**
   * Copy schema from production to test database
   */
  static copySchema() {
    // Get schema from production database
    const schema = prodDb.prepare(`
      SELECT sql 
      FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `).all() as SchemaRow[];

    // Drop all existing tables in test database
    const tables = testDb.prepare(`
      SELECT name 
      FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `).all() as TableRow[];

    tables.forEach(({ name }) => {
      testDb.prepare(`DROP TABLE IF EXISTS ${name}`).run();
    });

    // Create tables in test database
    schema.forEach(({ sql }) => {
      if (sql) testDb.prepare(sql).run();
    });
  }

  /**
   * Copy a subset of data from production to test database
   */
  static seedData(options: {
    userId: string,
    startDate: string,
    endDate: string
  }) {
    const { userId, startDate, endDate } = options;

    // Copy user data
    const user = prodDb.prepare('SELECT * FROM users WHERE id = ?').get(userId) as User | undefined;
    if (user) {
      testDb.prepare('INSERT OR REPLACE INTO users (id) VALUES (?)')
        .run(user.id);
    }

    // Copy daily summary data
    const dailySummaries = prodDb.prepare(`
      SELECT * FROM daily_summary 
      WHERE user_id = ? AND date BETWEEN ? AND ?
    `).all(userId, startDate, endDate) as DailySummary[];

    const insertSummary = testDb.prepare(`
      INSERT OR REPLACE INTO daily_summary (
        user_id, date, hrv_rmssd, total_sleep, resting_hr, steps,
        deep_sleep, light_sleep, rem_sleep, wake_minutes,
        azm_total, azm_fatburn, azm_cardio, azm_peak,
        spo2_avg, breathing_rate, skin_temp_delta
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?
      )
    `);

    dailySummaries.forEach(summary => {
      insertSummary.run(
        summary.user_id,
        summary.date,
        summary.hrv_rmssd,
        summary.total_sleep,
        summary.resting_hr,
        summary.steps,
        summary.deep_sleep,
        summary.light_sleep,
        summary.rem_sleep,
        summary.wake_minutes,
        summary.azm_total,
        summary.azm_fatburn,
        summary.azm_cardio,
        summary.azm_peak,
        summary.spo2_avg,
        summary.breathing_rate,
        summary.skin_temp_delta
      );
    });
  }

  /**
   * Clean the test database
   */
  static cleanDb() {
    const tables = testDb.prepare(`
      SELECT name 
      FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `).all() as TableRow[];

    tables.forEach(({ name }) => {
      testDb.prepare(`DELETE FROM ${name}`).run();
    });
  }

  /**
   * Delete the test database file
   */
  static deleteTestDb() {
    const dbPath = path.join(__dirname, '..', '..', 'data', 'test.db');
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
  }

  /**
   * Seed test database with sample data
   */
  static seedSampleData(userId: string) {
    // Insert test user
    testDb.prepare(`
      INSERT OR REPLACE INTO users (id) 
      VALUES (?)
    `).run(userId);

    // Insert sample daily summaries
    const sampleData: DailySummary[] = [
      {
        user_id: userId,
        date: '2024-01-01',
        hrv_rmssd: 45.6,
        total_sleep: 420, // 7 hours in minutes
        resting_hr: 65,
        steps: 8000,
        deep_sleep: 90,
        light_sleep: 240,
        rem_sleep: 90,
        wake_minutes: 30,
        azm_total: 30,
        azm_fatburn: 20,
        azm_cardio: 8,
        azm_peak: 2,
        spo2_avg: 97,
        breathing_rate: 14,
        skin_temp_delta: -0.2
      },
      {
        user_id: userId,
        date: '2024-01-02',
        hrv_rmssd: 48.2,
        total_sleep: 480, // 8 hours in minutes
        resting_hr: 63,
        steps: 10000,
        deep_sleep: 120,
        light_sleep: 260,
        rem_sleep: 100,
        wake_minutes: 20,
        azm_total: 45,
        azm_fatburn: 30,
        azm_cardio: 12,
        azm_peak: 3,
        spo2_avg: 98,
        breathing_rate: 13.5,
        skin_temp_delta: 0.1
      }
    ];

    const insertSummary = testDb.prepare(`
      INSERT OR REPLACE INTO daily_summary (
        user_id, date, hrv_rmssd, total_sleep, resting_hr, steps,
        deep_sleep, light_sleep, rem_sleep, wake_minutes,
        azm_total, azm_fatburn, azm_cardio, azm_peak,
        spo2_avg, breathing_rate, skin_temp_delta
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?
      )
    `);

    sampleData.forEach(summary => {
      insertSummary.run(
        summary.user_id,
        summary.date,
        summary.hrv_rmssd,
        summary.total_sleep,
        summary.resting_hr,
        summary.steps,
        summary.deep_sleep,
        summary.light_sleep,
        summary.rem_sleep,
        summary.wake_minutes,
        summary.azm_total,
        summary.azm_fatburn,
        summary.azm_cardio,
        summary.azm_peak,
        summary.spo2_avg,
        summary.breathing_rate,
        summary.skin_temp_delta
      );
    });
  }

  /**
   * Initialize test database with schema and sample data
   */
  static async initializeTestDb(userId: string) {
    try {
      // Ensure the data directory exists
      const dataDir = path.join(__dirname, '..', '..', 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      // Copy schema from production or create tables if production doesn't exist
      try {
        this.copySchema();
      } catch (error) {
        console.log('Could not copy schema from production, creating tables directly');
        this.createTables();
      }

      // Clean any existing data
      this.cleanDb();

      // Seed sample data
      this.seedSampleData(userId);
    } catch (error) {
      console.error('Error initializing test database:', error);
      throw error;
    }
  }

  /**
   * Create database tables directly
   */
  private static createTables() {
    // Create users table
    testDb.prepare(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login TEXT
      )
    `).run();

    // Create daily_summary table
    testDb.prepare(`
      CREATE TABLE IF NOT EXISTS daily_summary (
        user_id TEXT NOT NULL,
        date TEXT NOT NULL,
        resting_hr INTEGER,
        steps INTEGER,
        hrv_rmssd REAL,
        spo2_avg REAL,
        breathing_rate REAL,
        skin_temp_delta REAL,
        total_sleep INTEGER,
        deep_sleep INTEGER,
        light_sleep INTEGER,
        rem_sleep INTEGER,
        wake_minutes INTEGER,
        azm_total INTEGER,
        azm_fatburn INTEGER,
        azm_cardio INTEGER,
        azm_peak INTEGER,
        PRIMARY KEY(user_id, date),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `).run();
  }
} 
import Database from 'better-sqlite3';
import path from 'path';

// Use a separate test database file
const testDbPath = path.join(__dirname, '..', 'data', 'test.db');
const db = new Database(testDbPath);

// Enable foreign keys and WAL mode for better performance
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

export default db; 
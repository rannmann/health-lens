import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

let dbPath: string;
if (process.env.NODE_ENV === 'test') {
  dbPath = path.join(__dirname, '..', 'data', 'test.db');
} else {
  dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'health-lens.db');
}

// Ensure directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

// Enable foreign keys and WAL mode for better performance
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

// Load schema if needed (optional, or only in dev/test)
if (process.env.NODE_ENV !== 'production') {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSQL = fs.readFileSync(schemaPath, 'utf-8');
  db.exec(schemaSQL);
}

export default db; 
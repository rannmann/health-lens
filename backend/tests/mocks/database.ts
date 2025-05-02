import { jest } from '@jest/globals';

const mockDb = {
  prepare: jest.fn(),
  close: jest.fn()
};

const mockStmt = {
  all: jest.fn(),
  get: jest.fn(),
  run: jest.fn()
};

// Default mock implementation
mockDb.prepare.mockReturnValue(mockStmt);
mockStmt.all.mockReturnValue([]);
mockStmt.get.mockReturnValue(null);
mockStmt.run.mockReturnValue({ changes: 0, lastInsertRowid: null });

export { mockDb, mockStmt };
export default mockDb; 
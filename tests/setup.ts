import { afterAll } from 'vitest';
import fs from 'fs';

// Must be top-level so vars are set before any test file imports execute
process.env.JWT_SECRET = 'test-jwt-secret-that-is-long-enough';
process.env.ENCRYPTION_KEY = 'a'.repeat(64);
process.env.DB_PATH = '/tmp/vyedge-test.db';
process.env.NODE_ENV = 'test';
process.env.BACKUP_DIR = '/tmp/vyedge-test-backups';

fs.mkdirSync('/tmp/vyedge-test-backups', { recursive: true });

const TEST_DB_PATH = '/tmp/vyedge-test.db';

afterAll(() => {
  if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
  if (fs.existsSync(TEST_DB_PATH + '-shm')) fs.unlinkSync(TEST_DB_PATH + '-shm');
  if (fs.existsSync(TEST_DB_PATH + '-wal')) fs.unlinkSync(TEST_DB_PATH + '-wal');
  fs.rmSync('/tmp/vyedge-test-backups', { recursive: true, force: true });
});

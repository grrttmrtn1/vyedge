import { beforeAll, afterAll } from 'vitest';
import fs from 'fs';

const TEST_DB_PATH = '/tmp/vyedge-test.db';

beforeAll(() => {
  process.env.JWT_SECRET = 'test-jwt-secret-that-is-long-enough';
  process.env.ENCRYPTION_KEY = 'a'.repeat(64);
  process.env.DB_PATH = TEST_DB_PATH;
  process.env.NODE_ENV = 'test';
  process.env.BACKUP_DIR = '/tmp/vyedge-test-backups';
  fs.mkdirSync('/tmp/vyedge-test-backups', { recursive: true });
});

afterAll(() => {
  if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
  if (fs.existsSync(TEST_DB_PATH + '-shm')) fs.unlinkSync(TEST_DB_PATH + '-shm');
  if (fs.existsSync(TEST_DB_PATH + '-wal')) fs.unlinkSync(TEST_DB_PATH + '-wal');
});

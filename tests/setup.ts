// This file runs before any test modules are imported.
// Set required environment variables here so module-level constants in
// server code (e.g. const JWT_SECRET = process.env.JWT_SECRET!) get
// correct values at module load time.
process.env.JWT_SECRET = 'test-jwt-secret-that-is-long-enough-for-testing-purposes-12345678';
process.env.ENCRYPTION_KEY = 'a'.repeat(64); // 64 valid hex chars
process.env.DB_PATH = `/tmp/vyedge-test-${Date.now()}.db`;

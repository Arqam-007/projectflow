/**
 * Dedicated Test Database Migration Script
 *
 * Ensures the PostgreSQL test database exists and is up to date with
 * the latest migrations. Guaranteed safe: will refuse to run if the database
 * URL does not explicitly target a test database.
 */

import { execSync } from 'node:child_process';
import dotenv from 'dotenv';

dotenv.config();

const testDbUrl =
  process.env.TEST_DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/projectflow_test?schema=public';

// Strict safety check: Never run against development or production databases!
if (!testDbUrl.includes('test')) {
  console.error(
    `[SAFETY CHECK FAILED] Refusing to run test migrations against non-test database: ${testDbUrl}`
  );
  process.exit(1);
}

console.log(`[ProjectFlow] Applying Prisma migrations to test database: ${testDbUrl}`);

try {
  execSync('npx prisma migrate deploy', {
    env: {
      ...process.env,
      DATABASE_URL: testDbUrl,
    },
    stdio: 'inherit',
  });
  console.log('[ProjectFlow] Test database migrations applied successfully.');
} catch (error) {
  console.error('[ProjectFlow] Failed to apply test database migrations.');
  process.exit(1);
}

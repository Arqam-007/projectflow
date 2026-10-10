import type { HealthResponse } from '../../../../packages/shared/src/types.js';
import { config } from '../config/index.js';

export class HealthService {
  private startTime = Date.now();

  public async getHealth(checkDb = true): Promise<HealthResponse> {
    const uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);

    const isDbConfigured = Boolean(config.DATABASE_URL && config.DATABASE_URL.startsWith('postgresql://'));
    let isDbConnected = false;
    let dbMessage = 'PostgreSQL is not configured. Run `docker compose up -d` locally to start PostgreSQL.';

    if (isDbConfigured && checkDb) {
      try {
        // Attempt a quick connection test if Prisma is initialized and URL is reachable
        const { PrismaClient } = await import('@prisma/client');
        const prisma = new PrismaClient();
        await prisma.$queryRaw`SELECT 1`;
        await prisma.$disconnect();
        isDbConnected = true;
        dbMessage = 'Successfully connected to PostgreSQL database.';
      } catch (err) {
        isDbConnected = false;
        const msg = err instanceof Error ? err.message : String(err);
        dbMessage = `PostgreSQL configured at DATABASE_URL but unreachable (${msg.split('\n')[0]}). Ensure Docker container is running locally.`;
      }
    }

    const status: HealthResponse['status'] = isDbConnected || !isDbConfigured ? 'healthy' : 'degraded';

    return {
      status,
      serverTime: new Date().toISOString(),
      uptimeSeconds,
      environment: config.NODE_ENV,
      version: '1.0.0-milestone1',
      database: {
        configured: isDbConfigured,
        provider: 'postgresql',
        connected: isDbConnected,
        message: dbMessage,
      },
    };
  }
}

export const healthService = new HealthService();

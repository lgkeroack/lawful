import { Router } from 'express';
import { prisma } from '../config/database.js';
import { redis } from '../config/redis.js';
import { s3Client } from '../config/s3.js';
import { env } from '../config/env.js';
import { ListBucketsCommand } from '@aws-sdk/client-s3';
import { logger } from '../lib/logger.js';

const router: ReturnType<typeof Router> = Router();

interface ServiceStatus {
  status: 'healthy' | 'unhealthy';
  latencyMs?: number;
  error?: string;
}

router.get('/', async (_req, res) => {
  const checks: Record<string, ServiceStatus> = {};

  // Check database
  const dbStart = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks['database'] = { status: 'healthy', latencyMs: Date.now() - dbStart };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    checks['database'] = { status: 'unhealthy', latencyMs: Date.now() - dbStart, error };
    logger.error({ module: 'health', message: 'Database health check failed', error });
  }

  // Check Redis
  const redisStart = Date.now();
  try {
    await redis.ping();
    checks['redis'] = { status: 'healthy', latencyMs: Date.now() - redisStart };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    checks['redis'] = { status: 'unhealthy', latencyMs: Date.now() - redisStart, error };
    logger.error({ module: 'health', message: 'Redis health check failed', error });
  }

  // Check S3
  const s3Start = Date.now();
  try {
    await s3Client.send(new ListBucketsCommand({}));
    checks['s3'] = { status: 'healthy', latencyMs: Date.now() - s3Start };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    checks['s3'] = { status: 'unhealthy', latencyMs: Date.now() - s3Start, error };
    logger.error({ module: 'health', message: 'S3 health check failed', error });
  }

  const allHealthy = Object.values(checks).every((c) => c.status === 'healthy');
  const statusCode = allHealthy ? 200 : 503;

  res.status(statusCode).json({
    status: allHealthy ? 'healthy' : 'degraded',
    version: process.env['npm_package_version'] ?? '0.0.0',
    environment: env.NODE_ENV,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    checks,
  });
});

export default router;

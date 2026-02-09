import Redis from 'ioredis';
import { env } from './env.js';
import { logger } from '../lib/logger.js';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

redis.on('error', (err) => {
  logger.error({ module: 'redis', message: 'Redis connection error', error: { name: err.name, message: err.message } });
});

redis.on('connect', () => {
  logger.info({ module: 'redis', message: 'Connected to Redis' });
});

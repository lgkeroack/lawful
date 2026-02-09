import pino from 'pino';
import { env } from '../config/env.js';

export const logger = pino({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  transport: env.NODE_ENV === 'development' ? { target: 'pino-pretty', options: { colorize: true } } : undefined,
  base: { service: 'api' },
});

export function createModuleLogger(module: string) {
  return logger.child({ module });
}

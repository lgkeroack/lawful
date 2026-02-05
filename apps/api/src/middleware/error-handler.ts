import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError, ValidationError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

interface RFC7807Problem {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  code?: string;
  errors?: Record<string, unknown>[];
}

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  const requestId = req.headers['x-request-id'] as string | undefined;

  if (err instanceof ZodError) {
    const zodDetails = err.errors.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
      code: issue.code,
    }));

    const validationError = new ValidationError('Request validation failed', zodDetails);

    logger.warn({
      module: 'error-handler',
      message: 'Validation error',
      requestId,
      method: req.method,
      path: req.path,
      errors: zodDetails,
    });

    const problem: RFC7807Problem = {
      type: 'https://lexvault.io/problems/validation-error',
      title: 'Validation Error',
      status: validationError.statusCode,
      detail: validationError.message,
      instance: req.originalUrl,
      code: validationError.code,
      errors: zodDetails,
    };

    res.status(validationError.statusCode).json(problem);
    return;
  }

  if (err instanceof AppError) {
    const logLevel = err.statusCode >= 500 ? 'error' : 'warn';

    logger[logLevel]({
      module: 'error-handler',
      message: err.message,
      requestId,
      method: req.method,
      path: req.path,
      statusCode: err.statusCode,
      code: err.code,
      stack: err.statusCode >= 500 ? err.stack : undefined,
    });

    const problem: RFC7807Problem = {
      type: `https://lexvault.io/problems/${err.code.toLowerCase().replace(/_/g, '-')}`,
      title: err.code.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      status: err.statusCode,
      detail: err.message,
      instance: req.originalUrl,
      code: err.code,
    };

    if (err instanceof ValidationError && err.details) {
      problem.errors = err.details;
    }

    res.status(err.statusCode).json(problem);
    return;
  }

  // Unexpected errors
  logger.error({
    module: 'error-handler',
    message: 'Unhandled error',
    requestId,
    method: req.method,
    path: req.path,
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack,
    },
  });

  const problem: RFC7807Problem = {
    type: 'https://lexvault.io/problems/internal-error',
    title: 'Internal Server Error',
    status: 500,
    detail: 'An unexpected error occurred',
    instance: req.originalUrl,
    code: 'INTERNAL_ERROR',
  };

  res.status(500).json(problem);
}

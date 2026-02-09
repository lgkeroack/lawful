import type { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

type ValidationTarget = 'body' | 'query' | 'params';

interface ValidationSchemas {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

export function validate(schemas: ValidationSchemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const targets: ValidationTarget[] = ['body', 'query', 'params'];
    const allErrors: { target: string; issues: unknown[] }[] = [];

    for (const target of targets) {
      const schema = schemas[target];
      if (!schema) continue;

      const result = schema.safeParse(req[target]);
      if (!result.success) {
        allErrors.push({
          target,
          issues: result.error.errors.map((issue) => ({
            path: [target, ...issue.path].join('.'),
            message: issue.message,
            code: issue.code,
          })),
        });
      } else {
        // Replace with parsed (and potentially transformed) data
        req[target] = result.data;
      }
    }

    if (allErrors.length > 0) {
      const combinedIssues = allErrors.flatMap((e) => e.issues);
      const zodError = new ZodError(
        allErrors.flatMap((e) => {
          const schema = schemas[e.target as ValidationTarget]!;
          const result = schema.safeParse(req[e.target as ValidationTarget]);
          return result.success ? [] : result.error.errors;
        })
      );
      next(zodError);
      return;
    }

    next();
  };
}

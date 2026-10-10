import type { Request, Response, NextFunction } from 'express';
import { type ZodType, ZodError } from 'zod';
import { ValidationError } from '../utils/errors.js';

export function validateBody<T>(schema: ZodType<T>) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(new ValidationError('Request body validation failed', error.issues));
      } else {
        next(error);
      }
    }
  };
}

export function validateQuery<T>(schema: ZodType<T>) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      req.query = (await schema.parseAsync(req.query)) as Request['query'];
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(new ValidationError('Query parameters validation failed', error.issues));
      } else {
        next(error);
      }
    }
  };
}

export function validateParams<T>(schema: ZodType<T>) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      req.params = (await schema.parseAsync(req.params)) as Request['params'];
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(new ValidationError('URL path parameters validation failed', error.issues));
      } else {
        next(error);
      }
    }
  };
}

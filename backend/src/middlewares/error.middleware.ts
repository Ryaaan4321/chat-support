import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../lib/errors';
import { logger } from '../../lib/logger';

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const appError = AppError.from(err);

  if (!appError.isOperational || appError.statusCode >= 500) {
    logger.error({ err: appError, url: req.url, method: req.method }, 'Unhandled HTTP error');
  }

  res.status(appError.statusCode).json({
    success: false,
    error: {
      code: appError.code,
      message: appError.message,
      details: appError.details,
    },
  });
}

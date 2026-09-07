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

  // Format clean, professional, human-readable message without leaking internal database logs
  let clientMessage = appError.message;
  if (appError.statusCode >= 500 || appError.code === 'DATABASE_ERROR' || appError.code === 'INTERNAL_ERROR') {
    if (req.url.includes('/signup')) {
      clientMessage = 'Unable to complete account registration at this time. Please try again shortly.';
    } else if (req.url.includes('/login')) {
      clientMessage = 'Unable to sign in at this time. Please try again shortly.';
    } else {
      clientMessage = 'An unexpected server error occurred. Please try again in a few moments.';
    }
  } else if (appError.code === 'CONFLICT') {
    clientMessage = 'An account with this email address already exists. Please log in instead.';
  } else if (appError.code === 'NOT_FOUND') {
    clientMessage = appError.message || 'The requested resource could not be found.';
  } else if (appError.code === 'UNAUTHORIZED') {
    clientMessage = appError.message || 'Authentication failed. Please verify your credentials.';
  } else if (appError.code === 'VALIDATION_ERROR' || appError.code === 'BAD_REQUEST') {
    clientMessage = appError.message || 'Invalid request details. Please check your submission.';
  }

  // Guard against any object string coercion
  if (!clientMessage || typeof clientMessage !== 'string' || clientMessage.includes('[object Object]')) {
    clientMessage = 'Unable to complete your request. Please try again.';
  }

  res.status(appError.statusCode).json({
    success: false,
    message: clientMessage,
    error: {
      code: appError.code,
      message: clientMessage,
      details: appError.statusCode < 500 ? appError.details : undefined,
    },
  });
}

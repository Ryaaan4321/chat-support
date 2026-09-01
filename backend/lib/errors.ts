export type ErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'CONCURRENCY_ERROR'
  | 'VALIDATION_ERROR'
  | 'DATABASE_ERROR'
  | 'INTERNAL_ERROR';

export interface AppErrorOptions {
  code?: ErrorCode;
  statusCode?: number;
  details?: Record<string, unknown>;
  cause?: unknown;
  isOperational?: boolean;
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;
  public readonly isOperational: boolean;

  constructor(message: string, options: AppErrorOptions = {}) {
    super(message);
    this.name = 'AppError';
    this.code = options.code ?? 'INTERNAL_ERROR';
    this.statusCode = options.statusCode ?? 500;
    this.details = options.details;
    this.isOperational = options.isOperational ?? true;

    if (options.cause) {
      this.cause = options.cause;
    }

    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = 'Bad request', details?: Record<string, unknown>): AppError {
    return new AppError(message, {
      code: 'BAD_REQUEST',
      statusCode: 400,
      details,
    });
  }

  static unauthorized(message = 'Unauthorized', details?: Record<string, unknown>): AppError {
    return new AppError(message, {
      code: 'UNAUTHORIZED',
      statusCode: 401,
      details,
    });
  }

  static forbidden(message = 'Forbidden', details?: Record<string, unknown>): AppError {
    return new AppError(message, {
      code: 'FORBIDDEN',
      statusCode: 403,
      details,
    });
  }

  static notFound(message = 'Resource not found', details?: Record<string, unknown>): AppError {
    return new AppError(message, {
      code: 'NOT_FOUND',
      statusCode: 404,
      details,
    });
  }

  static conflict(message = 'Resource conflict', details?: Record<string, unknown>): AppError {
    return new AppError(message, {
      code: 'CONFLICT',
      statusCode: 409,
      details,
    });
  }

  static concurrency(message = 'Concurrency conflict detected', details?: Record<string, unknown>): AppError {
    return new AppError(message, {
      code: 'CONCURRENCY_ERROR',
      statusCode: 409,
      details,
    });
  }

  static validation(message = 'Validation failed', details?: Record<string, unknown>): AppError {
    return new AppError(message, {
      code: 'VALIDATION_ERROR',
      statusCode: 422,
      details,
    });
  }

  static database(message = 'Database operation failed', details?: Record<string, unknown>, cause?: unknown): AppError {
    return new AppError(message, {
      code: 'DATABASE_ERROR',
      statusCode: 500,
      details,
      cause,
    });
  }

  static internal(message = 'Internal server error', details?: Record<string, unknown>, cause?: unknown): AppError {
    return new AppError(message, {
      code: 'INTERNAL_ERROR',
      statusCode: 500,
      details,
      cause,
    });
  }

  static from(err: unknown, fallbackMessage = 'An unexpected error occurred'): AppError {
    if (err instanceof AppError) {
      return err;
    }

    if (err instanceof Error) {
      const isPrisma = 'code' in err;
      return new AppError(err.message || fallbackMessage, {
        code: isPrisma ? 'DATABASE_ERROR' : 'INTERNAL_ERROR',
        statusCode: 500,
        cause: err,
        details: isPrisma ? { prismaCode: (err as any).code } : undefined,
      });
    }

    return new AppError(typeof err === 'string' ? err : fallbackMessage, {
      code: 'INTERNAL_ERROR',
      statusCode: 500,
      details: { raw: err },
    });
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
      isOperational: this.isOperational,
    };
  }
}

import { describe, it, expect } from '@jest/globals';
import { AppError } from '../../lib/errors';

describe('AppError', () => {
  it('creates an AppError with custom properties', () => {
    const error = new AppError('Custom failure', {
      code: 'VALIDATION_ERROR',
      statusCode: 422,
      details: { field: 'email' },
    });

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AppError);
    expect(error.name).toBe('AppError');
    expect(error.message).toBe('Custom failure');
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.statusCode).toBe(422);
    expect(error.details).toEqual({ field: 'email' });
    expect(error.isOperational).toBe(true);
  });

  it('provides helper factory methods for standard error types', () => {
    const badReq = AppError.badRequest('Invalid payload');
    expect(badReq.statusCode).toBe(400);
    expect(badReq.code).toBe('BAD_REQUEST');

    const unauth = AppError.unauthorized('Missing token');
    expect(unauth.statusCode).toBe(401);
    expect(unauth.code).toBe('UNAUTHORIZED');

    const forbidden = AppError.forbidden('Access denied');
    expect(forbidden.statusCode).toBe(403);
    expect(forbidden.code).toBe('FORBIDDEN');

    const notFound = AppError.notFound('Agent not found');
    expect(notFound.statusCode).toBe(404);
    expect(notFound.code).toBe('NOT_FOUND');

    const conflict = AppError.conflict('Already active');
    expect(conflict.statusCode).toBe(409);
    expect(conflict.code).toBe('CONFLICT');

    const concurrency = AppError.concurrency('Lock collision');
    expect(concurrency.statusCode).toBe(409);
    expect(concurrency.code).toBe('CONCURRENCY_ERROR');

    const validation = AppError.validation('Invalid shift status');
    expect(validation.statusCode).toBe(422);
    expect(validation.code).toBe('VALIDATION_ERROR');

    const database = AppError.database('Query timed out');
    expect(database.statusCode).toBe(500);
    expect(database.code).toBe('DATABASE_ERROR');

    const internal = AppError.internal('Unexpected failure');
    expect(internal.statusCode).toBe(500);
    expect(internal.code).toBe('INTERNAL_ERROR');
  });

  it('normalizes unknown error types via AppError.from()', () => {
    const existing = AppError.badRequest('Existing');
    expect(AppError.from(existing)).toBe(existing);

    const standardError = new Error('Standard failure');
    const fromStd = AppError.from(standardError);
    expect(fromStd.message).toBe('Standard failure');
    expect(fromStd.code).toBe('INTERNAL_ERROR');

    const prismaError = Object.assign(new Error('Record not found'), { code: 'P2025' });
    const fromPrisma = AppError.from(prismaError);
    expect(fromPrisma.code).toBe('DATABASE_ERROR');
    expect(fromPrisma.details).toEqual({ prismaCode: 'P2025' });

    const fromString = AppError.from('String error');
    expect(fromString.message).toBe('String error');
    expect(fromString.code).toBe('INTERNAL_ERROR');
  });

  it('serializes to JSON correctly', () => {
    const error = AppError.notFound('Chat not found', { chatId: 'chat-1' });
    const json = error.toJSON();

    expect(json).toEqual({
      name: 'AppError',
      message: 'Chat not found',
      code: 'NOT_FOUND',
      statusCode: 404,
      details: { chatId: 'chat-1' },
      isOperational: true,
    });
  });
});

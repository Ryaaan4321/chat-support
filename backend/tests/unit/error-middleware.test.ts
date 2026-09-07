import { describe, it, expect, jest } from '@jest/globals';
import { errorHandler } from '../../src/middlewares/error.middleware';
import { AppError } from '../../lib/errors';
import { Request, Response, NextFunction } from 'express';

describe('Error Middleware', () => {
  const createMockReqRes = (url = '/api/test', method = 'GET') => {
    const req = { url, method } as Request;
    const res = {
      statusCode: 200,
      status: jest.fn().mockImplementation((code: number) => {
        res.statusCode = code;
        return res;
      }),
      json: jest.fn().mockReturnThis(),
    } as unknown as Response;
    const next = jest.fn() as NextFunction;
    return { req, res, next };
  };

  it('formats signup 500 / database error into a clean, professional user message', () => {
    const { req, res, next } = createMockReqRes('/api/auth/signup', 'POST');
    const dbErr = Object.assign(new Error('FATAL: column "avatarUrl" does not exist'), { code: 'P2002' });

    errorHandler(dbErr, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Unable to complete account registration at this time. Please try again shortly.',
        error: expect.objectContaining({
          code: 'DATABASE_ERROR',
          message: 'Unable to complete account registration at this time. Please try again shortly.',
        }),
      })
    );
  });

  it('formats email conflict (409) into professional existing account message', () => {
    const { req, res, next } = createMockReqRes('/api/auth/signup', 'POST');
    const conflictErr = AppError.conflict('An agent with this email already exists');

    errorHandler(conflictErr, req, res, next);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'An account with this email address already exists. Please log in instead.',
        error: expect.objectContaining({
          code: 'CONFLICT',
          message: 'An account with this email address already exists. Please log in instead.',
        }),
      })
    );
  });

  it('formats login route 500 error professionally', () => {
    const { req, res, next } = createMockReqRes('/api/auth/agent/login', 'POST');
    const internalErr = AppError.internal('Database connection timeout');

    errorHandler(internalErr, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Unable to sign in at this time. Please try again shortly.',
      })
    );
  });

  it('formats validation errors with specific validation guidance', () => {
    const { req, res, next } = createMockReqRes('/api/auth/signup', 'POST');
    const valErr = AppError.validation('Valid email is required');

    errorHandler(valErr, req, res, next);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Valid email is required',
        error: expect.objectContaining({
          code: 'VALIDATION_ERROR',
          message: 'Valid email is required',
        }),
      })
    );
  });

  it('never outputs [object Object] or leaks internal stack/schema to client', () => {
    const { req, res, next } = createMockReqRes('/api/chats', 'POST');
    const weirdErr = { someNestedObject: { foo: 'bar' } };

    errorHandler(weirdErr, req, res, next);

    const callArg = (res.json as jest.MockedFunction<any>).mock.calls[0][0];
    expect(callArg.message).not.toContain('[object Object]');
    expect(callArg.error.message).not.toContain('[object Object]');
    expect(typeof callArg.message).toBe('string');
    expect(typeof callArg.error.message).toBe('string');
  });
});

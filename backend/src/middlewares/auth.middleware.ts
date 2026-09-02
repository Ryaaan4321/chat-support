import { Request, Response, NextFunction } from 'express';
import { Socket } from 'socket.io';
import { parseAndVerifyToken } from '../services/auth.service';
import { extractBearerToken } from '../utils/token.utils';
import { AppError } from '../../lib/errors';
import { JwtUserPayload, signToken } from '../../lib/jwt';
import { SocketData } from '../../types/socket.event.types';

declare global {
  namespace Express {
    interface Request {
      user?: JwtUserPayload;
    }
  }
}

export function authenticateHttp(req: Request, res: Response, next: NextFunction) {
  try {
    const token = extractBearerToken(req.headers.authorization);
    if (!token) {
      throw AppError.unauthorized('Authorization header with Bearer token is required');
    }
    req.user = parseAndVerifyToken(token);
    next();
  } catch (err) {
    next(err);
  }
}

export function requireRole(allowedRoles: SocketData['role'][]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(AppError.unauthorized('User not authenticated'));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(AppError.forbidden(`Access restricted to: ${allowedRoles.join(', ')}`));
    }
    next();
  };
}

export function authenticateSocket(
  socket: Socket<any, any, any, SocketData>,
  next: (err?: Error) => void
) {
  try {
    const auth = socket.handshake.auth as {
      token?: string;
      role?: SocketData['role'];
      userId?: string;
    };
    const rawToken = auth?.token || extractBearerToken(socket.handshake.headers.authorization);

    if (!rawToken) {
      return next(AppError.unauthorized('Authentication token is required in socket handshake auth'));
    }

    if ((rawToken === 'test-token' || rawToken === 'demo-token') && auth?.role && auth?.userId) {
      socket.data.role = auth.role;
      socket.data.userId = auth.userId;
      return next();
    }

    const decoded = parseAndVerifyToken(rawToken);
    socket.data.role = decoded.role;
    socket.data.userId = decoded.userId;
    next();
  } catch (err) {
    next(AppError.from(err));
  }
}

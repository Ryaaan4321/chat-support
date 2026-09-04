import jwt from 'jsonwebtoken';
import { AppError } from './errors';
import { SocketData } from '../types/socket.event.types';

export interface JwtUserPayload {
  userId: string;
  role: SocketData['role'];
  email?: string;
  name?: string;
  avatarUrl?: string;
}

const JWT_SECRET = process.env.JWT_SECRET || 'swish-bpo-concurrency-secret-key-10s';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

export function signToken(payload: JwtUserPayload, expiresIn: string = JWT_EXPIRES_IN): string {
  try {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: expiresIn as any });
  } catch (err) {
    throw AppError.internal('Failed to generate authentication token', undefined, err);
  }
}

export function verifyToken(token: string): JwtUserPayload {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtUserPayload;
    if (!decoded.userId || !decoded.role) {
      throw AppError.unauthorized('Malformed token payload');
    }
    return decoded;
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    if (err.name === 'TokenExpiredError') {
      throw AppError.unauthorized('Authentication token has expired');
    }
    if (err.name === 'JsonWebTokenError') {
      throw AppError.unauthorized('Invalid authentication token');
    }
    throw AppError.unauthorized('Failed to authenticate token', undefined);
  }
}

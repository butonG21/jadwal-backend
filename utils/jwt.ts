import jwt from 'jsonwebtoken';
import ms from 'ms';
import { logger } from './loggers';
import { AppError, UnauthorizedError } from './errorTypes';

interface TokenPayload {
  uid: string;
  name: string;
  email?: string;
}

interface DecodedToken extends TokenPayload {
  iat: number;
  exp: number;
}

class JWTService {
  private readonly secret: string;
  private readonly expiresIn: ms.StringValue;
  private readonly issuer: string;

  constructor() {
    this.secret = process.env.JWT_SECRET!;
    this.expiresIn = (process.env.JWT_EXPIRES_IN || '7d') as ms.StringValue;
    this.issuer = process.env.JWT_ISSUER || 'jadwal-api';

    if (!this.secret) {
      throw new Error('JWT_SECRET environment variable is required');
    }
  }

  generateToken(payload: TokenPayload): string {
    try {
      const signOptions: jwt.SignOptions = {
        expiresIn: this.expiresIn, // langsung string "7d", "1h", dll
        issuer: this.issuer,
        audience: 'jadwal-app',
        subject: payload.uid
      };

      const token = jwt.sign(payload, this.secret, signOptions);

      logger.info('Token generated successfully', {
        uid: payload.uid,
        expiresIn: this.expiresIn
      });

      return token;

    } catch (error: any) {
      logger.error('Failed to generate token:', {
        error: error.message,
        uid: payload.uid
      });

      throw new AppError('Failed to generate authentication token', 500);
    }
  }

  verifyToken(token: string): DecodedToken {
    try {
      const decoded = jwt.verify(token, this.secret, {
        issuer: this.issuer,
        audience: 'jadwal-app'
      }) as DecodedToken;

      return decoded;

    } catch (error: any) {
      logger.warn('Token verification failed:', {
        error: error.message,
        name: error.name
      });

      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedError('Token has expired');
      }

      if (error.name === 'JsonWebTokenError') {
        throw new UnauthorizedError('Invalid token');
      }

      if (error.name === 'NotBeforeError') {
        throw new UnauthorizedError('Token is not active yet');
      }

      throw new UnauthorizedError('Token verification failed');
    }
  }

  decodeToken(token: string): DecodedToken | null {
    try {
      const decoded = jwt.decode(token) as DecodedToken;
      return decoded;
    } catch {
      return null;
    }
  }

  getTokenInfo(token: string): {
    isExpired: boolean;
    expiresAt: Date;
    issuedAt: Date;
    subject?: string;
    issuer?: string;
  } | null {
    const decoded = this.decodeToken(token);
    if (!decoded) return null;

    return {
      isExpired: Date.now() >= decoded.exp * 1000,
      expiresAt: new Date(decoded.exp * 1000),
      issuedAt: new Date(decoded.iat * 1000),
      subject: decoded.uid,
      issuer: this.issuer
    };
  }

  refreshToken(token: string): string {
    try {
      const decoded = this.verifyToken(token);

      // Check if token is close to expiring (within 1 hour)
      const timeToExpiry = decoded.exp * 1000 - Date.now();
      const oneHour = 60 * 60 * 1000;

      if (timeToExpiry > oneHour) {
        throw new AppError('Token does not need refreshing yet', 400);
      }

      // Generate new token with same payload
      const newToken = this.generateToken({
        uid: decoded.uid,
        name: decoded.name,
        email: decoded.email
      });

      logger.info('Token refreshed successfully', { uid: decoded.uid });
      return newToken;

    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }

      logger.error('Failed to refresh token:', error.message);
      throw new AppError('Failed to refresh token', 500);
    }
  }
}

// Export singleton instance
export const jwtService = new JWTService();

// Backward compatibility exports
export const generateToken = (payload: TokenPayload): string => {
  return jwtService.generateToken(payload);
};

export const verifyToken = (token: string): DecodedToken => {
  return jwtService.verifyToken(token);
};

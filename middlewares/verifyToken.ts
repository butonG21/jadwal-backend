import { Request, Response, NextFunction } from 'express';
import { jwtService } from '../utils/jwt';
import { logger } from '../utils/loggers';
import { ApiResponse } from '../utils/apiResponse';
import { UnauthorizedError } from '../utils/errorTypes';

export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    name: string;
    email?: string;
    iat: number;
    exp: number;
  };
}

export const verifyTokenMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const requestId = (req as any).requestId;

  // Check if authorization header exists
  if (!authHeader) {
    logger.warn('Missing authorization header', { 
      requestId, 
      path: req.path, 
      method: req.method 
    });
    
    return res.status(401).json(
      ApiResponse.error('Authorization header is required', 'MISSING_TOKEN', 401)
    );
  }

  // Check if authorization header format is correct
  if (!authHeader.startsWith('Bearer ')) {
    logger.warn('Invalid authorization header format', { 
      requestId, 
      authHeader: authHeader.substring(0, 20) + '...' 
    });
    
    return res.status(401).json(
      ApiResponse.error('Authorization header must be in format: Bearer <token>', 'INVALID_TOKEN_FORMAT', 401)
    );
  }

  const token = authHeader.split(' ')[1];

  // Check if token exists
  if (!token) {
    logger.warn('Empty token in authorization header', { requestId });
    
    return res.status(401).json(
      ApiResponse.error('Token not provided', 'MISSING_TOKEN', 401)
    );
  }

  try {
    // Verify token
    const decoded = jwtService.verifyToken(token);
    
    // Add user info to request object
    req.user = decoded;
    
    // Log successful token verification (debug level)
    logger.debug('Token verified successfully', { 
      uid: decoded.uid, 
      requestId,
      expiresAt: new Date(decoded.exp * 1000).toISOString()
    });
    
    next();
    
  } catch (error: any) {
    logger.warn('Token verification failed', { 
      requestId, 
      error: error.message,
      tokenPrefix: token.substring(0, 10) + '...'
    });

    if (error instanceof UnauthorizedError) {
      return res.status(401).json(
        ApiResponse.error(error.message, 'TOKEN_VERIFICATION_FAILED', 401)
      );
    }
    
    return res.status(401).json(
      ApiResponse.error('Invalid or expired token', 'TOKEN_VERIFICATION_FAILED', 401)
    );
  }
};

// Optional middleware - doesn't fail if no token provided
export const optionalAuthMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // No token provided, continue without authentication
    return next();
  }

  const token = authHeader.split(' ')[1];
  
  if (!token) {
    return next();
  }

  try {
    const decoded = jwtService.verifyToken(token);
    req.user = decoded;
    
    logger.debug('Optional auth successful', { 
      uid: decoded.uid, 
      requestId: (req as any).requestId 
    });
    
  } catch (error) {
    // Token is invalid, but we don't fail the request
    logger.debug('Optional auth failed, continuing without authentication', { 
      requestId: (req as any).requestId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
  
  next();
};

// Middleware to check specific roles (for future use)
export const requireRole = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json(
        ApiResponse.error('Authentication required', 'UNAUTHENTICATED', 401)
      );
    }

    // For now, we don't have roles in the token
    // This is a placeholder for future role-based access control
    logger.warn('Role check requested but not implemented', { 
      uid: req.user.uid, 
      requiredRoles: roles 
    });
    
    next();
  };
};

// Middleware to check if user owns the resource
export const requireOwnership = (userIdParam: string = 'employeeId') => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json(
        ApiResponse.error('Authentication required', 'UNAUTHENTICATED', 401)
      );
    }

    const resourceUserId = req.params[userIdParam];
    const currentUserId = req.user.uid;

    if (resourceUserId !== currentUserId) {
      logger.warn('Ownership check failed', {
        currentUser: currentUserId,
        resourceUser: resourceUserId,
        requestId: (req as any).requestId
      });
      
      return res.status(403).json(
        ApiResponse.error('Access denied. You can only access your own data.', 'ACCESS_DENIED', 403)
      );
    }

    next();
  };
};

// Export the main middleware with backward compatibility
export { verifyTokenMiddleware as verifyToken };
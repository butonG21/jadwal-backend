import { Request, Response, NextFunction } from 'express';
import { jwtService } from '../utils/jwt';
import { logger } from '../utils/loggers';
import { ApiResponse } from '../utils/apiResponse';
import { UnauthorizedError } from '../utils/errorTypes';
import User, { UserRole } from '../models/User';

export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    name: string;
    email?: string;
    role: UserRole;
    iat: number;
    exp: number;
  };
}

export const verifyTokenMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
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
    
    // Fetch user from database to get current role
    const user = await User.findOne({ uid: decoded.uid }).select('role');
    if (!user) {
      logger.warn('User not found in database', { uid: decoded.uid, requestId });
      return res.status(401).json(
        ApiResponse.error('User not found', 'USER_NOT_FOUND', 401)
      );
    }
    
    // Add user info to request object including role
    req.user = {
      ...decoded,
      role: user.role
    };
    
    // Log successful token verification (debug level)
    logger.debug('Token verified successfully', { 
      uid: decoded.uid, 
      role: user.role,
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

// Optional auth middleware - doesn't fail if no token provided
export const optionalAuthMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const requestId = req.headers['x-request-id'] as string || 'unknown';
  
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token provided, continue without user info
      return next();
    }
    
    const token = authHeader.substring(7);
    const decoded = jwtService.verifyToken(token);
    
    // Fetch user from database to get current role
    const user = await User.findOne({ uid: decoded.uid }).select('role');
    if (user) {
      req.user = {
        ...decoded,
        role: user.role
      };
    }
    
    next();
  } catch (error) {
    // Token invalid, continue without user info
    logger.debug('Optional auth failed, continuing without user', { requestId, error: error instanceof Error ? error.message : String(error) });
    next();
  }
};

// Role-based authorization middleware
export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const requestId = req.headers['x-request-id'] as string || 'unknown';
    
    if (!req.user) {
      logger.warn('Role check failed: No authenticated user', { requestId });
      return res.status(401).json(
        ApiResponse.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401)
      );
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      logger.warn('Role check failed: Insufficient permissions', { 
        uid: req.user.uid, 
        userRole: req.user.role, 
        requiredRoles: allowedRoles,
        requestId 
      });
      return res.status(403).json(
        ApiResponse.error('Insufficient permissions', 'INSUFFICIENT_PERMISSIONS', 403)
      );
    }
    
    logger.debug('Role check passed', { 
      uid: req.user.uid, 
      userRole: req.user.role, 
      requestId 
    });
    
    next();
  };
};

// Admin-only middleware
export const requireAdmin = requireRole(UserRole.ADMIN);

// Ownership verification middleware
export const requireOwnership = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const requestId = req.headers['x-request-id'] as string || 'unknown';
  
  if (!req.user) {
    logger.warn('Ownership check failed: No authenticated user', { requestId });
    return res.status(401).json(
      ApiResponse.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401)
    );
  }
  
  // Check if user is admin (admins can access any resource)
  if (req.user.role === UserRole.ADMIN) {
    logger.debug('Ownership check passed: Admin access', { uid: req.user.uid, requestId });
    return next();
  }
  
  // Check if the requested resource belongs to the user
  const resourceUserId = req.params.uid || req.params.userId || req.body.uid;
  
  if (!resourceUserId) {
    logger.warn('Ownership check failed: No resource user ID found', { 
      uid: req.user.uid, 
      requestId 
    });
    return res.status(400).json(
      ApiResponse.error('Resource user ID required', 'RESOURCE_USER_ID_REQUIRED', 400)
    );
  }
  
  if (req.user.uid !== resourceUserId) {
    logger.warn('Ownership check failed: Resource does not belong to user', { 
      uid: req.user.uid, 
      resourceUserId, 
      requestId 
    });
    return res.status(403).json(
      ApiResponse.error('Access denied: Resource does not belong to you', 'ACCESS_DENIED', 403)
    );
  }
  
  logger.debug('Ownership check passed', { uid: req.user.uid, requestId });
  next();
};

// Export the main middleware with backward compatibility
export { verifyTokenMiddleware as verifyToken };
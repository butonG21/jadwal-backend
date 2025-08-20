import { Request, Response } from 'express';
import axios from 'axios';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import User from '../models/User';
import { logger } from '../utils/loggers';
import { ApiResponse } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError, UnauthorizedError, ExternalApiError } from '../utils/errorTypes';
import { generateToken, verifyToken } from '../utils/jwt';
import { handleExternalApiError } from '../middlewares/errorHandler';
import { cache } from '../utils/cache';
import { API_ENDPOINTS } from '../config/constants';

interface LoginRequest {
  username: string;
  password: string;
}

interface ExternalAuthResponse {
  error?: string;
  uid?: string;
  user?: {
    name: string;
    email?: string;
    location?: string;
  };
}

interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    name: string;
    email?: string;
    iat: number;
    exp: number;
  };
}

class AuthController {
  
  // Rate limiting for login attempts
  private loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    message: {
      success: false,
      error: 'Too many login attempts. Please try again later.',
      retryAfter: 15 * 60 // 15 minutes in seconds
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Remove custom keyGenerator to use default IP-based limiting
    skip: (req) => {
      // Skip rate limiting in development
      return process.env.NODE_ENV === 'development';
    }
  });

  private async authenticateWithExternalAPI(username: string, password: string): Promise<ExternalAuthResponse> {
    const cacheKey = `auth_attempt_${username}_${Date.now()}`;
    
    try {
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('passwd', password);
      formData.append('version', '1.4.0');

      logger.info(`Attempting external authentication for user: ${username}`);

      const response = await axios.post(
        `${API_ENDPOINTS.ATTENDANCE_API_BASE}/${API_ENDPOINTS.ATTENDANCE_CHECK_LOGIN}`,
        formData.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'JadwalApp/2.0'
          },
          timeout: 10000, // 10 seconds timeout
        }
      );

      const authData = response.data as ExternalAuthResponse;
      
      // Cache failed attempts to prevent spam
      if (authData.error || !authData.uid) {
        cache.set(`failed_${cacheKey}`, true, 300); // Cache for 5 minutes
        logger.warn(`Authentication failed for user: ${username}`, {
          error: authData.error,
          hasUid: !!authData.uid
        });
      } else {
        logger.info(`Authentication successful for user: ${username}`);
      }

      return authData;
      
    } catch (error: any) {
      logger.error(`External authentication error for user: ${username}`, {
        error: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText
      });
      
      throw handleExternalApiError(error, 'Authentication API');
    }
  }

  private async createOrUpdateUser(authData: ExternalAuthResponse): Promise<any> {
    if (!authData.uid || !authData.user?.name) {
      throw new AppError('Invalid authentication response', 500);
    }

    try {
      let user = await User.findOne({ uid: authData.uid });
      
      const userData = {
        uid: authData.uid,
        name: authData.user.name,
        email: authData.user.email || '',
        location: authData.user.location || ''
      };

      if (!user) {
        // Create new user
        user = new User(userData);
        await user.save();
        logger.info(`Created new user: ${authData.uid}`);
      } else {
        // Update existing user with latest info
        await User.findByIdAndUpdate(user._id, userData);
        logger.info(`Updated existing user: ${authData.uid}`);
      }

      return user;
      
    } catch (error: any) {
      logger.error('Failed to create/update user:', {
        uid: authData.uid,
        error: error.message
      });
      
      if (error.name === 'ValidationError') {
        throw new AppError('Invalid user data', 400);
      }
      
      if (error.code === 11000) {
        // Duplicate key error - user already exists, try to find and return
        const existingUser = await User.findOne({ uid: authData.uid });
        if (existingUser) return existingUser;
      }
      
      throw new AppError('Failed to create user account', 500);
    }
  }

  // Main login method
  login = asyncHandler(async (req: Request, res: Response) => {
    // Apply rate limiting
    await new Promise((resolve, reject) => {
      this.loginLimiter(req, res, (err) => {
        if (err) reject(err);
        else resolve(void 0);
      });
    });

    const { username, password }: LoginRequest = req.body;
    const requestId = (req as any).requestId;

    // Input validation
    if (!username || !password) {
      throw new AppError('Username and password are required', 400);
    }

    if (username.length < 3 || username.length > 50) {
      throw new AppError('Username must be between 3 and 50 characters', 400);
    }

    if (password.length < 6) {
      throw new AppError('Password must be at least 6 characters', 400);
    }

    logger.info('Login attempt', { username, requestId, ip: req.ip });

    try {
      // Authenticate with external API
      const authData = await this.authenticateWithExternalAPI(username, password);

      // Check authentication result
      if (authData.error || !authData.uid || !authData.user?.name) {
        logger.warn('Authentication failed', { 
          username, 
          requestId, 
          error: authData.error 
        });
        
        throw new UnauthorizedError('Invalid username or password');
      }

      // Create or update user in database
      const user = await this.createOrUpdateUser(authData);

      // Generate JWT token
      const tokenPayload = {
        uid: user.uid,
        name: user.name,
        email: user.email
      };

      const token = generateToken(tokenPayload);
      
      // Prepare response data
      const responseData = {
        token,
        user: {
          uid: user.uid,
          name: user.name,
          email: user.email || null,
          location: user.location || null
        },
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
      };

      logger.info('Login successful', { 
        username, 
        uid: user.uid, 
        requestId 
      });

      res.status(200).json(
        ApiResponse.success('Login successful', responseData)
      );

    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }

      logger.error('Login error', { 
        username, 
        requestId, 
        error: error.message 
      });
      
      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        throw new AppError('Authentication service is temporarily unavailable', 503);
      }
      
      throw new AppError('Login failed due to server error', 500);
    }
  });

  // Logout method
  logout = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user;
    const requestId = (req as any).requestId;

    if (user) {
      logger.info('User logout', { 
        uid: user.uid, 
        name: user.name, 
        requestId 
      });

      // In a more advanced implementation, you could:
      // 1. Add token to blacklist
      // 2. Clear server-side session
      // 3. Invalidate refresh tokens
      
      // For now, we just log the logout event
      // Client should remove token from localStorage/cookies
    }

    res.status(200).json(
      ApiResponse.success(
        'Logout successful. Please remove the token from client storage.',
        {
          message: 'Token should be removed from client-side storage (localStorage, sessionStorage, or cookies)'
        }
      )
    );
  });

  // Verify token endpoint
  verifyTokenEndpoint = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user;
    const requestId = (req as any).requestId;

    if (!user) {
      throw new UnauthorizedError('Invalid or expired token');
    }

    // Check if user still exists in database
    const dbUser = await User.findOne({ uid: user.uid });
    if (!dbUser) {
      throw new UnauthorizedError('User account no longer exists');
    }

    logger.info('Token verification successful', { 
      uid: user.uid, 
      requestId 
    });

    res.status(200).json(
      ApiResponse.success('Token is valid', {
        user: {
          uid: dbUser.uid,
          name: dbUser.name,
          email: dbUser.email,
          location: dbUser.location
        },
        tokenInfo: {
          issuedAt: new Date(user.iat * 1000).toISOString(),
          expiresAt: new Date(user.exp * 1000).toISOString(),
          isExpired: Date.now() > (user.exp * 1000)
        }
      })
    );
  });

  // Refresh token endpoint (for future implementation)
  refreshToken = asyncHandler(async (req: Request, res: Response) => {
    // This would implement refresh token logic
    // For now, return not implemented
    throw new AppError('Refresh token functionality not implemented', 501);
  });

  // Change password endpoint (for future implementation)
  changePassword = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    // This would implement password change logic
    // For now, return not implemented
    throw new AppError('Password change functionality not implemented', 501);
  });

  // Get authentication status
  getAuthStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json(
        ApiResponse.error('Not authenticated', 'UNAUTHENTICATED', 401)
      );
    }

    const authStatus = {
      authenticated: true,
      user: {
        uid: user.uid,
        name: user.name,
        email: user.email
      },
      token: {
        issuedAt: new Date(user.iat * 1000).toISOString(),
        expiresAt: new Date(user.exp * 1000).toISOString(),
        timeToExpiry: user.exp * 1000 - Date.now()
      }
    };

    res.status(200).json(
      ApiResponse.success('Authentication status retrieved', authStatus)
    );
  });
}

// Export controller instance
const authController = new AuthController();

export const {
  login,
  logout,
  verifyTokenEndpoint,
  refreshToken,
  changePassword,
  getAuthStatus
} = authController;
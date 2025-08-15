import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { logger } from '../utils/loggers';
import { ApiResponse } from '../utils/apiResponse';
import { AppError } from '../utils/errorTypes';

export const globalErrorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = 500;
  let message = 'Internal server error';
  let errorType = 'INTERNAL_ERROR';
  let details: any = undefined;

  // Log error with request context
  const requestInfo = {
    requestId: (req as any).requestId,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    body: req.method !== 'GET' ? req.body : undefined
  };

  logger.error('Global Error Handler:', {
    error: error.message,
    stack: error.stack,
    request: requestInfo
  });

  // Handle specific error types
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
    errorType = 'APPLICATION_ERROR';
  } 
  else if (error instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    message = 'Data validation failed';
    errorType = 'VALIDATION_ERROR';
    details = Object.values(error.errors).map(err => ({
      field: err.path,
      message: err.message,
      value: (err as any).value
    }));
  }
  else if (error instanceof mongoose.Error.CastError) {
    statusCode = 400;
    message = `Invalid ${error.path}: ${error.value}`;
    errorType = 'CAST_ERROR';
  }
  else if ((error as any).code === 11000) {
    statusCode = 409;
    message = 'Duplicate field value';
    errorType = 'DUPLICATE_ERROR';
    
    // Extract field name from MongoDB error
    const duplicateField = Object.keys((error as any).keyPattern)[0];
    details = {
      field: duplicateField,
      message: `${duplicateField} already exists`
    };
  }
  else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
    errorType = 'JWT_ERROR';
  }
  else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
    errorType = 'JWT_EXPIRED';
  }
  else if (error.name === 'MulterError') {
    statusCode = 400;
    errorType = 'FILE_UPLOAD_ERROR';
    
    switch ((error as any).code) {
      case 'LIMIT_FILE_SIZE':
        message = 'File size too large';
        break;
      case 'LIMIT_FILE_COUNT':
        message = 'Too many files';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = 'Unexpected file field';
        break;
      default:
        message = error.message;
    }
  }
  else if (error.message?.includes('ENOTFOUND') || error.message?.includes('ECONNREFUSED')) {
    statusCode = 503;
    message = 'External service unavailable';
    errorType = 'SERVICE_UNAVAILABLE';
  }
  else if (error.message?.includes('timeout')) {
    statusCode = 408;
    message = 'Request timeout';
    errorType = 'TIMEOUT_ERROR';
  }

  // Don't expose sensitive information in production
  if (process.env.NODE_ENV === 'production') {
    if (statusCode === 500) {
      message = 'Something went wrong';
      details = undefined;
    }
  } else {
    // In development, include stack trace
    details = {
      ...details,
      stack: error.stack,
      name: error.name
    };
  }

  res.status(statusCode).json(
    ApiResponse.error(message, errorType, statusCode, details)
  );
};

export const notFoundHandler = (req: Request, res: Response) => {
  const message = `Route ${req.method} ${req.originalUrl} not found`;
  
  logger.warn('Route not found:', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.status(404).json(
    ApiResponse.error(
      message,
      'ROUTE_NOT_FOUND',
      404,
      {
        availableRoutes: [
          'GET /',
          'GET /health',
          'GET /api/v1/schedule/all',
          'POST /api/v1/auth/login',
          'GET /api/v1/users/me'
        ]
      }
    )
  );
};

export const asyncErrorHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Custom error handler for specific scenarios
export const handleDatabaseError = (error: any): AppError => {
  if (error instanceof mongoose.Error.ValidationError) {
    const errors = Object.values(error.errors).map(err => err.message);
    return new AppError(`Invalid input data: ${errors.join(', ')}`, 400);
  }

  if (error instanceof mongoose.Error.CastError) {
    return new AppError(`Invalid ${error.path}: ${error.value}`, 400);
  }

  if (error.code === 11000) {
    const duplicateField = Object.keys(error.keyPattern)[0];
    return new AppError(`Duplicate field value: ${duplicateField}`, 409);
  }

  return new AppError('Database operation failed', 500);
};

export const handleExternalApiError = (error: any, service: string): AppError => {
  if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
    return new AppError(`${service} service is unavailable`, 503);
  }

  if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
    return new AppError(`${service} service timeout`, 408);
  }

  if (error.response) {
    const status = error.response.status;
    const message = error.response.data?.message || `${service} API error`;
    return new AppError(message, status >= 400 && status < 500 ? status : 502);
  }

  return new AppError(`${service} service error`, 502);
};
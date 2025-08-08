// middleware/validation.ts
import { Request, Response, NextFunction } from 'express';
import moment from 'moment';

/**
 * Middleware untuk validasi parameter employee ID
 */
export const validateEmployeeId = (req: Request, res: Response, next: NextFunction) => {
  const { employeeId } = req.params;
  
  if (!employeeId) {
    return res.status(400).json({
      success: false,
      error: 'Employee ID is required'
    });
  }
  
  if (typeof employeeId !== 'string' || employeeId.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Employee ID must be a valid string'
    });
  }
  
  next();
};

/**
 * Middleware untuk validasi parameter month dan year
 */
export const validateMonthYear = (req: Request, res: Response, next: NextFunction) => {
  const { month, year } = req.query;
  
  if (!month || !year) {
    return res.status(400).json({
      success: false,
      error: 'Month and year parameters are required'
    });
  }
  
  const monthNum = parseInt(month as string);
  const yearNum = parseInt(year as string);
  
  if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
    return res.status(400).json({
      success: false,
      error: 'Month must be a number between 1-12'
    });
  }
  
  const currentYear = new Date().getFullYear();
  if (isNaN(yearNum) || yearNum < (currentYear - 5) || yearNum > (currentYear + 5)) {
    return res.status(400).json({
      success: false,
      error: `Year must be between ${currentYear - 5} and ${currentYear + 5}`
    });
  }
  
  next();
};

/**
 * Middleware untuk validasi date range
 */
export const validateDateRange = (req: Request, res: Response, next: NextFunction) => {
  const { start_date, end_date } = req.query;
  
  if (!start_date || !end_date) {
    return res.status(400).json({
      success: false,
      error: 'start_date and end_date parameters are required'
    });
  }
  
  // Validate date format
  const startMoment = moment(start_date as string, 'YYYY-MM-DD', true);
  const endMoment = moment(end_date as string, 'YYYY-MM-DD', true);
  
  if (!startMoment.isValid()) {
    return res.status(400).json({
      success: false,
      error: 'start_date must be in YYYY-MM-DD format'
    });
  }
  
  if (!endMoment.isValid()) {
    return res.status(400).json({
      success: false,
      error: 'end_date must be in YYYY-MM-DD format'
    });
  }
  
  // Check if start_date is before end_date
  if (startMoment.isAfter(endMoment)) {
    return res.status(400).json({
      success: false,
      error: 'start_date must be before or equal to end_date'
    });
  }
  
  // Check if date range is not too large (max 1 year)
  const daysDiff = endMoment.diff(startMoment, 'days');
  if (daysDiff > 365) {
    return res.status(400).json({
      success: false,
      error: 'Date range cannot exceed 365 days'
    });
  }
  
  next();
};

/**
 * Middleware untuk menangani error multer (file upload)
 */
export const handleMulterError = (error: any, req: Request, res: Response, next: NextFunction) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File size too large. Maximum size is 10MB'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: 'Too many files. Only one file is allowed'
      });
    }
    return res.status(400).json({
      success: false,
      error: `File upload error: ${error.message}`
    });
  }
  
  if (error.message === 'Only Excel files are allowed!') {
    return res.status(400).json({
      success: false,
      error: 'Only Excel files (.xlsx, .xls) are allowed'
    });
  }
  
  next(error);
};

/**
 * Global error handler middleware
 */
export const globalErrorHandler = (error: any, req: Request, res: Response, next: NextFunction) => {
  console.error('❌ Global Error:', error);
  
  // MongoDB errors
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Data validation failed',
      details: error.message
    });
  }
  
  if (error.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: 'Invalid data format'
    });
  }
  
  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      error: 'Duplicate data found'
    });
  }
  
  // Default error
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
};

/**
 * Middleware untuk logging requests
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const { method, url, ip } = req;
  
  // Log request
  console.log(`📥 ${method} ${url} - IP: ${ip} - ${new Date().toISOString()}`);
  
  // Override res.json to log response
  const originalJson = res.json;
  res.json = function(body) {
    const duration = Date.now() - start;
    const status = res.statusCode;
    
    // Log response
    const statusEmoji = status >= 400 ? '❌' : status >= 300 ? '⚠️' : '✅';
    console.log(`📤 ${statusEmoji} ${method} ${url} - ${status} - ${duration}ms`);
    
    return originalJson.call(this, body);
  };
  
  next();
};

/**
 * Rate limiting middleware (simple implementation)
 */
export const rateLimiter = (windowMs: number = 15 * 60 * 1000, maxRequests: number = 100) => {
  const requests = new Map();
  
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip;
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Clean old requests
    if (requests.has(ip)) {
      const userRequests = requests.get(ip).filter((time: number) => time > windowStart);
      requests.set(ip, userRequests);
    } else {
      requests.set(ip, []);
    }
    
    const userRequests = requests.get(ip);
    
    if (userRequests.length >= maxRequests) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests. Please try again later.',
        retry_after: Math.ceil(windowMs / 1000)
      });
    }
    
    userRequests.push(now);
    next();
  };
};

import multer from 'multer';
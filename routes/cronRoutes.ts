import express from 'express';
import { cronService } from '../services/cronService';
import { logger } from '../utils/loggers';
import { ApiResponse } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/errorTypes';
import { verifyToken } from '../middlewares/verifyToken';

const router = express.Router();

// Get cron jobs status
router.get('/status', verifyToken, asyncHandler(async (req, res) => {
  const jobsStatus = cronService.getJobsStatus();
  
  res.status(200).json(
    ApiResponse.success('Cron jobs status retrieved successfully', {
      jobs: jobsStatus,
      timestamp: new Date().toISOString()
    })
  );
}));

// Manually trigger attendance fetch
router.post('/trigger/attendance-fetch', verifyToken, asyncHandler(async (req, res) => {
  const requestId = (req as any).requestId;
  
  logger.info('Manual attendance fetch triggered via API', { requestId });
  
  try {
    const result = await cronService.triggerAttendanceFetch();
    
    res.status(200).json(
      ApiResponse.success('Attendance fetch triggered successfully', {
        result,
        triggeredAt: new Date().toISOString(),
        requestId
      })
    );
  } catch (error: any) {
    logger.error('Failed to trigger attendance fetch:', {
      error: error.message,
      requestId
    });
    
    throw new AppError('Failed to trigger attendance fetch', 500);
  }
}));

// Start a specific cron job
router.post('/start/:jobName', verifyToken, asyncHandler(async (req, res) => {
  const { jobName } = req.params;
  const requestId = (req as any).requestId;
  
  if (!jobName) {
    throw new AppError('Job name is required', 400);
  }
  
  logger.info(`Starting cron job: ${jobName}`, { requestId });
  
  const success = cronService.startJob(jobName);
  
  if (!success) {
    throw new AppError(`Job '${jobName}' not found`, 404);
  }
  
  res.status(200).json(
    ApiResponse.success(`Job '${jobName}' started successfully`, {
      jobName,
      action: 'started',
      timestamp: new Date().toISOString()
    })
  );
}));

// Stop a specific cron job
router.post('/stop/:jobName', verifyToken, asyncHandler(async (req, res) => {
  const { jobName } = req.params;
  const requestId = (req as any).requestId;
  
  if (!jobName) {
    throw new AppError('Job name is required', 400);
  }
  
  logger.info(`Stopping cron job: ${jobName}`, { requestId });
  
  const success = cronService.stopJob(jobName);
  
  if (!success) {
    throw new AppError(`Job '${jobName}' not found`, 404);
  }
  
  res.status(200).json(
    ApiResponse.success(`Job '${jobName}' stopped successfully`, {
      jobName,
      action: 'stopped',
      timestamp: new Date().toISOString()
    })
  );
}));

// Get cron job configuration info
router.get('/config', verifyToken, asyncHandler(async (req, res) => {
  const config = {
    attendanceFetch: {
      schedule: process.env.ATTENDANCE_CRON_SCHEDULE || '0 8 * * 1-5',
      timezone: process.env.ATTENDANCE_CRON_TIMEZONE || 'Asia/Jakarta',
      enabled: process.env.ATTENDANCE_CRON_ENABLED !== 'false',
      description: 'Fetch attendance data for all employees'
    },
    environment: {
      NODE_ENV: process.env.NODE_ENV || 'development',
      BASE_URL: process.env.BASE_URL || 'http://localhost:5000'
    }
  };
  
  res.status(200).json(
    ApiResponse.success('Cron configuration retrieved successfully', config)
  );
}));

export default router;
import { Request, Response } from 'express';
import axios, { AxiosResponse } from 'axios';
import Schedule from '../models/schedule';
import Attendance from '../models/Attendance';
import { logger } from '../utils/loggers';
import { ApiResponse } from '../utils/apiResponse';
import { DateHelper } from '../utils/dateHelper';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError, NotFoundError, ExternalApiError } from '../utils/errorTypes';
import { handleExternalApiError } from '../middlewares/errorHandler';
import { ImageService } from '../services/imageService';
import { AttendanceService } from '../services/attendanceService';
import { cache } from '../utils/cache';
import { API_ENDPOINTS, IMAGE_PROCESSING } from '../config/constants';

// Types
interface AttendanceApiResponse {
  success: boolean;
  mset_start_time?: string;
  mset_start_address?: string;
  mset_start_image?: string;
  mset_break_out_time?: string;
  mset_break_out_address?: string;
  mset_break_out_image?: string;
  mset_break_in_time?: string;
  mset_break_in_address?: string;
  mset_break_in_image?: string;
  mset_end_time?: string;
  mset_end_address?: string;
  mset_end_image?: string;
}

interface ProcessedAttendanceData {
  userid: string;
  name: string;
  date: string;
  start_time?: string;
  start_address?: string;
  start_image?: string;
  break_out_time?: string;
  break_out_address?: string;
  break_out_image?: string;
  break_in_time?: string;
  break_in_address?: string;
  break_in_image?: string;
  end_time?: string;
  end_address?: string;
  end_image?: string;
}

class AttendanceController {
  private imageService: ImageService;
  private attendanceService: AttendanceService;

  constructor() {
    this.imageService = new ImageService();
    this.attendanceService = new AttendanceService();
  }

  // Test timezone endpoint for Railway deployment
  testRailwayTimezone = asyncHandler(async (req: Request, res: Response) => {
    const now = new Date();
    const indonesiaTime = DateHelper.getCurrentTimestampIndonesia();
    const currentDate = DateHelper.getCurrentDateIndonesia();

    const timezoneInfo = {
      message: 'Railway Timezone Test',
      serverTime: now.toISOString(),
      serverTimezone: process.env.TZ || 'Not Set',
      detectedTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timezoneOffset: now.getTimezoneOffset(),
      dates: {
        serverLocalDate: now.toLocaleDateString('sv-SE'),
        indonesiaDate: currentDate,
        utcDate: now.toISOString().split('T')[0]
      },
      times: {
        serverTime: now.toString(),
        indonesiaTime: indonesiaTime,
        formattedIndonesiaTime: DateHelper.formatDate(now, 'YYYY-MM-DD HH:mm:ss')
      }
    };

    res.status(200).json(ApiResponse.success('Timezone test completed', timezoneInfo));
  });

  // Fetch attendance data from external API
  private async fetchAttendanceFromAPI(userId: string): Promise<AttendanceApiResponse> {
    const cacheKey = `attendance_api_${userId}_${DateHelper.getCurrentDateIndonesia()}`;
    const cached = cache.get<AttendanceApiResponse>(cacheKey);
    if (cached) {
      logger.info(`Cache hit for attendance data: ${userId}`);
      return cached;
    }
  
    const formData = new URLSearchParams();
    formData.append('userid', userId);
  
    let attempts = 0;
    const maxRetries = 3;
    const url = `${API_ENDPOINTS.ATTENDANCE_API_BASE}/${API_ENDPOINTS.ATTENDANCE_GET_TRIP_REPORT}`;
  
    while (attempts < maxRetries) {
      try {
        const response: AxiosResponse = await axios.post(
          url,
          formData.toString(),
          {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            timeout: 15000,
          }
        );
  
        const data = response.data as AttendanceApiResponse;
        if (data.success) {
          cache.set(cacheKey, data, 300);
        }
        return data;
      } catch (error: any) {
        attempts++;
        logger.warn(`Attempt ${attempts} failed for user ${userId}: ${error.message}`);
        if (attempts >= maxRetries) {
          logger.error(`Failed to fetch attendance after ${maxRetries} attempts`, {
            error: error.message,
            status: error.response?.status,
            data: error.response?.data
          });
          throw handleExternalApiError(error, 'Attendance API');
        }
        await new Promise(res => setTimeout(res, 1000)); // delay sebelum retry
      }
    }
  
    throw new AppError('Unexpected error in fetchAttendanceFromAPI', 500);
  }
  // Process and save attendance data
  private async processAttendanceData(
    userId: string,
    scheduleName: string,
    apiData: AttendanceApiResponse,
    date: string
  ): Promise<ProcessedAttendanceData> {
    try {
      // Process images in parallel
      const imageProcessingPromises = [
        { type: 'start', url: apiData.mset_start_image },
        { type: 'break_out', url: apiData.mset_break_out_image },
        { type: 'break_in', url: apiData.mset_break_in_image },
        { type: 'end', url: apiData.mset_end_image },
      ].map(async ({ type, url }) => {
        if (!url) return { type, url: undefined };
        
        try {
          const processedUrl = await this.imageService.processAndUploadImage(
            url,
            userId,
            date,
            type
          );
          return { type, url: processedUrl };
        } catch (error) {
          logger.warn(`Failed to process ${type} image for user ${userId}:`, error);
          return { type, url }; // Return original URL as fallback
        }
      });

      const imageResults = await Promise.allSettled(imageProcessingPromises);
      const processedImages: Record<string, string | undefined> = {};

      imageResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.url) {
          const imageType = ['start', 'break_out', 'break_in', 'end'][index];
          processedImages[`${imageType}_image`] = result.value.url;
        }
      });

      const attendanceData: ProcessedAttendanceData = {
        userid: userId,
        name: scheduleName,
        date: date,
        start_time: apiData.mset_start_time,
        start_address: apiData.mset_start_address,
        start_image: processedImages.start_image || apiData.mset_start_image,
        break_out_time: apiData.mset_break_out_time,
        break_out_address: apiData.mset_break_out_address,
        break_out_image: processedImages.break_out_image || apiData.mset_break_out_image,
        break_in_time: apiData.mset_break_in_time,
        break_in_address: apiData.mset_break_in_address,
        break_in_image: processedImages.break_in_image || apiData.mset_break_in_image,
        end_time: apiData.mset_end_time,
        end_address: apiData.mset_end_address,
        end_image: processedImages.end_image || apiData.mset_end_image,
      };

      return attendanceData;
      
    } catch (error) {
      logger.error(`Failed to process attendance data for user ${userId}:`, error);
      throw new AppError('Failed to process attendance data', 500);
    }
  }

  // Main method to fetch attendance for all employees
  fetchAttendance = asyncHandler(async (req: Request, res: Response) => {
    const requestId = (req as any).requestId;
    logger.info(`Starting bulk attendance fetch process`, { requestId });

    const schedules = await Schedule.find({ 
      employee_id: { $ne: null, $exists: true } 
    });
    
    if (schedules.length === 0) {
      return res.status(200).json(
        ApiResponse.success('No schedules found with employee IDs', {
          processed: 0,
          success: 0,
          failed: 0,
          total: 0
        })
      );
    }

    const attendanceDate = DateHelper.getCurrentDateIndonesia();
    const batchSize = IMAGE_PROCESSING.BATCH_SIZE;
    
    let successCount = 0;
    let failCount = 0;
    const results: Array<{ userId: string; status: 'success' | 'failed'; error?: string }> = [];

    // Process in batches to avoid overwhelming external services
    for (let i = 0; i < schedules.length; i += batchSize) {
      const batch = schedules.slice(i, i + batchSize);
      
      logger.info(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(schedules.length / batchSize)}`, {
        requestId,
        batchSize: batch.length
      });

      const batchPromises = batch.map(async (schedule) => {
        const userId = schedule.employee_id;
        if (!userId) return { userId: 'unknown', status: 'failed' as const, error: 'Missing employee ID' };

        try {
          const apiData = await this.fetchAttendanceFromAPI(userId);

          if (!apiData.success) {
            return { userId, status: 'failed' as const, error: 'API returned unsuccessful response' };
          }

          const attendanceData = await this.processAttendanceData(
            userId,
            schedule.name,
            apiData,
            attendanceDate
          );

          await this.attendanceService.saveAttendanceData(attendanceData);
          
          logger.info(`Successfully processed attendance for user ${userId}`, { requestId });
          return { userId, status: 'success' as const };

        } catch (error: any) {
          logger.error(`Failed to process attendance for user ${userId}:`, {
            error: error.message,
            requestId
          });
          return { userId, status: 'failed' as const, error: error.message };
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          const { status } = result.value;
          if (status === 'success') {
            successCount++;
          } else {
            failCount++;
          }
          results.push(result.value);
        } else {
          failCount++;
          results.push({ userId: 'unknown', status: 'failed', error: result.reason?.message });
        }
      });

      // Add delay between batches
      if (i + batchSize < schedules.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Clear cache after bulk operation
    cache.flush();

    const responseData = {
      processed: schedules.length,
      success: successCount,
      failed: failCount,
      total: schedules.length,
      date: attendanceDate,
      results: results.slice(0, 10), // Show first 10 results to avoid large response
      hasMoreResults: results.length > 10
    };

    logger.info('Bulk attendance fetch completed', { 
      requestId, 
      ...responseData 
    });

    res.status(200).json(
      ApiResponse.success('Attendance fetch process completed', responseData)
    );
  });

  // Fetch attendance for a specific user
  fetchAttendanceByUser = asyncHandler(async (req: Request, res: Response) => {
    const { employeeId } = req.params;
    const requestId = (req as any).requestId;

    if (!employeeId) {
      throw new AppError('Employee ID is required', 400);
    }

    logger.info(`Fetching attendance for user ${employeeId}`, { requestId });

    const schedule = await Schedule.findOne({ employee_id: employeeId });
    if (!schedule) {
      throw new NotFoundError(`Employee ${employeeId} not found in schedule`);
    }

    const attendanceDate = DateHelper.getCurrentDateIndonesia();
    
    try {
      const apiData = await this.fetchAttendanceFromAPI(employeeId);

      if (!apiData.success) {
        throw new ExternalApiError('Attendance API returned unsuccessful response');
      }

      const attendanceData = await this.processAttendanceData(
        employeeId,
        schedule.name,
        apiData,
        attendanceDate
      );

      const savedAttendance = await this.attendanceService.saveAttendanceData(attendanceData);

      logger.info(`Successfully processed attendance for user ${employeeId}`, { 
        requestId, 
        date: attendanceDate 
      });

      res.status(200).json(
        ApiResponse.success('Attendance data fetched and saved successfully', {
          attendance: savedAttendance,
          meta: {
            processedDate: attendanceDate,
            serverTime: new Date().toISOString(),
            timezone: 'Asia/Jakarta'
          }
        })
      );

    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logger.error(`Failed to fetch attendance for user ${employeeId}:`, {
        error: error.message,
        requestId
      });
      
      throw new AppError('Failed to fetch user attendance', 500);
    }
  });

  // Get attendance by filter (date, month, year)
  getAttendanceByFilter = asyncHandler(async (req: Request, res: Response) => {
    const { employeeId } = req.params;
    const { date, month, year } = req.query;

    if (!employeeId || !date || !month || !year) {
      throw new AppError('Missing required parameters: employeeId, date, month, and year', 400);
    }

    // Validate date format
    const dateString = `${year}-${String(month).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
    
    if (!DateHelper.isValidDate(dateString)) {
      throw new AppError('Invalid date format', 400);
    }

    const cacheKey = `attendance_${employeeId}_${dateString}`;
    const cached = cache.get(cacheKey);
    
    if (cached) {
      return res.status(200).json(
        ApiResponse.success('Attendance record retrieved successfully (cached)', cached)
      );
    }

    const attendance = await Attendance.findOne({
      userid: employeeId,
      date: dateString
    });

    if (!attendance) {
      throw new NotFoundError(
        `No attendance record found for employee ${employeeId} on ${dateString}`
      );
    }

    // Cache the result for 5 minutes
    cache.set(cacheKey, attendance, 300);

    res.status(200).json(
      ApiResponse.success('Attendance record retrieved successfully', attendance)
    );
  });

  // Migration endpoints
  migrateExistingImages = asyncHandler(async (req: Request, res: Response) => {
    const { limit = 50, skip = 0, forceUpdate = false } = req.query;
    const requestId = (req as any).requestId;
    
    const limitNum = parseInt(limit as string, 10) || 50;
    const skipNum = parseInt(skip as string, 10) || 0;
    const shouldForceUpdate = forceUpdate === 'true';

    logger.info('Starting image migration process', {
      requestId,
      limit: limitNum,
      skip: skipNum,
      forceUpdate: shouldForceUpdate
    });

    const result = await this.imageService.migrateExistingImages(
      limitNum,
      skipNum,
      shouldForceUpdate
    );

    res.status(200).json(
      ApiResponse.success('Image migration process completed', result)
    );
  });

  getMigrationStats = asyncHandler(async (req: Request, res: Response) => {
    const stats = await this.imageService.getMigrationStatistics();
    
    res.status(200).json(
      ApiResponse.success('Migration statistics retrieved successfully', stats)
    );
  });
}

// Export controller instance
const attendanceController = new AttendanceController();

export const {
  testRailwayTimezone,
  fetchAttendance,
  fetchAttendanceByUser,
  getAttendanceByFilter,
  migrateExistingImages,
  getMigrationStats
} = attendanceController;
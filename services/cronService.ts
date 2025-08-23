import * as cron from 'node-cron';
import axios from 'axios';
import { logger } from '../utils/loggers';
import { ApiResponse } from '../utils/apiResponse';
import { DateHelper } from '../utils/dateHelper';
import { validateEnvironment } from '../config/environment';
import { jobQueueService } from './jobQueueService';

interface CronJobConfig {
  schedule: string;
  timezone: string;
  enabled: boolean;
}

interface AttendanceFetchResult {
  success: boolean;
  processed: number;
  successCount: number;
  failedCount: number;
  date: string;
  timestamp: string;
}

interface LoginResponse {
  success: boolean;
  data: {
    token: string;
    user: {
      uid: string;
      name: string;
      email?: string;
      location?: string;
    };
    expiresIn: string;
  };
}

class CronService {
  private jobs: Map<string, cron.ScheduledTask> = new Map();
  private baseUrl: string;
  private isInitialized: boolean = false;
  private authToken: string | null = null;
  private tokenExpiry: Date | null = null;
  private readonly config = validateEnvironment();
  private readonly credentials = {
    username: this.config.CRON_AUTH_USERNAME || '2405047',
    password: this.config.CRON_AUTH_PASSWORD || '@qwerty12345'
  };

  constructor() {
    this.baseUrl = this.determineBaseUrl();
    
    logger.info(`CronService initialized with base URL: ${this.baseUrl}`, {
      environment: process.env.NODE_ENV,
      isRailway: this.isRailwayEnvironment(),
      availableEnvVars: this.getAvailableUrlEnvVars()
    });
  }

  /**
   * Determine the appropriate base URL for the current environment
   */
  private determineBaseUrl(): string {
    // For development environment, always use localhost
    if (process.env.NODE_ENV !== 'production') {
      const port = this.config.PORT || '5000';
      const localUrl = `http://localhost:${port}`;
      logger.info('Using localhost URL for CronService (development)', { url: localUrl });
      return localUrl;
    }

    // Check if running on Railway
    if (this.isRailwayEnvironment()) {
      const railwayUrl = process.env.RAILWAY_STATIC_URL || this.config.BASE_URL;
      if (railwayUrl) {
        logger.info('Using Railway URL for CronService', { url: railwayUrl });
        return railwayUrl;
      }
    }

    // Check for explicit BASE_URL
    if (this.config.BASE_URL) {
      logger.info('Using BASE_URL for CronService', { url: this.config.BASE_URL });
      return this.config.BASE_URL;
    }

    // Default to localhost with PORT
    const port = this.config.PORT || '5000';
    const defaultUrl = `http://localhost:${port}`;
    logger.info('Using default localhost URL for CronService', { url: defaultUrl });
    return defaultUrl;
  }

  /**
   * Check if running in Railway environment
   */
  private isRailwayEnvironment(): boolean {
    return !!(process.env.RAILWAY_STATIC_URL || 
              process.env.RAILWAY_PUBLIC_DOMAIN || 
              process.env.RAILWAY_DOMAIN ||
              process.env.RAILWAY_ENVIRONMENT);
  }

  /**
   * Get available URL environment variables for debugging
   */
  private getAvailableUrlEnvVars(): Record<string, string | undefined> {
    return {
      BASE_URL: process.env.BASE_URL,
      RAILWAY_STATIC_URL: process.env.RAILWAY_STATIC_URL,
      PUBLIC_DOMAIN: process.env.PUBLIC_DOMAIN,
      RAILWAY_PUBLIC_DOMAIN: process.env.RAILWAY_PUBLIC_DOMAIN,
      RAILWAY_DOMAIN: process.env.RAILWAY_DOMAIN,
      PORT: process.env.PORT
    };
  }

  /**
   * Initialize cron service with default jobs
   */
  public initialize(): void {
    if (this.isInitialized) {
      logger.warn('CronService already initialized');
      return;
    }

    try {
      // Setup attendance fetch cronjob
      this.setupAttendanceFetchJob();
      
      this.isInitialized = true;
      logger.info('CronService initialized successfully');
    } catch (error: any) {
      logger.error('Failed to initialize CronService:', error.message);
      throw error;
    }
  }

  /**
   * Setup cronjob untuk fetch attendance data
   */
  private setupAttendanceFetchJob(): void {
    const enabled = process.env.ATTENDANCE_CRON_ENABLED !== 'false'; // Default: enabled
    const timezone = process.env.ATTENDANCE_CRON_TIMEZONE || 'Asia/Jakarta';
    
    if (!enabled) {
      logger.info('Attendance fetch cronjob is disabled');
      return;
    }

    // Setup main schedule (07:00, 08:00, 13:00, 18:00)
    const mainSchedule = process.env.ATTENDANCE_CRON_SCHEDULE || '0 7,8,13,18 * * *';
    logger.info(`Setting up main attendance fetch cronjob with schedule: ${mainSchedule} (${timezone})`);

    const mainTask = cron.schedule(
      mainSchedule,
      async () => {
        await this.executeAttendanceFetch();
      },
      {
        timezone: timezone
      }
    );

    this.jobs.set('attendance-fetch-main', mainTask);
    mainTask.start(); // Start the cron job
    logger.info('Main attendance fetch cronjob scheduled and started successfully');
    logger.info(`Main cronjob status after start: running=${mainTask && typeof mainTask.start === 'function'}`);

    // Setup night schedule (23:50) if configured
    const nightSchedule = process.env.ATTENDANCE_CRON_SCHEDULE_NIGHT;
    if (nightSchedule) {
      logger.info(`Setting up night attendance fetch cronjob with schedule: ${nightSchedule} (${timezone})`);
      
      const nightTask = cron.schedule(
        nightSchedule,
        async () => {
          await this.executeAttendanceFetch();
        },
        {
          timezone: timezone
        }
      );

      this.jobs.set('attendance-fetch-night', nightTask);
      nightTask.start(); // Start the cron job
      logger.info('Night attendance fetch cronjob scheduled and started successfully');
      logger.info(`Night cronjob status after start: running=${nightTask && typeof nightTask.start === 'function'}`);
    }
  }

  /**
   * Authenticate and get access token using HTTP request
   */
  private async authenticate(): Promise<string> {
    try {
      // Check if we have a valid token
      if (this.authToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
        return this.authToken;
      }

      logger.info('Authenticating for cronjob access using HTTP request...');

      const response = await axios.post(
        `${this.baseUrl}/api/v1/auth/login`,
        {
          username: this.credentials.username,
          password: this.credentials.password
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'CronService/1.0'
          },
          timeout: 10000
        }
      );

      const responseData = response.data;

      if (!responseData || !responseData.success || !responseData.data?.token) {
        logger.error('Invalid response structure from auth API:', {
          hasResponseData: !!responseData,
          success: responseData?.success,
          hasData: !!responseData?.data,
          hasToken: !!responseData?.data?.token,
          responseData: responseData
        });
        throw new Error('Login failed: Invalid response from auth API');
      }

      this.authToken = responseData.data.token;
      
      // Set token expiry (assuming 7 days default, subtract 1 hour for safety)
      const expiryHours = responseData.data.expiresIn === '7d' ? 7 * 24 - 1 : 23;
      this.tokenExpiry = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

      logger.info('Authentication successful for cronjob', {
        user: responseData.data.user.name,
        expiresIn: responseData.data.expiresIn
      });

      if (!this.authToken) {
        throw new Error('Auth token is null after authentication');
      }
      return this.authToken;

    } catch (error: any) {
      logger.error('Authentication failed for cronjob:', {
        error: error.message,
        stack: error.stack
      });
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }

  /**
   * Execute attendance fetch job with retry mechanism
   */
  private async executeAttendanceFetch(): Promise<void> {
    const jobId = `attendance-fetch-${Date.now()}`;
    const startTime = new Date();
    const maxRetries = 3;
    let lastError: Error | null = null;
    
    logger.info(`Starting scheduled attendance fetch job`, { 
      jobId, 
      startTime,
      baseUrl: this.baseUrl,
      environment: process.env.NODE_ENV
    });

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.info(`Attendance fetch attempt ${attempt}/${maxRetries}`, { jobId });
        
        // Call internal attendance fetch endpoint
        const result = await this.callAttendanceFetchEndpoint();
        
        const endTime = new Date();
        const duration = endTime.getTime() - startTime.getTime();

        logger.info('Scheduled attendance fetch completed successfully', {
          jobId,
          attempt,
          duration: `${duration}ms`,
          result: {
            processed: result.processed,
            success: result.successCount,
            failed: result.failedCount,
            date: result.date
          }
        });

        // Log summary for monitoring
        this.logJobSummary('attendance-fetch', true, result, duration);
        return; // Success, exit retry loop

      } catch (error: any) {
        lastError = error;
        logger.warn(`Attendance fetch attempt ${attempt}/${maxRetries} failed`, {
          jobId,
          error: error.message,
          willRetry: attempt < maxRetries
        });

        // Wait before retry (exponential backoff)
        if (attempt < maxRetries) {
          const waitTime = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }

    // All retries failed
    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();

    logger.error('Scheduled attendance fetch failed after all retries', {
      jobId,
      attempts: maxRetries,
      duration: `${duration}ms`,
      error: lastError?.message,
      stack: lastError?.stack
    });

    // Log failure for monitoring
    this.logJobSummary('attendance-fetch', false, null, duration, lastError?.message);
  }

  /**
   * Call attendance fetch endpoint internally
   */
  private async callAttendanceFetchEndpoint(): Promise<AttendanceFetchResult> {
    try {
      // Get authentication token
      const token = await this.authenticate();
      
      // Make HTTP request to attendance fetch endpoint with triggeredBy parameter
      const response = await axios.post(
        `${this.baseUrl}/api/v1/attendance/fetch-all`,
        { triggeredBy: 'cron' },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'User-Agent': 'CronService/1.0'
          },
          timeout: 10000 // Reduced timeout since we expect immediate response
        }
      );

      const responseData = response.data;

      // Handle async response (202 status)
      if (response.status === 202 && responseData?.success && responseData?.data?.jobId) {
        const jobId = responseData.data.jobId;
        logger.info('Attendance fetch started asynchronously', { jobId });
        
        // Wait for job completion and return result
        return await this.waitForJobCompletion(jobId, token);
      }

      // Handle legacy synchronous response (200 status)
      if (response.status === 200 && responseData?.success) {
        return {
          success: true,
          processed: responseData.data.processed || 0,
          successCount: responseData.data.success || 0,
          failedCount: responseData.data.failed || 0,
          date: responseData.data.date || DateHelper.getCurrentDateIndonesia(),
          timestamp: new Date().toISOString()
        };
      }

      // Handle error responses
      if (response.status === 409) {
        logger.warn('Attendance fetch already running', responseData);
        throw new Error('Attendance fetch is already running');
      }

      logger.error('Invalid response structure from attendance API:', {
        status: response.status,
        hasResponseData: !!responseData,
        success: responseData?.success,
        hasData: !!responseData?.data,
        responseData: responseData
      });
      throw new Error('Attendance fetch returned unsuccessful response');

    } catch (error: any) {
      if (error.response) {
        logger.error('HTTP error in attendance fetch:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        });
        throw new Error(`Attendance fetch failed: HTTP ${error.response.status} - ${error.response.data?.error || error.response.statusText}`);
      } else if (error.request) {
        logger.error('Network error in attendance fetch:', error.message);
        throw new Error(`Network error: ${error.message}`);
      } else {
        logger.error('Failed to call attendance fetch endpoint:', error.message);
        throw error;
      }
    }
  }

  /**
   * Wait for async job completion and return result
   */
  private async waitForJobCompletion(jobId: string, token: string): Promise<AttendanceFetchResult> {
    const maxWaitTime = 10 * 60 * 1000; // 10 minutes max wait
    const pollInterval = 5000; // Poll every 5 seconds
    const startTime = Date.now();
    
    logger.info(`Waiting for job completion: ${jobId}`);

    while (Date.now() - startTime < maxWaitTime) {
      try {
        const statusResponse = await axios.get(
          `${this.baseUrl}/api/v1/attendance/job-status/${jobId}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
              'User-Agent': 'CronService/1.0'
            },
            timeout: 5000
          }
        );

        const job = statusResponse.data?.data;
        
        if (!job) {
          throw new Error('Job not found');
        }

        logger.info(`Job ${jobId} status: ${job.status}`, {
          progress: job.progress,
          duration: Date.now() - startTime
        });

        if (job.status === 'completed') {
          return {
            success: true,
            processed: job.result?.totalUsers || 0,
            successCount: job.result?.successCount || 0,
            failedCount: job.result?.failureCount || 0,
            date: DateHelper.getCurrentDateIndonesia(),
            timestamp: new Date().toISOString()
          };
        }

        if (job.status === 'failed') {
          throw new Error(`Job failed: ${job.error}`);
        }

        // Continue polling if job is still running
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        
      } catch (error: any) {
        if (error.response?.status === 404) {
          throw new Error('Job not found or expired');
        }
        logger.error('Error checking job status:', error.message);
        throw error;
      }
    }

    throw new Error(`Job ${jobId} timed out after ${maxWaitTime / 1000} seconds`);
  }

  /**
   * Log job summary for monitoring purposes
   */
  private logJobSummary(
    jobName: string, 
    success: boolean, 
    result: AttendanceFetchResult | null, 
    duration: number,
    errorMessage?: string
  ): void {
    const summary = {
      job: jobName,
      success,
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      ...(result && {
        processed: result.processed,
        successCount: result.successCount,
        failedCount: result.failedCount,
        date: result.date
      }),
      ...(errorMessage && { error: errorMessage })
    };

    if (success) {
      logger.info('Cronjob Summary:', summary);
    } else {
      logger.error('Cronjob Summary (Failed):', summary);
    }
  }

  /**
   * Start a specific job
   */
  public startJob(jobName: string): boolean {
    const job = this.jobs.get(jobName);
    if (!job) {
      logger.warn(`Job '${jobName}' not found`);
      return false;
    }

    job.start();
    logger.info(`Job '${jobName}' started`);
    return true;
  }

  /**
   * Stop a specific job
   */
  public stopJob(jobName: string): boolean {
    const job = this.jobs.get(jobName);
    if (!job) {
      logger.warn(`Job '${jobName}' not found`);
      return false;
    }

    job.stop();
    logger.info(`Job '${jobName}' stopped`);
    return true;
  }

  /**
   * Get status of all jobs
   */
  public getJobsStatus(): Array<{ name: string; running: boolean }> {
    const status: Array<{ name: string; running: boolean }> = [];
    
    this.jobs.forEach((job, name) => {
      // Check if job is running by checking if it's scheduled and not destroyed
      let isRunning = false;
      try {
        // If job exists and we can call methods on it, it's running
        isRunning = job && typeof job.start === 'function' && typeof job.stop === 'function';
        logger.debug(`Job ${name} status check: exists=${!!job}, hasStartMethod=${typeof job?.start === 'function'}, running=${isRunning}`);
      } catch (error) {
        isRunning = false;
        logger.debug(`Job ${name} status check failed:`, error);
      }
      
      status.push({
        name,
        running: isRunning
      });
    });

    logger.info(`Current jobs status:`, status);
    return status;
  }

  /**
   * Manually trigger attendance fetch job
   */
  public async triggerAttendanceFetch(): Promise<AttendanceFetchResult> {
    logger.info('Manually triggering attendance fetch job');
    
    try {
      const result = await this.callAttendanceFetchEndpoint();
      logger.info('Manual attendance fetch completed successfully', result);
      return result;
    } catch (error: any) {
      logger.error('Manual attendance fetch failed:', error.message);
      throw error;
    }
  }

  /**
   * Stop all jobs and cleanup
   */
  public shutdown(): void {
    logger.info('Shutting down CronService...');
    
    this.jobs.forEach((job, name) => {
      job.stop();
      logger.info(`Stopped job: ${name}`);
    });
    
    this.jobs.clear();
    this.isInitialized = false;
    
    logger.info('CronService shutdown completed');
  }
}

// Export singleton instance
export const cronService = new CronService();
export default CronService;
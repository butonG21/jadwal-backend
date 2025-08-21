import * as cron from 'node-cron';
import axios from 'axios';
import { logger } from '../utils/loggers';
import { ApiResponse } from '../utils/apiResponse';
import { DateHelper } from '../utils/dateHelper';
import { validateEnvironment } from '../config/environment';

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
    // For Railway deployment, use the Railway URL if available
    // Railway provides RAILWAY_STATIC_URL or we can construct from environment
    if (process.env.NODE_ENV === 'production' && process.env.RAILWAY_STATIC_URL) {
      this.baseUrl = `https://${process.env.RAILWAY_STATIC_URL}`;
    } else if (process.env.NODE_ENV === 'production' && process.env.PORT) {
      // Fallback for production without Railway URL
      this.baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT}`;
    } else {
      this.baseUrl = process.env.BASE_URL || 'http://localhost:5000';
    }
    
    logger.info(`CronService initialized with base URL: ${this.baseUrl}`);
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
   * Authenticate and get access token
   */
  private async authenticate(): Promise<string> {
    try {
      // Check if we have a valid token
      if (this.authToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
        return this.authToken;
      }

      logger.info('Authenticating for cronjob access...');

      const response = await axios.post(`${this.baseUrl}/api/v1/auth/login`, {
        username: this.credentials.username,
        password: this.credentials.password
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      const loginData: LoginResponse = response.data;

      if (!loginData.success || !loginData.data.token) {
        throw new Error('Login failed: Invalid response from auth endpoint');
      }

      this.authToken = loginData.data.token;
      
      // Set token expiry (assuming 7 days default, subtract 1 hour for safety)
      const expiryHours = loginData.data.expiresIn === '7d' ? 7 * 24 - 1 : 23;
      this.tokenExpiry = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

      logger.info('Authentication successful for cronjob', {
        user: loginData.data.user.name,
        expiresIn: loginData.data.expiresIn
      });

      return this.authToken;

    } catch (error: any) {
      logger.error('Authentication failed for cronjob:', {
        error: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText
      });
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }

  /**
   * Execute attendance fetch job
   */
  private async executeAttendanceFetch(): Promise<void> {
    const jobId = `attendance-fetch-${Date.now()}`;
    const startTime = new Date();
    
    logger.info(`Starting scheduled attendance fetch job`, { jobId, startTime });

    try {
      // Call internal attendance fetch endpoint
      const result = await this.callAttendanceFetchEndpoint();
      
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      logger.info('Scheduled attendance fetch completed successfully', {
        jobId,
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

    } catch (error: any) {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      logger.error('Scheduled attendance fetch failed', {
        jobId,
        duration: `${duration}ms`,
        error: error.message,
        stack: error.stack
      });

      // Log failure for monitoring
      this.logJobSummary('attendance-fetch', false, null, duration, error.message);
    }
  }

  /**
   * Call attendance fetch endpoint internally
   */
  private async callAttendanceFetchEndpoint(): Promise<AttendanceFetchResult> {
    try {
      // Get authentication token
      const token = await this.authenticate();
      
      // Import attendance controller to call directly (more efficient than HTTP call)
      const { fetchAttendance } = await import('../controllers/attendanceController');
      
      // Create mock request and response objects with auth token
      const mockReq = {
        requestId: `cron-${Date.now()}`,
        headers: {
          authorization: `Bearer ${token}`
        },
        body: {},
        params: {},
        query: {},
        user: {
          uid: '2405047',
          name: 'Cron Service',
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60)
        }
      } as any;

      let responseData: any = null;
      const mockRes = {
        status: (code: number) => ({
          json: (data: any) => {
            responseData = data;
            return mockRes;
          }
        })
      } as any;

      const mockNext = (error?: any) => {
        if (error) throw error;
      };

      // Call the controller method directly
      await fetchAttendance(mockReq, mockRes, mockNext);

      if (!responseData || !responseData.success) {
        throw new Error('Attendance fetch returned unsuccessful response');
      }

      return {
        success: true,
        processed: responseData.data.processed || 0,
        successCount: responseData.data.success || 0,
        failedCount: responseData.data.failed || 0,
        date: responseData.data.date || DateHelper.getCurrentDateIndonesia(),
        timestamp: new Date().toISOString()
      };

    } catch (error: any) {
      logger.error('Failed to call attendance fetch endpoint:', error.message);
      throw error;
    }
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
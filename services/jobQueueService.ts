import { logger } from '../utils/loggers';

export interface JobStatus {
  id: string;
  type: 'attendance-fetch';
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime?: Date;
  endTime?: Date;
  progress?: {
    current: number;
    total: number;
    currentBatch?: number;
    totalBatches?: number;
  };
  result?: {
    totalUsers: number;
    successCount: number;
    failureCount: number;
    errors?: string[];
  };
  error?: string;
  triggeredBy: 'manual' | 'cron';
  createdAt: Date;
  updatedAt: Date;
}

class JobQueueService {
  private jobs: Map<string, JobStatus> = new Map();
  private readonly MAX_JOBS_HISTORY = 50; // Keep last 50 jobs

  /**
   * Create a new job
   */
  createJob(type: 'attendance-fetch', triggeredBy: 'manual' | 'cron'): string {
    const jobId = this.generateJobId();
    const job: JobStatus = {
      id: jobId,
      type,
      status: 'pending',
      triggeredBy,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.jobs.set(jobId, job);
    this.cleanupOldJobs();
    
    logger.info(`Job created: ${jobId} (${type}) triggered by ${triggeredBy}`);
    return jobId;
  }

  /**
   * Start a job
   */
  startJob(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    job.status = 'running';
    job.startTime = new Date();
    job.updatedAt = new Date();
    
    logger.info(`Job started: ${jobId}`);
  }

  /**
   * Update job progress
   */
  updateProgress(jobId: string, progress: JobStatus['progress']): void {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    job.progress = progress;
    job.updatedAt = new Date();
    
    if (progress?.currentBatch && progress?.totalBatches) {
      logger.info(`Job ${jobId} progress: batch ${progress.currentBatch}/${progress.totalBatches}`);
    }
  }

  /**
   * Complete a job successfully
   */
  completeJob(jobId: string, result: JobStatus['result']): void {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    job.status = 'completed';
    job.endTime = new Date();
    job.result = result;
    job.updatedAt = new Date();
    
    const duration = job.endTime.getTime() - (job.startTime?.getTime() || job.createdAt.getTime());
    logger.info(`Job completed: ${jobId} in ${Math.round(duration / 1000)}s - ${result?.successCount}/${result?.totalUsers} users processed`);
  }

  /**
   * Fail a job
   */
  failJob(jobId: string, error: string): void {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    job.status = 'failed';
    job.endTime = new Date();
    job.error = error;
    job.updatedAt = new Date();
    
    logger.error(`Job failed: ${jobId} - ${error}`);
  }

  /**
   * Get job status
   */
  getJob(jobId: string): JobStatus | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Get all jobs
   */
  getAllJobs(): JobStatus[] {
    return Array.from(this.jobs.values()).sort((a, b) => 
      b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  /**
   * Get running jobs
   */
  getRunningJobs(): JobStatus[] {
    return Array.from(this.jobs.values())
      .filter(job => job.status === 'running')
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Check if there's already a running attendance fetch job
   */
  hasRunningAttendanceFetch(): boolean {
    return Array.from(this.jobs.values())
      .some(job => job.type === 'attendance-fetch' && job.status === 'running');
  }

  /**
   * Get latest job of specific type
   */
  getLatestJob(type: 'attendance-fetch'): JobStatus | undefined {
    return Array.from(this.jobs.values())
      .filter(job => job.type === type)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
  }

  /**
   * Generate unique job ID
   */
  private generateJobId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `job_${timestamp}_${random}`;
  }

  /**
   * Clean up old jobs to prevent memory leak
   */
  private cleanupOldJobs(): void {
    const jobs = Array.from(this.jobs.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    if (jobs.length > this.MAX_JOBS_HISTORY) {
      const jobsToRemove = jobs.slice(this.MAX_JOBS_HISTORY);
      jobsToRemove.forEach(job => {
        this.jobs.delete(job.id);
      });
      
      logger.info(`Cleaned up ${jobsToRemove.length} old jobs`);
    }
  }

  /**
   * Get job statistics
   */
  getStats(): {
    total: number;
    running: number;
    completed: number;
    failed: number;
    pending: number;
  } {
    const jobs = Array.from(this.jobs.values());
    return {
      total: jobs.length,
      running: jobs.filter(j => j.status === 'running').length,
      completed: jobs.filter(j => j.status === 'completed').length,
      failed: jobs.filter(j => j.status === 'failed').length,
      pending: jobs.filter(j => j.status === 'pending').length
    };
  }
}

// Export singleton instance
export const jobQueueService = new JobQueueService();
export default jobQueueService;
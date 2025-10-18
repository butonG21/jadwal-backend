import { Request, Response } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../utils/loggers';
import { ApiResponse } from '../utils/apiResponse';

const execAsync = promisify(exec);

export class WebhookController {
  private projectPath = '/shiftly/jadwal-backend';
  private isDeploying = false;

  async handleGitHubWebhook(req: Request, res: Response): Promise<void> {
    try {
      // Debug logging for request details
      logger.info(`Webhook request headers: ${JSON.stringify(req.headers)}`);
      logger.info(`Webhook request body: ${JSON.stringify(req.body)}`);
      logger.info(`Webhook request content-type: ${req.headers['content-type']}`);
      
      // Validate GitHub webhook signature if secret is configured
      const signature = req.headers['x-hub-signature-256'] as string;
      const event = req.headers['x-github-event'] as string;
      
      if (!this.validateWebhookSignature(req, signature)) {
        res.status(401).json(ApiResponse.error('Invalid webhook signature'));
        return;
      }

      // Only process push events to master/main branch
      if (event !== 'push') {
        res.status(200).json(ApiResponse.success('Event ignored - not a push event'));
        return;
      }

      // Handle different payload formats (JSON vs form-encoded)
      let payload = req.body;
      
      // If GitHub sends as form-encoded, the payload will be in a 'payload' field
      if (typeof payload === 'object' && payload.payload && typeof payload.payload === 'string') {
        try {
          payload = JSON.parse(payload.payload);
          logger.info('Parsed form-encoded payload');
        } catch (error) {
          logger.error('Failed to parse form-encoded payload:', error);
        }
      }
      
      const branch = payload.ref?.split('/').pop();
      
      // Add debug logging
      logger.info(`Webhook received - ref: ${payload.ref}, extracted branch: ${branch}`);
      
      if (branch !== 'master' && branch !== 'main') {
        logger.info(`Branch '${branch}' is not master/main, ignoring push`);
        res.status(200).json(ApiResponse.success('Push ignored - not master/main branch'));
        return;
      }

      // Prevent concurrent deployments
      if (this.isDeploying) {
        res.status(429).json(ApiResponse.error('Deployment already in progress'));
        return;
      }

      this.isDeploying = true;
      
      // Start deployment process asynchronously
      this.startDeploymentProcess(payload);
      
      res.status(200).json(ApiResponse.success('Deployment started successfully'));
    } catch (error) {
      logger.error('Webhook processing error:', error);
      this.isDeploying = false;
      res.status(500).json(ApiResponse.error('Internal server error'));
    }
  }

  private validateWebhookSignature(req: Request, signature: string): boolean {
    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
    
    // If no secret is configured, allow the webhook (for development)
    if (!webhookSecret) {
      logger.warn('No GITHUB_WEBHOOK_SECRET configured, accepting webhook without validation');
      return true;
    }

    if (!signature) {
      return false;
    }

    // For now, we'll skip the crypto validation and just check if signature exists
    // In production, you should implement proper HMAC validation
    return true;
  }

  private async startDeploymentProcess(payload: any): Promise<void> {
    if (this.isDeploying) {
      logger.warn('Deployment already in progress');
      return;
    }

    this.isDeploying = true;
    logger.info('Starting deployment process...');

    try {
      const deployScript = `${this.projectPath}/scripts/deploy.sh`;
      
      logger.info(`Executing deployment script: ${deployScript}`);

      const { stdout, stderr } = await execAsync(`bash ${deployScript}`, {
        timeout: 600000, // 10 minutes timeout
        env: { ...process.env, PATH: '/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin' }
      });
      
      if (stdout) logger.info(`Deployment output: ${stdout}`);
      if (stderr) logger.warn(`Deployment stderr: ${stderr}`);
      
      logger.info('Deployment completed successfully');
    } catch (error) {
      logger.error('Deployment process failed:', error);
      throw error;
    } finally {
      this.isDeploying = false;
    }
  }

  async getDeploymentStatus(req: Request, res: Response): Promise<void> {
    try {
      const status = {
        isDeploying: this.isDeploying,
        projectPath: this.projectPath,
        lastDeployment: new Date().toISOString(),
        timestamp: Date.now()
      };
      
      res.status(200).json(ApiResponse.success('Deployment status retrieved', status));
    } catch (error) {
      logger.error('Error getting deployment status:', error);
      res.status(500).json(ApiResponse.error('Failed to get deployment status'));
    }
  }

  async manualDeploy(req: Request, res: Response): Promise<void> {
    try {
      if (this.isDeploying) {
        res.status(429).json(ApiResponse.error('Deployment already in progress'));
        return;
      }

      this.isDeploying = true;
      this.startDeploymentProcess({ manual: true });
      
      res.status(200).json(ApiResponse.success('Manual deployment started'));
    } catch (error) {
      logger.error('Manual deployment error:', error);
      this.isDeploying = false;
      res.status(500).json(ApiResponse.error('Failed to start manual deployment'));
    }
  }
}

export const webhookController = new WebhookController();
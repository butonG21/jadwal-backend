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

      const payload = req.body;
      const branch = payload.ref?.split('/').pop();
      
      if (branch !== 'master' && branch !== 'main') {
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
    try {
      logger.info('Starting deployment process...');
      
      // Execute deployment script
      const deployScript = `${this.projectPath}/scripts/deploy.sh`;
      
      logger.info(`Executing deployment script: ${deployScript}`);
      
      try {
        const { stdout, stderr } = await execAsync(`bash ${deployScript}`, {
          timeout: 600000, // 10 minutes timeout
          env: { ...process.env, PATH: '/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin' }
        });
        
        if (stdout) logger.info(`Deployment output: ${stdout}`);
        if (stderr) logger.warn(`Deployment stderr: ${stderr}`);
        
        logger.info('Deployment completed successfully');
        
      } catch (error) {
        logger.error('Deployment script failed:', error);
        throw new Error(`Deployment script failed: ${error}`);
      }
      
      this.isDeploying = false;
      
    } catch (error) {
      logger.error('Deployment process failed:', error);
      this.isDeploying = false;
      
      // You might want to send a notification here (email, Slack, etc.)
      // this.sendDeploymentFailureNotification(error);
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
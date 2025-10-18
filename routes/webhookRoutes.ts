import express from 'express';
import { webhookController } from '../controllers/webhookController';

const router = express.Router();

// Middleware to handle GitHub webhook payload formats
const githubWebhookMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  // GitHub can send webhooks as application/json or application/x-www-form-urlencoded
  const contentType = req.headers['content-type'];
  
  if (contentType && contentType.includes('application/x-www-form-urlencoded')) {
    // For form-encoded, we need to parse the 'payload' field
    express.urlencoded({ extended: true })(req, res, () => {
      if (req.body && req.body.payload) {
        try {
          req.body = JSON.parse(req.body.payload);
        } catch (error) {
          console.error('Failed to parse GitHub webhook payload:', error);
        }
      }
      next();
    });
  } else {
    // For JSON, use the default JSON parser
    next();
  }
};

// GitHub webhook endpoint
router.post('/github', githubWebhookMiddleware, (req, res) => webhookController.handleGitHubWebhook(req, res));

// Manual deployment endpoint (for testing/admin use)
router.post('/deploy', (req, res) => webhookController.manualDeploy(req, res));

// Get deployment status
router.get('/status', (req, res) => webhookController.getDeploymentStatus(req, res));

export default router;
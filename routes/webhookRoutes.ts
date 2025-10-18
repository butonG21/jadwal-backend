import express from 'express';
import { webhookController } from '../controllers/webhookController';

const router = express.Router();

// GitHub webhook endpoint
router.post('/github', webhookController.handleGitHubWebhook);

// Manual deployment endpoint (for testing/admin use)
router.post('/deploy', webhookController.manualDeploy);

// Get deployment status
router.get('/status', webhookController.getDeploymentStatus);

export default router;
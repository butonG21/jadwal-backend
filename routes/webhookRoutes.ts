import express from 'express';
import { webhookController } from '../controllers/webhookController';

const router = express.Router();

// GitHub webhook endpoint
router.post('/github', (req, res) => webhookController.handleGitHubWebhook(req, res));

// Manual deployment endpoint (for testing/admin use)
router.post('/deploy', (req, res) => webhookController.manualDeploy(req, res));

// Get deployment status
router.get('/status', (req, res) => webhookController.getDeploymentStatus(req, res));

export default router;
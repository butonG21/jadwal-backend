import express from 'express';
import { getProfile } from '../controllers/userController';
import { verifyToken } from '../middlewares/verifyToken';

const router = express.Router();

router.get('/me', verifyToken, getProfile);

export default router;
// routes/authRoutes.ts (Fixed version)
import express from 'express';
import { 
  login, 
  logout, 
  verifyTokenEndpoint,
  getAuthStatus 
} from '../controllers/authController';
import { verifyToken } from '../middlewares/verifyToken';

const router = express.Router();

/**
 * @route   POST /api/v1/auth/login
 * @desc    User login
 * @access  Public
 */
router.post('/login', login);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    User logout
 * @access  Private
 */
router.post('/logout', verifyToken, logout);

/**
 * @route   GET /api/v1/auth/logout
 * @desc    User logout (alternative method)
 * @access  Private
 */
router.get('/logout', verifyToken, logout);

/**
 * @route   GET /api/v1/auth/verify
 * @desc    Verify JWT token
 * @access  Private
 */
router.get('/verify', verifyToken, verifyTokenEndpoint);

/**
 * @route   GET /api/v1/auth/status
 * @desc    Get authentication status
 * @access  Private
 */
router.get('/status', verifyToken, getAuthStatus);

export default router;
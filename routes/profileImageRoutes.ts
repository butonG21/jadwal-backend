// routes/profileImageRoutes.ts
import express from 'express';
import { verifyToken } from '../middlewares/verifyToken';
import {
  uploadMiddleware,
  uploadProfileImage,
  getProfileImage,
  deleteProfileImage,
  getProfileImageByUserId,
  updateProfileImageMeta
} from '../controllers/profileImageController';
import { globalErrorHandler } from '../middlewares/errorHandler';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Rate limiting for file uploads
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 uploads per window per IP
  message: {
    success: false,
    error: 'Too many upload attempts. Please try again later.',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const user = (req as any).user;
    return user ? `upload_${user.uid}` : req.ip || 'anonymous';
  }
});

// Rate limiting for image operations
const imageLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // 20 requests per window
  message: {
    success: false,
    error: 'Too many image requests. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * @route   POST /api/v1/profile/image/upload
 * @desc    Upload profile image
 * @access  Private
 * @body    multipart/form-data with 'profileImage' file
 */
router.post(
  '/upload',
  uploadLimiter,
  verifyToken,
  uploadMiddleware,
  uploadProfileImage
);

/**
 * @route   GET /api/v1/profile/image
 * @desc    Get current user's profile image
 * @access  Private
 * @query   ?size=thumbnail|small|medium|original (optional)
 */
router.get(
  '/',
  imageLimiter,
  verifyToken,
  getProfileImage
);

/**
 * @route   DELETE /api/v1/profile/image
 * @desc    Delete current user's profile image
 * @access  Private
 */
router.delete(
  '/',
  uploadLimiter,
  verifyToken,
  deleteProfileImage
);

/**
 * @route   PUT /api/v1/profile/image/meta
 * @desc    Update profile image metadata (alt text, caption)
 * @access  Private
 * @body    { "alt": "Alt text", "caption": "Caption text" }
 */
router.put(
  '/meta',
  verifyToken,
  updateProfileImageMeta
);

/**
 * @route   GET /api/v1/profile/image/user/:userId
 * @desc    Get profile image by user ID (public access)
 * @access  Public (with rate limiting)
 * @query   ?size=thumbnail|small|medium|original (optional)
 */
router.get(
  '/user/:userId',
  imageLimiter,
  getProfileImageByUserId
);

// Apply error handling middleware
router.use(globalErrorHandler);

export default router;
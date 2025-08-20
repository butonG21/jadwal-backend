// routes/userRoute.ts (Updated with profile image routes)
import express from 'express';
import { verifyToken } from '../middlewares/verifyToken';
import { getProfile, updateProfile, getUserStats } from '../controllers/userController';
import profileImageRoutes from './profileImageRoutes';

const router = express.Router();

/**
 * @route   GET /api/v1/users/me
 * @desc    Get current user profile (including profile image)
 * @access  Private
 */
router.get('/me', verifyToken, getProfile);

/**
 * @route   PUT /api/v1/users/me
 * @desc    Update current user profile
 * @access  Private
 * @body    { "name": "New Name", "email": "new@email.com", "location": "New Location" }
 */
router.put('/me', verifyToken, updateProfile);

/**
 * @route   GET /api/v1/users/me/stats
 * @desc    Get current user statistics
 * @access  Private
 */
router.get('/me/stats', verifyToken, getUserStats);

/**
 * Mount profile image routes
 * All profile image related routes will be available under /api/v1/users/profile/image/*
 */
router.use('/profile/image', profileImageRoutes);

export default router;
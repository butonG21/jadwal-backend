// controllers/userController.ts (Updated with profile image support)
import { Response } from 'express';
import Schedule from '../models/schedule';
import User from '../models/User';
import { AuthenticatedRequest } from '../middlewares/verifyToken';
import { logger } from '../utils/loggers';
import { ApiResponse } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError, NotFoundError } from '../utils/errorTypes';
import { ProfileImageService } from '../services/profileImageService';

class UserController {
  private profileImageService: ProfileImageService;

  constructor() {
    this.profileImageService = new ProfileImageService();
  }

  // ====================== GET PROFILE ======================
  getProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user;
    const requestId = (req as any).requestId;

    if (!user) {
      throw new AppError('User not authenticated', 401);
    }

    logger.info('Getting user profile', { uid: user.uid, requestId });

    try {
      const userNameLower = user.name?.toLowerCase();

      // Get user data from User collection
      let dbUser = await User.findOne({ uid: user.uid });

      if (!dbUser) {
        logger.warn('User not found in database', { uid: user.uid });
        // Create user if not exists (backwards compatibility)
        dbUser = new User({
          uid: user.uid,
          name: user.name,
          email: user.email || '',
          lastLoginAt: new Date()
        });
        await dbUser.save();
      }

      // Find schedule documents for the user
      const scheduleDocs = await Schedule.find({
        $or: [
          { employee_id: user.uid },
          { name: new RegExp(`^${userNameLower}$`, 'i') }
        ]
      });

      // Prepare profile image data
      let profileImageData: null | {
        original: string;
        thumbnail: string;
        small: string;
        medium: string;
      } = null;
      if (dbUser?.profileImage) {
        try {
          profileImageData = await this.profileImageService.generateProfileImageVariants(
            dbUser.profileImage
          );
        } catch (error) {
          logger.warn('Failed to generate profile image variants', {
            uid: user.uid,
            error: (error as Error).message
          });
          // Fallback to basic image data
          profileImageData = {
            original: dbUser.profileImage,
            thumbnail: dbUser.profileImageThumbnail || dbUser.profileImage,
            small: dbUser.profileImage,
            medium: dbUser.profileImage
          };
        }
      }

      // Combine all schedules from user documents
      const allSchedules = scheduleDocs.flatMap((doc) => doc.schedule);

      // Prepare response data
      const profileData = {
        uid: user.uid,
        name: user.name,
        position: scheduleDocs.length > 0 ? scheduleDocs[0].position : null,
        department: scheduleDocs.length > 0 ? scheduleDocs[0].department : null,
        email: user.email || dbUser?.email || null,
        location: dbUser?.location || '',
        profileImage: profileImageData,
        schedule: allSchedules,
        metadata: {
          totalScheduledDays: allSchedules.length,
          lastLoginAt: dbUser?.lastLoginAt,
          accountCreatedAt: dbUser?.createdAt,
          profileUpdatedAt: dbUser?.updatedAt
        }
      };

      // Update last login time
      await User.findByIdAndUpdate(dbUser._id, { lastLoginAt: new Date() });

      logger.info('User profile retrieved successfully', {
        uid: user.uid,
        hasProfileImage: !!profileImageData,
        schedulesCount: allSchedules.length,
        requestId
      });

      res.status(200).json(
        ApiResponse.success('Profile retrieved successfully', profileData)
      );

    } catch (error: any) {
      logger.error('Error retrieving user profile', {
        uid: user.uid,
        error: error.message,
        requestId
      });

      if (error instanceof AppError) throw error;
      throw new AppError('Failed to retrieve user profile', 500);
    }
  });

  // ====================== UPDATE PROFILE ======================
  updateProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user;
    const { name, email, location } = req.body;
    const requestId = (req as any).requestId;

    if (!user) {
      throw new AppError('User not authenticated', 401);
    }

    // Validation
    if (name && (name.length < 2 || name.length > 100)) {
      throw new AppError('Name must be between 2 and 100 characters', 400);
    }

    if (email && !/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email)) {
      throw new AppError('Please provide a valid email address', 400);
    }

    if (location && location.length > 100) {
      throw new AppError('Location must be less than 100 characters', 400);
    }

    try {
      const updateData: any = {};
      if (name !== undefined) updateData.name = name.trim();
      if (email !== undefined) updateData.email = email.toLowerCase().trim();
      if (location !== undefined) updateData.location = location.trim();

      const updatedUser = await User.findOneAndUpdate(
        { uid: user.uid },
        { $set: updateData },
        { new: true, upsert: true }
      );

      if (!updatedUser) {
        throw new NotFoundError('User not found');
      }

      logger.info('User profile updated', {
        uid: user.uid,
        updatedFields: Object.keys(updateData),
        requestId
      });

      res.status(200).json(
        ApiResponse.success('Profile updated successfully', {
          uid: updatedUser.uid,
          name: updatedUser.name,
          email: updatedUser.email,
          location: updatedUser.location,
          updatedAt: updatedUser.updatedAt
        })
      );

    } catch (error: any) {
      logger.error('Error updating user profile', {
        uid: user.uid,
        error: error.message,
        requestId
      });

      if (error instanceof AppError) throw error;
      if (error.name === 'ValidationError') {
        throw new AppError('Invalid profile data provided', 400);
      }

      throw new AppError('Failed to update user profile', 500);
    }
  });

  // ====================== GET USER STATS ======================
  getUserStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user;

    if (!user) {
      throw new AppError('User not authenticated', 401);
    }

    try {
      const dbUser = await User.findOne({ uid: user.uid });
      const scheduleDocs = await Schedule.find({
        $or: [
          { employee_id: user.uid },
          { name: new RegExp(`^${user.name?.toLowerCase()}$`, 'i') }
        ]
      });

      const allSchedules = scheduleDocs.flatMap((doc) => doc.schedule);

      // Calculate statistics
      const shiftCounts = allSchedules.reduce((acc: any, item: any) => {
        acc[item.shift] = (acc[item.shift] || 0) + 1;
        return acc;
      }, {});

      const dateRange = allSchedules.length > 0 ? {
        earliest: allSchedules.reduce((min, curr) => 
          curr.date < min ? curr.date : min, allSchedules[0].date),
        latest: allSchedules.reduce((max, curr) => 
          curr.date > max ? curr.date : max, allSchedules[0].date)
      } : null;

      const stats = {
        profile: {
          hasProfileImage: !!dbUser?.profileImage,
          accountAge: dbUser?.createdAt ? 
            Math.floor((Date.now() - dbUser.createdAt.getTime()) / (1000 * 60 * 60 * 24)) : null,
          lastLogin: dbUser?.lastLoginAt
        },
        schedule: {
          totalScheduledDays: allSchedules.length,
          shiftDistribution: shiftCounts,
          dateRange: dateRange,
          averageShiftsPerMonth: allSchedules.length > 0 ? 
            Math.round((allSchedules.length / 12) * 10) / 10 : 0
        }
      };

      res.status(200).json(
        ApiResponse.success('User statistics retrieved successfully', stats)
      );

    } catch (error: any) {
      logger.error('Error retrieving user statistics', {
        uid: user.uid,
        error: error.message
      });

      throw new AppError('Failed to retrieve user statistics', 500);
    }
  });
}

// Export controller instance
const userController = new UserController();

export const {
  getProfile,
  updateProfile,
  getUserStats
} = userController;
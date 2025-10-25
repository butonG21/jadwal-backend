import { Request, Response } from 'express';
import User, { UserRole } from '../models/User';
import { ApiResponse } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { logger } from '../utils/loggers';
import { AuthenticatedRequest } from '../middlewares/verifyToken';

export class AdminController {
  
  /**
   * Get all users with pagination and role filtering
   */
  public getAllUsers = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { page = 1, limit = 10, role, search } = req.query;
    const requestId = req.headers['x-request-id'] as string || 'unknown';
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;
    
    // Build filter query
    const filter: any = {};
    if (role && Object.values(UserRole).includes(role as UserRole)) {
      filter.role = role;
    }
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { uid: { $regex: search, $options: 'i' } }
      ];
    }
    
    try {
      const [users, totalUsers] = await Promise.all([
        User.find(filter)
          .select('uid name email role location createdAt lastLogin')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum),
        User.countDocuments(filter)
      ]);
      
      const totalPages = Math.ceil(totalUsers / limitNum);
      
      logger.info('Admin retrieved users list', {
        adminUid: req.user?.uid,
        totalUsers,
        page: pageNum,
        limit: limitNum,
        filter,
        requestId
      });
      
      res.json(ApiResponse.success('Users retrieved successfully', {
        users,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalUsers,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1
        }
      }));
      
    } catch (error) {
      logger.error('Failed to retrieve users', {
        adminUid: req.user?.uid,
        error: error instanceof Error ? error.message : String(error),
        requestId
      });
      throw error;
    }
  });
  
  /**
   * Get user statistics by role
   */
  public getUserStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const requestId = req.headers['x-request-id'] as string || 'unknown';
    
    try {
      const stats = await User.aggregate([
        {
          $group: {
            _id: '$role',
            count: { $sum: 1 },
            lastLogin: { $max: '$lastLogin' }
          }
        },
        {
          $project: {
            role: '$_id',
            count: 1,
            lastLogin: 1,
            _id: 0
          }
        }
      ]);
      
      const totalUsers = await User.countDocuments();
      const activeUsers = await User.countDocuments({
        lastLogin: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
      });
      
      logger.info('Admin retrieved user statistics', {
        adminUid: req.user?.uid,
        requestId
      });
      
      res.json(ApiResponse.success('User statistics retrieved successfully', {
        roleStats: stats,
        totalUsers,
        activeUsers,
        inactiveUsers: totalUsers - activeUsers
      }));
      
    } catch (error) {
      logger.error('Failed to retrieve user statistics', {
        adminUid: req.user?.uid,
        error: error instanceof Error ? error.message : String(error),
        requestId
      });
      throw error;
    }
  });
  
  /**
   * Update user role
   */
  public updateUserRole = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { uid } = req.params;
    const { role } = req.body;
    const requestId = req.headers['x-request-id'] as string || 'unknown';
    
    // Validate role
    if (!Object.values(UserRole).includes(role)) {
      return res.status(400).json(
        ApiResponse.error('Invalid role specified', 'INVALID_ROLE', 400)
      );
    }
    
    // Prevent admin from demoting themselves
    if (uid === req.user?.uid && role !== UserRole.ADMIN) {
      return res.status(400).json(
        ApiResponse.error('You cannot change your own admin role', 'CANNOT_DEMOTE_SELF', 400)
      );
    }
    
    try {
      const user = await User.findOne({ uid });
      
      if (!user) {
        return res.status(404).json(
          ApiResponse.error('User not found', 'USER_NOT_FOUND', 404)
        );
      }
      
      const oldRole = user.role;
      user.role = role;
      await user.save();
      
      logger.info('Admin updated user role', {
        adminUid: req.user?.uid,
        targetUid: uid,
        oldRole,
        newRole: role,
        requestId
      });
      
      res.json(ApiResponse.success('User role updated successfully', {
        uid: user.uid,
        name: user.name,
        email: user.email,
        role: user.role,
        updatedAt: new Date()
      }));
      
    } catch (error) {
      logger.error('Failed to update user role', {
        adminUid: req.user?.uid,
        targetUid: uid,
        role,
        error: error instanceof Error ? error.message : String(error),
        requestId
      });
      throw error;
    }
  });
  
  /**
   * Get specific user details
   */
  public getUserDetails = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { uid } = req.params;
    const requestId = req.headers['x-request-id'] as string || 'unknown';
    
    try {
      const user = await User.findOne({ uid }).select('-__v');
      
      if (!user) {
        return res.status(404).json(
          ApiResponse.error('User not found', 'USER_NOT_FOUND', 404)
        );
      }
      
      logger.info('Admin retrieved user details', {
        adminUid: req.user?.uid,
        targetUid: uid,
        requestId
      });
      
      res.json(ApiResponse.success('User details retrieved successfully', (user as any).getFullProfile()));
      
    } catch (error) {
      logger.error('Failed to retrieve user details', {
        adminUid: req.user?.uid,
        targetUid: uid,
        error: error instanceof Error ? error.message : String(error),
        requestId
      });
      throw error;
    }
  });
  
  /**
   * Delete user (soft delete by deactivating)
   */
  public deleteUser = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { uid } = req.params;
    const requestId = req.headers['x-request-id'] as string || 'unknown';
    
    // Prevent admin from deleting themselves
    if (uid === req.user?.uid) {
      return res.status(400).json(
        ApiResponse.error('You cannot delete your own account', 'CANNOT_DELETE_SELF', 400)
      );
    }
    
    try {
      const user = await User.findOne({ uid });
      
      if (!user) {
        return res.status(404).json(
          ApiResponse.error('User not found', 'USER_NOT_FOUND', 404)
        );
      }
      
      // For now, we'll actually delete the user
      // In production, you might want to implement soft delete
      await User.deleteOne({ uid });
      
      logger.warn('Admin deleted user', {
        adminUid: req.user?.uid,
        deletedUid: uid,
        deletedUserName: user.name,
        requestId
      });
      
      res.json(ApiResponse.success('User deleted successfully'));
      
    } catch (error) {
      logger.error('Failed to delete user', {
        adminUid: req.user?.uid,
        targetUid: uid,
        error: error instanceof Error ? error.message : String(error),
        requestId
      });
      throw error;
    }
  });
  
  /**
   * Promote user to admin
   */
  public promoteToAdmin = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { uid } = req.params;
    const requestId = req.headers['x-request-id'] as string || 'unknown';
    
    try {
      const user = await User.findOne({ uid });
      
      if (!user) {
        return res.status(404).json(
          ApiResponse.error('User not found', 'USER_NOT_FOUND', 404)
        );
      }
      
      if (user.role === UserRole.ADMIN) {
        return res.status(400).json(
          ApiResponse.error('User is already an admin', 'ALREADY_ADMIN', 400)
        );
      }
      
      user.role = UserRole.ADMIN;
      await user.save();
      
      logger.warn('Admin promoted user to admin', {
        adminUid: req.user?.uid,
        promotedUid: uid,
        promotedUserName: user.name,
        requestId
      });
      
      res.json(ApiResponse.success('User promoted to admin successfully', {
        uid: user.uid,
        name: user.name,
        email: user.email,
        role: user.role,
        promotedAt: new Date()
      }));
      
    } catch (error) {
      logger.error('Failed to promote user to admin', {
        adminUid: req.user?.uid,
        targetUid: uid,
        error: error instanceof Error ? error.message : String(error),
        requestId
      });
      throw error;
    }
  });
  
  /**
   * Demote admin to regular user
   */
  public demoteFromAdmin = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { uid } = req.params;
    const requestId = req.headers['x-request-id'] as string || 'unknown';
    
    // Prevent admin from demoting themselves
    if (uid === req.user?.uid) {
      return res.status(400).json(
        ApiResponse.error('You cannot demote yourself', 'CANNOT_DEMOTE_SELF', 400)
      );
    }
    
    try {
      const user = await User.findOne({ uid });
      
      if (!user) {
        return res.status(404).json(
          ApiResponse.error('User not found', 'USER_NOT_FOUND', 404)
        );
      }
      
      if (user.role !== UserRole.ADMIN) {
        return res.status(400).json(
          ApiResponse.error('User is not an admin', 'NOT_ADMIN', 400)
        );
      }
      
      user.role = UserRole.USER;
      await user.save();
      
      logger.warn('Admin demoted user from admin', {
        adminUid: req.user?.uid,
        demotedUid: uid,
        demotedUserName: user.name,
        requestId
      });
      
      res.json(ApiResponse.success('User demoted from admin successfully', {
        uid: user.uid,
        name: user.name,
        email: user.email,
        role: user.role,
        demotedAt: new Date()
      }));
      
    } catch (error) {
      logger.error('Failed to demote user from admin', {
        adminUid: req.user?.uid,
        targetUid: uid,
        error: error instanceof Error ? error.message : String(error),
        requestId
      });
      throw error;
    }
  });
}

export default new AdminController();
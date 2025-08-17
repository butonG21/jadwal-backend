import { request, response } from 'express';
import multer from 'multer';
import { profileImageService } from '../services/profileImageService';
import { User } from '../models/User';
import { logger } from '../utils/logger';
import { ApiResponse } from '../utils/apiResponse';
import { asynHandler } from '../utils/asyncHandler';
import { AppError, NotFoundError, validationError } from '../utils/errorTypes';
import  { AuthenticatedRequest } from '../middlewares/verifyToken';
import { IMAGE_PROCESSING } from '../config/constants';

// Multer configurattion for profile image upload
const profileImageUpload = multer({
    storage: mullter.memoryStorage(),
    limits: {
        fileSize: IMAGE_PROCESSING.MAX_SIZE, // Maximum file 10MB
        files: 1 // Allow only one file
    },
    fileFilter: (req, file, cb) => {
        // check file type
        const allowMimeTypes = [
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/gif'
        ];

        if (allowMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new AppError('Invalid file type. Only JPEG, PNG, and GIF are allowed.', 400), false);
        }
    }
});

class ProfileImageController {
   private profileImageService: profileImageService;

   constructor() {
    this.profileImageService = new profileImageService();
   }

   // Multer middleware for single profile image upload
   uploadMidldware = profileImageUpload.single('profileImage');

   // Upload profile image
    uploadProfileImage = asynHandler(async (req: AuthenticatedRequest, res: Response) =>{
        const user = req.user;
        const file = req.file;
        const requestId = (req as any).requestId || 'unknown';

        if(!user) {
            throw new AppError('user authentication required', 401);
        }
        if (!file) {
            throw new validationError('Profile image file is required', 400);
        }

        logger.info('profile image upload started', {
            userId: user.id,
            fileName: file.originalname,
            filesize: file.size,
            requestId: requestId
        });

        try {
            // upload image to imagekit
            const uploadResult = await this.profileImageService.uploadProfileImage(
                file.buffer,
                user.id,
                file.originalname
            );
            if (!uploadResult) {
                throw new AppError(uploadResult.error || 'Failed to upload profile image', 500);
            }

            // Update user profile with new image URL
        const updatedUser = await User.findOneAndUpdate(
            { uid: user.uid },
            {
                $set: {
                profileImage: uploadResult.url,
                profileImageThumbnail: uploadResult.thumbnailUrl,
                profileImageFileId: uploadResult.fileId,
                updatedAt: new Date()
                }
            },
            { new: true, upsert: true }
            );
    
            if (!updatedUser) {
            throw new NotFoundError('User not found');
            }
    
            // Generate image variants
            const imageVariants = await this.profileImageService.generateProfileImageVariants(
            uploadResult.url!
            );
    
            const responseData = {
            message: 'Profile image uploaded successfully',
            user: {
                uid: updatedUser.uid,
                name: updatedUser.name,
                email: updatedUser.email,
                profileImage: updatedUser.profileImage,
                profileImageThumbnail: updatedUser.profileImageThumbnail
            },
            imageVariants,
            uploadInfo: {
                originalFileName: file.originalname,
                fileSize: file.size,
                mimeType: file.mimetype,
                fileId: uploadResult.fileId
            }
            };
    
            logger.info('Profile image uploaded successfully', {
            userId: user.uid,
            imageUrl: uploadResult.url,
            requestId
            });
    
            res.status(200).json(
            ApiResponse.success('Profile image uploaded successfully', responseData)
            );
    
        } catch (error: any) {
            logger.error('Profile image upload failed', {
            userId: user.uid,
            error: error.message,
            requestId
            });
    
            if (error instanceof AppError) {
            throw error;
            }
    
            throw new AppError('Failed to process profile image upload', 500);
        }
        });
    
        // Get user profile image
        getProfileImage = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const user = req.user;
        const { size } = req.query; // thumbnail, small, medium, original
    
        if (!user) {
            throw new AppError('User authentication required', 401);
        }
    
        const dbUser = await User.findOne({ uid: user.uid });
        if (!dbUser || !dbUser.profileImage) {
            throw new NotFoundError('Profile image not found');
        }
    
        let imageUrl = dbUser.profileImage;
    
        // Generate different sizes if requested
        if (size && dbUser.profileImage) {
            const variants = await this.profileImageService.generateProfileImageVariants(
            dbUser.profileImage
            );
    
            switch (size) {
            case 'thumbnail':
                imageUrl = variants.thumbnail;
                break;
            case 'small':
                imageUrl = variants.small;
                break;
            case 'medium':
                imageUrl = variants.medium;
                break;
            case 'original':
            default:
                imageUrl = variants.original;
                break;
            }
        }
    
        const responseData = {
            user: {
            uid: dbUser.uid,
            name: dbUser.name,
            email: dbUser.email
            },
            profileImage: {
            url: imageUrl,
            thumbnail: dbUser.profileImageThumbnail,
            variants: await this.profileImageService.generateProfileImageVariants(
                dbUser.profileImage
            )
            }
        };
    
        res.status(200).json(
            ApiResponse.success('Profile image retrieved successfully', responseData)
        );
        });
    
        // Delete profile image
        deleteProfileImage = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const user = req.user;
        const requestId = (req as any).requestId;
    
        if (!user) {
            throw new AppError('User authentication required', 401);
        }
    
        const dbUser = await User.findOne({ uid: user.uid });
        if (!dbUser || !dbUser.profileImage) {
            throw new NotFoundError('No profile image found to delete');
        }
    
        logger.info('Profile image deletion started', {
            userId: user.uid,
            requestId
        });
    
        try {
            // Delete from ImageKit
            const deleteSuccess = await this.profileImageService.deleteProfileImage(
            user.uid,
            dbUser.profileImageFileId
            );
    
            // Update user profile (remove image references)
            await User.findOneAndUpdate(
            { uid: user.uid },
            {
                $unset: {
                profileImage: '',
                profileImageThumbnail: '',
                profileImageFileId: ''
                },
                $set: {
                updatedAt: new Date()
                }
            }
            );
    
            logger.info('Profile image deleted successfully', {
            userId: user.uid,
            deleteSuccess,
            requestId
            });
    
            res.status(200).json(
            ApiResponse.success('Profile image deleted successfully', {
                user: {
                uid: user.uid,
                name: user.name,
                email: user.email
                },
                deletedFromImageKit: deleteSuccess
            })
            );
    
        } catch (error: any) {
            logger.error('Profile image deletion failed', {
            userId: user.uid,
            error: error.message,
            requestId
            });
    
            if (error instanceof AppError) {
            throw error;
            }
    
            throw new AppError('Failed to delete profile image', 500);
        }
        });
    
        // Get profile image by user ID (for admin or public access)
        getProfileImageByUserId = asyncHandler(async (req: Request, res: Response) => {
        const { userId } = req.params;
        const { size } = req.query;
    
        if (!userId) {
            throw new ValidationError('User ID is required');
        }
    
        const dbUser = await User.findOne({ uid: userId });
        if (!dbUser) {
            throw new NotFoundError('User not found');
        }
    
        if (!dbUser.profileImage) {
            throw new NotFoundError('Profile image not found for this user');
        }
    
        let imageUrl = dbUser.profileImage;
    
        // Generate different sizes if requested
        if (size && dbUser.profileImage) {
            const variants = await this.profileImageService.generateProfileImageVariants(
            dbUser.profileImage
            );
    
            switch (size) {
            case 'thumbnail':
                imageUrl = variants.thumbnail;
                break;
            case 'small':
                imageUrl = variants.small;
                break;
            case 'medium':
                imageUrl = variants.medium;
                break;
            case 'original':
            default:
                imageUrl = variants.original;
                break;
            }
        }
    
        const responseData = {
            user: {
            uid: dbUser.uid,
            name: dbUser.name
            },
            profileImage: {
            url: imageUrl,
            thumbnail: dbUser.profileImageThumbnail
            }
        };
    
        res.status(200).json(
            ApiResponse.success('Profile image retrieved successfully', responseData)
        );
        });
    
        // Update profile image metadata (for future use)
        updateProfileImageMeta = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const user = req.user;
        const { alt, caption } = req.body;
    
        if (!user) {
            throw new AppError('User authentication required', 401);
        }
    
        const updatedUser = await User.findOneAndUpdate(
            { uid: user.uid },
            {
            $set: {
                profileImageAlt: alt,
                profileImageCaption: caption,
                updatedAt: new Date()
            }
            },
            { new: true }
        );
    
        if (!updatedUser) {
            throw new NotFoundError('User not found');
        }
    
        res.status(200).json(
            ApiResponse.success('Profile image metadata updated successfully', {
            user: {
                uid: updatedUser.uid,
                name: updatedUser.name,
                profileImage: updatedUser.profileImage,
                profileImageAlt: updatedUser.profileImageAlt,
                profileImageCaption: updatedUser.profileImageCaption
            }
            })
        );
        });
    }

// Export controller instance
const profileImageController = new ProfileImageController();

export const {
    uploadMiddleware,
    uploadProfileImage,
    getProfileImage,
    deleteProfileImage,
    getProfileImageByUserId,
    updateProfileImageMeta
} = profileImageController;
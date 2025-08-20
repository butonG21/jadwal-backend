// services/profileImageService.ts
import ImageKit from 'imagekit';
import { logger } from '../utils/loggers';
import { AppError } from '../utils/errorTypes';
import { IMAGE_PROCESSING } from '../config/constants';

interface ProfileImageUploadResult {
  success: boolean;
  url?: string;
  thumbnailUrl?: string;
  error?: string;
  fileId?: string;
}

export class ProfileImageService {
  private imagekit: ImageKit;

  constructor() {
    this.imagekit = new ImageKit({
      publicKey: process.env.IMAGEKIT_PUBLIC_KEY!,
      privateKey: process.env.IMAGEKIT_PRIVATE_KEY!,
      urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT!,
    });
  }

  async uploadProfileImage(
    imageBuffer: Buffer,
    userId: string,
    originalFileName?: string
  ): Promise<ProfileImageUploadResult> {
    try {
      // Validate file size
      if (imageBuffer.length > IMAGE_PROCESSING.MAX_SIZE) {
        throw new AppError('Profile image size exceeds limit (10MB)', 400);
      }

      const fileName = this.generateProfileFileName(userId, originalFileName);
      const folderPath = '/profiles';

      // Delete existing profile image first
      await this.deleteExistingProfileImage(userId);

      const uploadResponse = await this.imagekit.upload({
        file: imageBuffer,
        fileName: fileName,
        folder: folderPath,
        useUniqueFileName: true,
        transformation: {
          pre: 'q-80,w-800,h-800,c-maintain_ratio', // Optimize and resize
        },
        tags: ['profile', 'user-upload', userId],
      });

      // Generate thumbnail URL
      const thumbnailUrl = this.imagekit.url({
        path: uploadResponse.filePath,
        transformation: [
          {
            width: 150,
            height: 150,
            crop: 'maintain_ratio',
            quality: 80,
            format: 'webp'
          }
        ]
      });

      logger.info(`Profile image uploaded successfully for user ${userId}`, {
        fileId: uploadResponse.fileId,
        url: uploadResponse.url
      });

      return {
        success: true,
        url: uploadResponse.url,
        thumbnailUrl: thumbnailUrl,
        fileId: uploadResponse.fileId,
      };

    } catch (error: any) {
      logger.error('Failed to upload profile image:', {
        userId,
        error: error.message,
      });

      return {
        success: false,
        error: error.message || 'Failed to upload profile image',
      };
    }
  }

  async deleteProfileImage(userId: string, fileId?: string): Promise<boolean> {
    try {
      if (fileId) {
        await this.imagekit.deleteFile(fileId);
        logger.info(`Profile image deleted for user ${userId}`, { fileId });
        return true;
      }

      // If no fileId provided, try to find and delete by tags
      return await this.deleteExistingProfileImage(userId);

    } catch (error: any) {
      logger.error('Failed to delete profile image:', {
        userId,
        fileId,
        error: error.message,
      });
      return false;
    }
  }

  private async deleteExistingProfileImage(userId: string): Promise<boolean> {
    try {
      const existingImages = await this.imagekit.listFiles({
        tags: userId,
        path: '/profiles',
        limit: 10
      }) as any[]; // Type assertion to avoid TypeScript issues
  
      if (existingImages.length > 0) {
        // Filter only files that have fileId property
        const imageFiles = existingImages.filter((item: any) => 
          item && typeof item === 'object' && 'fileId' in item && item.fileId
        );
        
        if (imageFiles.length > 0) {
          const deletePromises = imageFiles.map((image: any) => 
            this.imagekit.deleteFile(image.fileId)
          );
          
          await Promise.allSettled(deletePromises);
          logger.info(`Deleted ${imageFiles.length} existing profile images for user ${userId}`);
        }
      }
  
      return true;
    } catch (error: any) {
      logger.warn('Could not delete existing profile images:', {
        userId,
        error: error.message
      });
      return false;
    }
  }

  private generateProfileFileName(userId: string, originalFileName?: string): string {
    const timestamp = Date.now();
    const extension = originalFileName 
      ? originalFileName.split('.').pop()?.toLowerCase() || 'jpg'
      : 'jpg';
    
    return `profile_${userId}_${timestamp}.${extension}`;
  }

  async generateProfileImageVariants(imageUrl: string) {
    try {
      // Extract path from ImageKit URL
      const urlParts = imageUrl.split('/');
      const pathIndex = urlParts.findIndex(part => part.includes('imagekit.io')) + 1;
      const imagePath = '/' + urlParts.slice(pathIndex).join('/');

      return {
        original: imageUrl,
        thumbnail: this.imagekit.url({
          path: imagePath,
          transformation: [
            { width: 150, height: 150, crop: 'maintain_ratio', quality: 80 }
          ]
        }),
        small: this.imagekit.url({
          path: imagePath,
          transformation: [
            { width: 300, height: 300, crop: 'maintain_ratio', quality: 80 }
          ]
        }),
        medium: this.imagekit.url({
          path: imagePath,
          transformation: [
            { width: 600, height: 600, crop: 'maintain_ratio', quality: 80 }
          ]
        })
      };
    } catch (error: any) {
      logger.error('Failed to generate profile image variants:', error.message);
      return {
        original: imageUrl,
        thumbnail: imageUrl,
        small: imageUrl,
        medium: imageUrl
      };
    }
  }
}
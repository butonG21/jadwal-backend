import axios from 'axios';
import ImageKit from 'imagekit';
import Attendance from '../models/Attendance';
import { logger } from '../utils/loggers';
import { AppError } from '../utils/errorTypes';
import { IMAGE_PROCESSING } from '../config/constants';

interface ImageUploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

interface MigrationResult {
  totalRecords: number;
  processed: number;
  success: number;
  failed: number;
  hasMore: boolean;
  nextSkip: number | null;
  results: Array<{
    userid: string;
    date: string;
    images: Record<string, any> | { error: string };
  }>;
}

export class ImageService {
  private imagekit: ImageKit;

  constructor() {
    this.imagekit = new ImageKit({
      publicKey: process.env.IMAGEKIT_PUBLIC_KEY!,
      privateKey: process.env.IMAGEKIT_PRIVATE_KEY!,
      urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT!,
    });
  }

  async processAndUploadImage(
    imageUrl: string,
    userId: string,
    date: string,
    imageType: string
  ): Promise<string | undefined> {
    if (!imageUrl || imageUrl.trim() === '') {
      return undefined;
    }

    try {
      // Check if already ImageKit URL
      if (imageUrl.includes('imagekit.io')) {
        return imageUrl;
      }

      // Download image
      const imageBuffer = await this.downloadImage(imageUrl);
      if (!imageBuffer) {
        logger.warn(`Failed to download ${imageType} image for user ${userId}`);
        return imageUrl; // Return original URL as fallback
      }

      // Upload to ImageKit
      const fileName = this.generateFileName(userId, date, imageType);
      const folderPath = this.generateFolderPath(date);
      
      const uploadResult = await this.uploadToImageKit(imageBuffer, fileName, folderPath);
      
      if (uploadResult.success && uploadResult.url) {
        logger.info(`Successfully uploaded ${imageType} image for user ${userId} to ImageKit`);
        return uploadResult.url;
      } else {
        logger.warn(`Failed to upload ${imageType} image for user ${userId}:`, uploadResult.error);
        return imageUrl; // Return original URL as fallback
      }
      
    } catch (error: any) {
      logger.error(`Error processing ${imageType} image for user ${userId}:`, error.message);
      return imageUrl; // Return original URL as fallback
    }
  }

  private async downloadImage(imageUrl: string): Promise<Buffer | null> {
    if (!imageUrl || imageUrl.trim() === '') {
      return null;
    }

    try {
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: IMAGE_PROCESSING.TIMEOUT,
        maxContentLength: IMAGE_PROCESSING.MAX_SIZE,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ImageBot/1.0)',
        },
      });

      return Buffer.from(response.data);
      
    } catch (error: any) {
      logger.error(`Failed to download image from ${imageUrl}:`, {
        error: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText
      });
      return null;
    }
  }

  private async uploadToImageKit(
    imageBuffer: Buffer, 
    fileName: string, 
    folderPath: string
  ): Promise<ImageUploadResult> {
    try {
      const uploadResponse = await this.imagekit.upload({
        file: imageBuffer,
        fileName: fileName,
        folder: folderPath,
        useUniqueFileName: true,
        transformation: {
          pre: 'q-80', // Optimize quality to reduce file size
        },
        tags: ['attendance', 'automated-upload'],
      });

      return {
        success: true,
        url: uploadResponse.url,
      };
      
    } catch (error: any) {
      logger.error('Failed to upload to ImageKit:', {
        error: error.message,
        fileName,
        folderPath
      });
      
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private generateFileName(userId: string, date: string, imageType: string): string {
    const timestamp = Date.now();
    const cleanDate = date.replace(/-/g, '');
    return `${userId}_${cleanDate}_${imageType}_${timestamp}.jpg`;
  }

  private generateFolderPath(date: string): string {
    const [year, month] = date.split('-');
    return `/attendance/${year}/${month}`;
  }

  async migrateExistingImages(
    limit: number = 50,
    skip: number = 0,
    forceUpdate: boolean = false
  ): Promise<MigrationResult> {
    const query: any = {
      $or: [
        { start_image: { $exists: true, $nin: [null, ''] } },
        { break_out_image: { $exists: true, $nin: [null, ''] } },
        { break_in_image: { $exists: true, $nin: [null, ''] } },
        { end_image: { $exists: true, $nin: [null, ''] } }
      ]
    };

    // If not force update, only migrate images that are not from ImageKit
    if (!forceUpdate) {
      query.$or = [
        { start_image: { $exists: true, $nin: [null, ''], $not: /imagekit\.io/i } },
        { break_out_image: { $exists: true, $nin: [null, ''], $not: /imagekit\.io/i } },
        { break_in_image: { $exists: true, $nin: [null, ''], $not: /imagekit\.io/i } },
        { end_image: { $exists: true, $nin: [null, ''], $not: /imagekit\.io/i } }
      ];
    }

    const totalRecords = await Attendance.countDocuments(query);
    const attendanceRecords = await Attendance.find(query)
      .limit(limit)
      .skip(skip)
      .sort({ date: -1 });

    if (attendanceRecords.length === 0) {
      return {
        totalRecords,
        processed: 0,
        success: 0,
        failed: 0,
        hasMore: false,
        nextSkip: null,
        results: []
      };
    }

    let successCount = 0;
    let failCount = 0;
    const migrationResults: Array<{
      userid: string;
      date: string;
      images: Record<string, any> | { error: string };
    }> = [];

    // Process records in smaller batches
    const batchSize = 3; // Smaller batch size for image processing
    for (let i = 0; i < attendanceRecords.length; i += batchSize) {
      const batch = attendanceRecords.slice(i, i + batchSize);

      await Promise.allSettled(
        batch.map(async (record) => {
          try {
            const migrationResult = {
              userid: record.userid,
              date: record.date,
              images: {} as Record<string, any>
            };

            const imageFields = ['start_image', 'break_out_image', 'break_in_image', 'end_image'];
            const updateData: any = {};
            let hasUpdates = false;

            // Process each image field
            for (const imageField of imageFields) {
              const originalUrl = record[imageField as keyof typeof record] as string;
              
              if (originalUrl && originalUrl.trim() !== '') {
                // Skip if already from ImageKit and not forcing update
                if (!forceUpdate && originalUrl.includes('imagekit.io')) {
                  migrationResult.images[imageField] = {
                    original: originalUrl,
                    migrated: originalUrl,
                    status: 'skipped'
                  };
                  continue;
                }

                const imageType = imageField.replace('_image', '');
                const migratedUrl = await this.processAndUploadImage(
                  originalUrl,
                  record.userid,
                  record.date,
                  imageType
                );

                migrationResult.images[imageField] = {
                  original: originalUrl,
                  migrated: migratedUrl,
                  status: migratedUrl !== originalUrl ? 'migrated' : 'failed'
                };

                // Only update if the URL actually changed
                if (migratedUrl && migratedUrl !== originalUrl) {
                  updateData[imageField] = migratedUrl;
                  hasUpdates = true;
                }
              }
            }

            // Update database if there are changes
            if (hasUpdates) {
              await Attendance.findByIdAndUpdate(record._id, updateData);
              logger.info(`Migrated images for user ${record.userid} on ${record.date}`);
            }

            migrationResults.push(migrationResult);
            successCount++;

          } catch (error: any) {
            logger.error(`Failed to migrate images for user ${record.userid}:`, error.message);
            migrationResults.push({
              userid: record.userid,
              date: record.date,
              images: { error: error.message }
            });
            failCount++;
          }
        })
      );

      // Add delay between batches
      if (i + batchSize < attendanceRecords.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    const hasMore = skip + limit < totalRecords;

    return {
      totalRecords,
      processed: attendanceRecords.length,
      success: successCount,
      failed: failCount,
      hasMore,
      nextSkip: hasMore ? skip + limit : null,
      results: migrationResults
    };
  }

  async getMigrationStatistics() {
    // Count total records with images
    const totalWithImages = await Attendance.countDocuments({
      $or: [
        { start_image: { $exists: true, $nin: [null, ''] } },
        { break_out_image: { $exists: true, $nin: [null, ''] } },
        { break_in_image: { $exists: true, $nin: [null, ''] } },
        { end_image: { $exists: true, $nin: [null, ''] } }
      ]
    });

    // Count records with ImageKit URLs (already migrated)
    const alreadyMigrated = await Attendance.countDocuments({
      $or: [
        { start_image: /imagekit\.io/i },
        { break_out_image: /imagekit\.io/i },
        { break_in_image: /imagekit\.io/i },
        { end_image: /imagekit\.io/i }
      ]
    });

    // Count records that need migration
    const needMigration = await Attendance.countDocuments({
      $or: [
        { start_image: { $exists: true, $nin: [null, ''], $not: /imagekit\.io/i } },
        { break_out_image: { $exists: true, $nin: [null, ''], $not: /imagekit\.io/i } },
        { break_in_image: { $exists: true, $nin: [null, ''], $not: /imagekit\.io/i } },
        { end_image: { $exists: true, $nin: [null, ''], $not: /imagekit\.io/i } }
      ]
    });

    // Get sample of URLs that need migration
    const sampleRecords = await Attendance.find({
      $or: [
        { start_image: { $exists: true, $nin: [null, ''], $not: /imagekit\.io/i } },
        { break_out_image: { $exists: true, $nin: [null, ''], $not: /imagekit\.io/i } },
        { break_in_image: { $exists: true, $nin: [null, ''], $not: /imagekit\.io/i } },
        { end_image: { $exists: true, $nin: [null, ''], $not: /imagekit\.io/i } }
      ]
    })
    .limit(5)
    .select('userid date start_image break_out_image break_in_image end_image');

    return {
      totalWithImages,
      alreadyMigrated,
      needMigration,
      migrationProgress: totalWithImages > 0 ? 
        parseFloat(((alreadyMigrated / totalWithImages) * 100).toFixed(2)) : 0,
      sampleRecords: sampleRecords.map(record => ({
        userid: record.userid,
        date: record.date,
        imageUrls: {
          start_image: record.start_image,
          break_out_image: record.break_out_image,
          break_in_image: record.break_in_image,
          end_image: record.end_image
        }
      }))
    };
  }
}
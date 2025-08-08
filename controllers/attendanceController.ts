// controllers/fetchAttendance.ts
import { Request, Response } from 'express';
import axios from 'axios';
import Schedule from '../models/schedule';
import Attendance from '../models/Attendance';
import ImageKit from 'imagekit';

// Constants
const ATTENDANCE_API_BASE_URL = 'http://attendance-api.shabuhachi.id/service';
const ATTENDANCE_API_ENDPOINT = `${ATTENDANCE_API_BASE_URL}/getTripReport1.php`;

// ImageKit Configuration
const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY || '',
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY || '',
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT || '',
});

// Types
interface AttendanceApiResponse {
  success: boolean;
  mset_start_time?: string;
  mset_start_address?: string;
  mset_start_image?: string;
  mset_break_out_time?: string;
  mset_break_out_address?: string;
  mset_break_out_image?: string;
  mset_break_in_time?: string;
  mset_break_in_address?: string;
  mset_break_in_image?: string;
  mset_end_time?: string;
  mset_end_address?: string;
  mset_end_image?: string;
}

interface AttendanceData {
  userid: string;
  name: string;
  date: string;
  start_time?: string;
  start_address?: string;
  start_image?: string;
  break_out_time?: string;
  break_out_address?: string;
  break_out_image?: string;
  break_in_time?: string;
  break_in_address?: string;
  break_in_image?: string;
  end_time?: string;
  end_address?: string;
  end_image?: string;
}

interface ImageUploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

// Helper functions
function getCurrentDate(): string {
  return new Date().toLocaleDateString('sv-SE');
}

function formatDateString(date: string, month: string, year: string): string {
  const paddedDate = String(date).padStart(2, '0');
  const paddedMonth = String(month).padStart(2, '0');
  return `${year}-${paddedMonth}-${paddedDate}`;
}

async function fetchAttendanceFromAPI(userId: string): Promise<AttendanceApiResponse> {
  const formData = new URLSearchParams();
  formData.append('userid', userId);

  try {
    const { data } = await axios.post(
      ATTENDANCE_API_ENDPOINT,
      formData.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 10000,
      }
    );
    return data;
  } catch (error) {
    throw new Error(`Failed to fetch attendance data from API: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Image processing functions
async function downloadImage(imageUrl: string): Promise<Buffer | null> {
  if (!imageUrl || imageUrl.trim() === '') {
    return null;
  }

  try {
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 30000, // 30 seconds timeout
      maxContentLength: 10 * 1024 * 1024, // 10MB max
    });

    return Buffer.from(response.data);
  } catch (error) {
    console.error(`Failed to download image from ${imageUrl}:`, error instanceof Error ? error.message : error);
    return null;
  }
}

async function uploadToImageKit(
  imageBuffer: Buffer, 
  fileName: string, 
  folderPath: string
): Promise<ImageUploadResult> {
  try {
    const uploadResponse = await imagekit.upload({
      file: imageBuffer,
      fileName: fileName,
      folder: folderPath,
      useUniqueFileName: true,
    });

    return {
      success: true,
      url: uploadResponse.url,
    };
  } catch (error) {
    console.error(`Failed to upload to ImageKit:`, error instanceof Error ? error.message : error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

function generateFileName(userId: string, date: string, imageType: string): string {
  const timestamp = Date.now();
  const cleanDate = date.replace(/-/g, '');
  return `${userId}_${cleanDate}_${imageType}_${timestamp}.jpg`;
}

function generateFolderPath(date: string): string {
  const [year, month] = date.split('-');
  return `/attendance/${year}/${month}`;
}

async function processImageUpload(
  imageUrl: string | undefined,
  userId: string,
  date: string,
  imageType: string
): Promise<string | undefined> {
  if (!imageUrl) {
    return undefined;
  }

  try {
    // Step 1: Download image
    const imageBuffer = await downloadImage(imageUrl);
    if (!imageBuffer) {
      console.warn(`Failed to download ${imageType} image for user ${userId}`);
      return imageUrl; // Return original URL as fallback
    }

    // Step 2: Upload to ImageKit
    const fileName = generateFileName(userId, date, imageType);
    const folderPath = generateFolderPath(date);
    
    const uploadResult = await uploadToImageKit(imageBuffer, fileName, folderPath);
    
    if (uploadResult.success && uploadResult.url) {
      console.log(`Successfully uploaded ${imageType} image for user ${userId} to ImageKit`);
      return uploadResult.url;
    } else {
      console.warn(`Failed to upload ${imageType} image for user ${userId}:`, uploadResult.error);
      return imageUrl; // Return original URL as fallback
    }
  } catch (error) {
    console.error(`Error processing ${imageType} image for user ${userId}:`, error instanceof Error ? error.message : error);
    return imageUrl; // Return original URL as fallback
  }
}

async function processAllImages(
  apiData: AttendanceApiResponse,
  userId: string,
  date: string
): Promise<{
  start_image?: string;
  break_out_image?: string;
  break_in_image?: string;
  end_image?: string;
}> {
  // Process all images concurrently with limit
  const imageProcessPromises = [
    { type: 'start', url: apiData.mset_start_image },
    { type: 'break_out', url: apiData.mset_break_out_image },
    { type: 'break_in', url: apiData.mset_break_in_image },
    { type: 'end', url: apiData.mset_end_image },
  ].map(async ({ type, url }) => {
    const processedUrl = await processImageUpload(url, userId, date, type);
    return { type, url: processedUrl };
  });

  const results = await Promise.allSettled(imageProcessPromises);
  
  const processedImages: any = {};
  results.forEach((result, index) => {
    const imageType = ['start', 'break_out', 'break_in', 'end'][index];
    if (result.status === 'fulfilled' && result.value.url) {
      processedImages[`${imageType}_image`] = result.value.url;
    }
  });

  return processedImages;
}

function createAttendanceData(
  userId: string, 
  scheduleName: string, 
  apiData: AttendanceApiResponse, 
  date: string,
  processedImages: any
): AttendanceData {
  return {
    userid: userId,
    name: scheduleName,
    date: date,
    start_time: apiData.mset_start_time,
    start_address: apiData.mset_start_address,
    start_image: processedImages.start_image || apiData.mset_start_image,
    break_out_time: apiData.mset_break_out_time,
    break_out_address: apiData.mset_break_out_address,
    break_out_image: processedImages.break_out_image || apiData.mset_break_out_image,
    break_in_time: apiData.mset_break_in_time,
    break_in_address: apiData.mset_break_in_address,
    break_in_image: processedImages.break_in_image || apiData.mset_break_in_image,
    end_time: apiData.mset_end_time,
    end_address: apiData.mset_end_address,
    end_image: processedImages.end_image || apiData.mset_end_image,
  };
}

async function saveAttendanceData(attendanceData: AttendanceData): Promise<void> {
  await Attendance.findOneAndUpdate(
    { userid: attendanceData.userid, date: attendanceData.date },
    attendanceData,
    { upsert: true, new: true }
  );
}

// Main controller functions
export async function fetchAttendance(req: Request, res: Response): Promise<void> {
  try {
    const schedules = await Schedule.find({ employee_id: { $ne: null } });
    
    if (schedules.length === 0) {
      res.status(200).json({
        message: 'No schedules found with employee IDs.',
        success: 0,
        failed: 0,
      });
      return;
    }

    let successCount = 0;
    let failCount = 0;
    const attendanceDate = getCurrentDate();

    // Process schedules in smaller batches to avoid overwhelming external services
    const batchSize = 3; // Reduced batch size due to image processing
    for (let i = 0; i < schedules.length; i += batchSize) {
      const batch = schedules.slice(i, i + batchSize);
      
      await Promise.allSettled(
        batch.map(async (schedule) => {
          const userId = schedule.employee_id;
          if (!userId) return;

          try {
            console.log(`Processing attendance for user ${userId}...`);
            
            // Step 1: Fetch attendance data
            const apiData = await fetchAttendanceFromAPI(userId);

            if (apiData.success) {
              // Step 2: Process all images
              const processedImages = await processAllImages(apiData, userId, attendanceDate);
              
              // Step 3: Create attendance data with processed images
              const attendanceData = createAttendanceData(
                userId, 
                schedule.name, 
                apiData, 
                attendanceDate,
                processedImages
              );
              
              // Step 4: Save to database
              await saveAttendanceData(attendanceData);
              
              console.log(`Successfully processed attendance for user ${userId}`);
              successCount++;
            } else {
              console.warn(`API returned success: false for user ${userId}`);
              failCount++;
            }
          } catch (error) {
            console.error(`Failed to process attendance for user ${userId}:`, error instanceof Error ? error.message : error);
            failCount++;
          }
        })
      );

      // Add small delay between batches to avoid rate limiting
      if (i + batchSize < schedules.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    res.status(200).json({
      message: 'Attendance fetch process completed.',
      success: successCount,
      failed: failCount,
      total: schedules.length,
    });
  } catch (error) {
    console.error('Error in fetchAttendance:', error instanceof Error ? error.message : error);
    res.status(500).json({ 
      error: 'Internal server error occurred while fetching attendance data.' 
    });
  }
}

export async function fetchAttendanceByUser(req: Request, res: Response): Promise<void> {
  try {
    const { employeeId } = req.params;

    if (!employeeId) {
      res.status(400).json({ error: 'Employee ID is required.' });
      return;
    }

    const schedule = await Schedule.findOne({ employee_id: employeeId });

    if (!schedule) {
      res.status(404).json({ error: 'Employee not found in schedule.' });
      return;
    }

    console.log(`Processing attendance for user ${employeeId}...`);
    
    const apiData = await fetchAttendanceFromAPI(employeeId);

    if (!apiData.success) {
      res.status(400).json({ error: 'Attendance API returned unsuccessful response.' });
      return;
    }

    const attendanceDate = getCurrentDate();
    
    // Process images
    const processedImages = await processAllImages(apiData, employeeId, attendanceDate);
    
    // Create attendance data with processed images
    const attendanceData = createAttendanceData(
      employeeId, 
      schedule.name, 
      apiData, 
      attendanceDate,
      processedImages
    );

    const savedAttendance = await Attendance.findOneAndUpdate(
      { userid: employeeId, date: attendanceDate },
      attendanceData,
      { upsert: true, new: true }
    );

    console.log(`Successfully processed attendance for user ${employeeId}`);

    res.status(200).json({ 
      message: 'Attendance data fetched and saved successfully.', 
      data: savedAttendance 
    });
  } catch (error) {
    console.error('Error in fetchAttendanceByUser:', error instanceof Error ? error.message : error);
    res.status(500).json({ error: 'Internal server error occurred while fetching user attendance.' });
  }
}

// New endpoint for migrating existing images to ImageKit
export async function migrateExistingImages(req: Request, res: Response): Promise<void> {
  try {
    const { limit = 50, skip = 0, forceUpdate = false } = req.query;
    
    // Parse query parameters
    const limitNum = parseInt(limit as string, 10) || 50;
    const skipNum = parseInt(skip as string, 10) || 0;
    const shouldForceUpdate = forceUpdate === 'true';

    console.log(`Starting image migration process. Limit: ${limitNum}, Skip: ${skipNum}, Force Update: ${shouldForceUpdate}`);

    // Find attendance records that have image URLs
    const query: any = {
      $or: [
        { start_image: { $exists: true, $nin: [null, ''] } },
        { break_out_image: { $exists: true, $nin: [null, ''] } },
        { break_in_image: { $exists: true, $nin: [null, ''] } },
        { end_image: { $exists: true, $nin: [null, ''] } }
      ]
    };

    // If not force update, only migrate images that are not from ImageKit
    if (!shouldForceUpdate) {
      query.$or = [
        { start_image: { $exists: true, $nin: [null, ''], $not: /imagekit\.io/i } },
        { break_out_image: { $exists: true, $nin: [null, ''], $not: /imagekit\.io/i } },
        { break_in_image: { $exists: true, $nin: [null, ''], $not: /imagekit\.io/i } },
        { end_image: { $exists: true, $nin: [null, ''], $not: /imagekit\.io/i } }
      ];
    }

    const totalRecords = await Attendance.countDocuments(query);
    const attendanceRecords = await Attendance.find(query)
      .limit(limitNum)
      .skip(skipNum)
      .sort({ date: -1 }); // Process newest first

    if (attendanceRecords.length === 0) {
      res.status(200).json({
        message: 'No records found for migration.',
        totalRecords,
        processed: 0,
        success: 0,
        failed: 0,
        hasMore: false
      });
      return;
    }

    let successCount = 0;
    let failCount = 0;
    const migrationResults: Array<{
      userid: string;
      date: string;
      images: { [key: string]: { original: string; migrated?: string; error?: string } } | { error: string };
    }> = [];

    // Process records in smaller batches
    const batchSize = 5;
    for (let i = 0; i < attendanceRecords.length; i += batchSize) {
      const batch = attendanceRecords.slice(i, i + batchSize);

      await Promise.allSettled(
        batch.map(async (record) => {
          try {
            const migrationResult = {
              userid: record.userid,
              date: record.date,
              images: {} as any
            };

            const imageFields = ['start_image', 'break_out_image', 'break_in_image', 'end_image'];
            const updateData: any = {};
            let hasUpdates = false;

            // Process each image field
            for (const imageField of imageFields) {
              const originalUrl = record[imageField as keyof typeof record] as string;
              
              if (originalUrl && originalUrl.trim() !== '') {
                // Skip if already from ImageKit and not forcing update
                if (!shouldForceUpdate && originalUrl.includes('imagekit.io')) {
                  migrationResult.images[imageField] = {
                    original: originalUrl,
                    migrated: originalUrl,
                    error: 'Already migrated (skipped)'
                  };
                  continue;
                }

                const imageType = imageField.replace('_image', '');
                const migratedUrl = await processImageUpload(
                  originalUrl,
                  record.userid,
                  record.date,
                  imageType
                );

                migrationResult.images[imageField] = {
                  original: originalUrl,
                  migrated: migratedUrl
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
              console.log(`Migrated images for user ${record.userid} on ${record.date}`);
            }

            migrationResults.push(migrationResult);
            successCount++;

          } catch (error) {
            console.error(`Failed to migrate images for user ${record.userid}:`, error instanceof Error ? error.message : error);
            migrationResults.push({
              userid: record.userid,
              date: record.date,
              images: { error: error instanceof Error ? error.message : 'Unknown error' }
            });
            failCount++;
          }
        })
      );

      // Add delay between batches
      if (i + batchSize < attendanceRecords.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Log progress
      console.log(`Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(attendanceRecords.length / batchSize)}`);
    }

    const hasMore = skipNum + limitNum < totalRecords;

    res.status(200).json({
      message: 'Image migration process completed.',
      totalRecords,
      processed: attendanceRecords.length,
      success: successCount,
      failed: failCount,
      hasMore,
      nextSkip: hasMore ? skipNum + limitNum : null,
      results: migrationResults
    });

  } catch (error) {
    console.error('Error in migrateExistingImages:', error instanceof Error ? error.message : error);
    res.status(500).json({
      error: 'Internal server error occurred while migrating images.'
    });
  }
}

// New endpoint for getting migration statistics
export async function getMigrationStats(req: Request, res: Response): Promise<void> {
  try {
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

    res.status(200).json({
      message: 'Migration statistics retrieved successfully.',
      stats: {
        totalWithImages,
        alreadyMigrated,
        needMigration,
        migrationProgress: totalWithImages > 0 ? ((alreadyMigrated / totalWithImages) * 100).toFixed(2) + '%' : '0%'
      },
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
    });

  } catch (error) {
    console.error('Error in getMigrationStats:', error instanceof Error ? error.message : error);
    res.status(500).json({
      error: 'Internal server error occurred while fetching migration stats.'
    });
  }
}

// Keep the existing getAttendanceByFilter function unchanged
export async function getAttendanceByFilter(req: Request, res: Response): Promise<void> {
  try {
    const { employeeId } = req.params;
    const { date, month, year } = req.query;

    if (!employeeId || !date || !month || !year) {
      res.status(400).json({ 
        error: 'Missing required parameters. Please provide employeeId, date, month, and year.' 
      });
      return;
    }

    if (typeof date !== 'string' || typeof month !== 'string' || typeof year !== 'string') {
      res.status(400).json({ 
        error: 'Invalid parameter types. Date, month, and year must be strings.' 
      });
      return;
    }

    const dateNum = parseInt(date, 10);
    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);

    if (isNaN(dateNum) || isNaN(monthNum) || isNaN(yearNum)) {
      res.status(400).json({ 
        error: 'Invalid date values. Please provide numeric values for date, month, and year.' 
      });
      return;
    }

    if (dateNum < 1 || dateNum > 31 || monthNum < 1 || monthNum > 12 || yearNum < 1900) {
      res.status(400).json({ 
        error: 'Date values out of range. Please provide valid date, month, and year.' 
      });
      return;
    }

    const filterDate = formatDateString(date, month, year);

    const attendance = await Attendance.findOne({
      userid: employeeId,
      date: filterDate
    });

    if (!attendance) {
      res.status(404).json({ 
        message: `No attendance record found for employee ${employeeId} on ${filterDate}.` 
      });
      return;
    }

    res.status(200).json({
      message: 'Attendance record retrieved successfully.',
      data: attendance
    });
  } catch (error) {
    console.error('Error in getAttendanceByFilter:', error instanceof Error ? error.message : error);
    res.status(500).json({ 
      error: 'Internal server error occurred while retrieving attendance data.' 
    });
  }
}
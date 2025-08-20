import Attendance, { IAttendance, IAttendanceMethods } from '../models/Attendance';
import { logger } from '../utils/loggers';
import { AppError } from '../utils/errorTypes';
import { Document } from 'mongoose';

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

export class AttendanceService {
  async saveAttendanceData(attendanceData: AttendanceData): Promise<IAttendance & IAttendanceMethods & Document> {
    try {
      const savedAttendance = await Attendance.findOneAndUpdate(
        { userid: attendanceData.userid, date: attendanceData.date },
        attendanceData,
        { upsert: true, new: true, runValidators: true }
      );

      logger.info(`Attendance data saved for user ${attendanceData.userid} on ${attendanceData.date}`);
      return savedAttendance;
      
    } catch (error: any) {
      logger.error(`Failed to save attendance data:`, {
        userid: attendanceData.userid,
        date: attendanceData.date,
        error: error.message
      });
      
      if (error.name === 'ValidationError') {
        throw new AppError('Invalid attendance data format', 400);
      }
      
      if (error.code === 11000) {
        // Duplicate key error - this shouldn't happen with upsert, but just in case
        throw new AppError('Duplicate attendance record', 409);
      }
      
      throw new AppError('Failed to save attendance data', 500);
    }
  }

  async getAttendanceByUserId(userid: string, date?: string): Promise<(IAttendance & IAttendanceMethods & Document) | (IAttendance & IAttendanceMethods & Document)[] | null> {
    try {
      const query: any = { userid };
      if (date) {
        query.date = date;
      }

      const attendance = await Attendance.find(query).sort({ date: -1 });
      return attendance;
      
    } catch (error: any) {
      logger.error(`Failed to get attendance data:`, {
        userid,
        date,
        error: error.message
      });
      
      throw new AppError('Failed to retrieve attendance data', 500);
    }
  }

  async getAttendanceByDateRange(userid: string, startDate: string, endDate: string): Promise<(IAttendance & IAttendanceMethods & Document)[]> {
    try {
      const attendance = await Attendance.find({
        userid,
        date: { $gte: startDate, $lte: endDate }
      }).sort({ date: 1 });

      return attendance;
      
    } catch (error: any) {
      logger.error(`Failed to get attendance data by date range:`, {
        userid,
        startDate,
        endDate,
        error: error.message
      });
      
      throw new AppError('Failed to retrieve attendance data', 500);
    }
  }

  async deleteAttendanceData(userid: string, date: string): Promise<(IAttendance & IAttendanceMethods & Document) | null> {
    try {
      const result = await Attendance.findOneAndDelete({ userid, date });
      
      if (!result) {
        throw new AppError('Attendance record not found', 404);
      }

      logger.info(`Attendance data deleted for user ${userid} on ${date}`);
      return result as unknown as (IAttendance & IAttendanceMethods & Document);
      
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logger.error(`Failed to delete attendance data:`, {
        userid,
        date,
        error: error.message
      });
      
      throw new AppError('Failed to delete attendance data', 500);
    }
  }

  async getAttendanceStatistics(userid?: string, startDate?: string, endDate?: string) {
    try {
      const matchStage: any = {};
      
      if (userid) {
        matchStage.userid = userid;
      }
      
      if (startDate && endDate) {
        matchStage.date = { $gte: startDate, $lte: endDate };
      }

      const pipeline = [
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalRecords: { $sum: 1 },
            recordsWithStartTime: {
              $sum: { $cond: [{ $ifNull: ['$start_time', false] }, 1, 0] }
            },
            recordsWithEndTime: {
              $sum: { $cond: [{ $ifNull: ['$end_time', false] }, 1, 0] }
            },
            recordsWithBreakOut: {
              $sum: { $cond: [{ $ifNull: ['$break_out_time', false] }, 1, 0] }
            },
            recordsWithBreakIn: {
              $sum: { $cond: [{ $ifNull: ['$break_in_time', false] }, 1, 0] }
            },
            recordsWithImages: {
              $sum: { 
                $cond: [
                  {
                    $or: [
                      { $ifNull: ['$start_image', false] },
                      { $ifNull: ['$break_out_image', false] },
                      { $ifNull: ['$break_in_image', false] },
                      { $ifNull: ['$end_image', false] }
                    ]
                  }, 
                  1, 
                  0
                ]
              }
            }
          }
        }
      ];

      const result = await Attendance.aggregate(pipeline);
      return result[0] || {
        totalRecords: 0,
        recordsWithStartTime: 0,
        recordsWithEndTime: 0,
        recordsWithBreakOut: 0,
        recordsWithBreakIn: 0,
        recordsWithImages: 0
      };
      
    } catch (error: any) {
      logger.error(`Failed to get attendance statistics:`, {
        userid,
        startDate,
        endDate,
        error: error.message
      });
      
      throw new AppError('Failed to retrieve attendance statistics', 500);
    }
  }
}
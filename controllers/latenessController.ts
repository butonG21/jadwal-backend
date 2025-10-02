import { Request, Response } from 'express';
import { latenessService } from '../services/latenessService';
import { logger } from '../utils/loggers';
import { ApiResponse } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError, NotFoundError } from '../utils/errorTypes';
import { DateHelper } from '../utils/dateHelper';

class LatenessController {

  /**
   * Helper function untuk format waktu
   */
  private formatMinutesToReadable(minutes: number): string {
    const roundedMinutes = Math.round(minutes);
    if (roundedMinutes === 0) return "0 menit";
    if (roundedMinutes < 60) return `${roundedMinutes} menit`;
    const hours = Math.floor(roundedMinutes / 60);
    const remainingMinutes = roundedMinutes % 60;
    if (remainingMinutes === 0) return `${hours} jam`;
    return `${hours} jam ${remainingMinutes} menit`;
  }

  /**
   * Hitung dan simpan keterlambatan untuk satu karyawan pada tanggal tertentu
   */
  calculateLatenessForDate = asyncHandler(async (req: Request, res: Response) => {
    const { employeeId } = req.params;
    const { date } = req.query;
    const requestId = (req as any).requestId;

    if (!employeeId) {
      throw new AppError('Employee ID is required', 400);
    }

    const targetDate = (date as string) || DateHelper.getCurrentDateIndonesia();
    
    // Validasi format tanggal
    if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
      throw new AppError('Date must be in YYYY-MM-DD format', 400);
    }

    logger.info(`Calculating lateness for employee ${employeeId} on ${targetDate}`, { requestId });

    try {
      // Hitung keterlambatan
      const latenessResult = await latenessService.calculateLatenessForUser(employeeId, targetDate);
      
      if (!latenessResult) {
        throw new NotFoundError(`No schedule found for employee ${employeeId} on ${targetDate}`);
      }

      // Simpan ke database
      const savedResult = await latenessService.saveLatenessData(latenessResult);

      logger.info(`Lateness calculated and saved for employee ${employeeId}`, {
        requestId,
        date: targetDate,
        status: latenessResult.attendance_status,
        startLateness: latenessResult.start_lateness_minutes
      });

      // Format response sesuai dokumentasi
      const response = {
        success: true,
        message: 'Lateness calculated successfully',
        data: {
          employee_id: latenessResult.userid,
          employee_name: latenessResult.name || 'Unknown',
          date: targetDate,
          shift: latenessResult.shift,
          scheduled_start_time: latenessResult.scheduled_start_time,
          scheduled_end_time: latenessResult.scheduled_end_time,
          actual_start_time: latenessResult.actual_start_time || null,
          actual_end_time: latenessResult.actual_end_time || null,
          actual_break_out: latenessResult.actual_break_out_time || null,
          actual_break_in: latenessResult.actual_break_in_time || null,
          start_lateness_minutes: latenessResult.start_lateness_minutes,
          end_lateness_minutes: latenessResult.end_lateness_minutes,
          break_lateness_minutes: latenessResult.break_lateness_minutes,
          total_working_minutes: latenessResult.total_working_minutes,
          scheduled_working_minutes: 480, // Default 8 hours
          attendance_status: latenessResult.attendance_status,
          break_status: latenessResult.break_status,
          is_complete_attendance: latenessResult.is_complete_attendance,
          created_at: savedResult.createdAt,
          updated_at: savedResult.updatedAt
        },
        timestamp: new Date().toISOString()
      };

      res.status(200).json(response);
      
    } catch (error: any) {
      logger.error(`Failed to calculate lateness for employee ${employeeId}:`, {
        requestId,
        employeeId,
        date: targetDate,
        error: error.message
      });
      throw error;
    }
  });

  /**
   * Hitung keterlambatan untuk date range
   */
  calculateLatenessForDateRange = asyncHandler(async (req: Request, res: Response) => {
    const { employeeId } = req.params;
    const { startDate, endDate, saveToDb } = req.query;
    const requestId = (req as any).requestId;

    if (!employeeId || !startDate || !endDate) {
      throw new AppError('Employee ID, start date, and end date are required', 400);
    }

    // Validasi format tanggal
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate as string) || !dateRegex.test(endDate as string)) {
      throw new AppError('Dates must be in YYYY-MM-DD format', 400);
    }

    // Validasi range tanggal (maksimal 31 hari)
    const start = new Date(startDate as string);
    const end = new Date(endDate as string);
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff > 31) {
      throw new AppError('Date range cannot exceed 31 days', 400);
    }

    if (start > end) {
      throw new AppError('Start date must be before end date', 400);
    }

    logger.info(`Calculating lateness for employee ${employeeId} from ${startDate} to ${endDate}`, { requestId });

    try {
      // Hitung keterlambatan untuk range
      const latenessResults = await latenessService.calculateLatenessForDateRange(
        employeeId,
        startDate as string,
        endDate as string
      );

      let savedResults: any[] = [];
      
      // Simpan ke database jika diminta
      if (saveToDb === 'true') {
        for (const result of latenessResults) {
          const saved = await latenessService.saveLatenessData(result);
          savedResults.push({
            date: result.date,
            id: saved._id,
            status: result.attendance_status
          });
        }
      }

      // Hitung statistik dengan informasi lengkap
      const totalStartLateness = latenessResults.reduce((sum, r) => sum + Math.max(0, r.start_lateness_minutes), 0);
      const totalBreakLateness = latenessResults.reduce((sum, r) => sum + Math.max(0, r.break_lateness_minutes), 0);
      const totalLatenessMinutes = totalStartLateness + totalBreakLateness;
      const avgStartLateness = latenessResults.length > 0 ? totalStartLateness / latenessResults.length : 0;
      
      // Helper function untuk format waktu
      const formatMinutesToReadable = (minutes: number): string => {
        const roundedMinutes = Math.round(minutes);
        if (roundedMinutes === 0) return "0 menit";
        if (roundedMinutes < 60) return `${roundedMinutes} menit`;
        const hours = Math.floor(roundedMinutes / 60);
        const remainingMinutes = roundedMinutes % 60;
        if (remainingMinutes === 0) return `${hours} jam`;
        return `${hours} jam ${remainingMinutes} menit`;
      };
      
      const stats = {
        period: {
          startDate,
          endDate
        },
        employee: {
          userid: employeeId,
          name: latenessResults.length > 0 ? latenessResults[0].name : 'Unknown'
        },
        totalDays: latenessResults.length,
        onTime: latenessResults.filter(r => r.attendance_status === 'on_time').length,
        late: latenessResults.filter(r => r.attendance_status === 'late').length,
        veryLate: latenessResults.filter(r => r.attendance_status === 'very_late').length,
        absent: latenessResults.filter(r => r.attendance_status === 'absent').length,
        offDays: latenessResults.filter(r => r.attendance_status === 'off_day').length,
        startLatenessMinutes: Math.round(totalStartLateness),
        breakLatenessMinutes: Math.round(totalBreakLateness),
        totalLatenessMinutes: Math.round(totalLatenessMinutes),
        averageStartLateness: formatMinutesToReadable(avgStartLateness),
        totalLateMinutes: formatMinutesToReadable(totalLatenessMinutes)
      };

      logger.info(`Lateness calculated for date range`, {
        requestId,
        employeeId,
        totalDays: stats.totalDays,
        lateCount: stats.late + stats.veryLate
      });

      // Format response sesuai dokumentasi
      const response = {
        success: true,
        message: 'Lateness calculated for date range successfully',
        data: {
          employee_id: employeeId,
          employee_name: latenessResults.length > 0 ? latenessResults[0].name : 'Unknown',
          period: {
            start_date: startDate,
            end_date: endDate,
            total_days: latenessResults.length
          },
          summary: {
            on_time: stats.onTime,
            late: stats.late,
            very_late: stats.veryLate,
            absent: stats.absent,
            off_days: stats.offDays,
            total_lateness_minutes: stats.totalLatenessMinutes,
            average_lateness_minutes: Math.round(stats.totalLatenessMinutes / Math.max(1, stats.late + stats.veryLate))
          },
          daily_records: latenessResults.map(result => ({
            _id: (result as any)._id || null,
            employee_id: result.userid,
            date: result.date,
            attendance_status: result.attendance_status,
            start_lateness_minutes: result.start_lateness_minutes,
            break_lateness_minutes: result.break_lateness_minutes,
            end_lateness_minutes: result.end_lateness_minutes,
            total_working_minutes: result.total_working_minutes,
            is_complete_attendance: result.is_complete_attendance,
            shift: result.shift,
            scheduled_start_time: result.scheduled_start_time,
            scheduled_end_time: result.scheduled_end_time,
            actual_start_time: result.actual_start_time || null,
            actual_end_time: result.actual_end_time || null,
            actual_break_out: result.actual_break_out_time || null,
            actual_break_in: result.actual_break_in_time || null,
            break_status: result.break_status,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })),
          saved_to_database: saveToDb === 'true',
          saved_records_count: saveToDb === 'true' ? savedResults.length : 0
        },
        timestamp: new Date().toISOString()
      };

      res.status(200).json(response);
      
    } catch (error: any) {
      logger.error(`Failed to calculate lateness for date range:`, {
        requestId,
        employeeId,
        startDate,
        endDate,
        error: error.message
      });
      throw error;
    }
  });

  /**
   * Hitung keterlambatan untuk satu bulan
   */
  calculateLatenessForMonth = asyncHandler(async (req: Request, res: Response) => {
    const { employeeId } = req.params;
    const { month, year, saveToDb } = req.query;
    const requestId = (req as any).requestId;

    if (!employeeId || !month || !year) {
      throw new AppError('Employee ID, month, and year are required', 400);
    }

    const monthNum = parseInt(month as string);
    const yearNum = parseInt(year as string);

    // Validasi month dan year
    if (monthNum < 1 || monthNum > 12) {
      throw new AppError('Month must be between 1 and 12', 400);
    }

    if (yearNum < 2020 || yearNum > 2030) {
      throw new AppError('Year must be between 2020 and 2030', 400);
    }

    logger.info(`Calculating lateness for employee ${employeeId} for ${monthNum}/${yearNum}`, { requestId });

    try {
      // Hitung keterlambatan untuk bulan
      const latenessResults = await latenessService.calculateLatenessForMonth(
        employeeId,
        monthNum,
        yearNum
      );

      let savedResults: any[] = [];
      
      // Simpan ke database jika diminta
      if (saveToDb === 'true') {
        for (const result of latenessResults) {
          const saved = await latenessService.saveLatenessData(result);
          savedResults.push({
            date: result.date,
            id: saved._id,
            status: result.attendance_status
          });
        }
      }

      // Hitung statistik bulanan dengan informasi lengkap
      const totalStartLateness = latenessResults.reduce((sum, r) => sum + Math.max(0, r.start_lateness_minutes), 0);
      const totalBreakLateness = latenessResults.reduce((sum, r) => sum + Math.max(0, r.break_lateness_minutes), 0);
      const totalLatenessMinutes = totalStartLateness + totalBreakLateness;
      const avgStartLateness = latenessResults.length > 0 ? totalStartLateness / latenessResults.length : 0;
      
      // Helper function untuk format waktu
      const formatMinutesToReadable = (minutes: number): string => {
        const roundedMinutes = Math.round(minutes);
        if (roundedMinutes === 0) return "0 menit";
        if (roundedMinutes < 60) return `${roundedMinutes} menit`;
        const hours = Math.floor(roundedMinutes / 60);
        const remainingMinutes = roundedMinutes % 60;
        if (remainingMinutes === 0) return `${hours} jam`;
        return `${hours} jam ${remainingMinutes} menit`;
      };
      
      const monthlyStats = {
        period: {
          month: monthNum,
          year: yearNum
        },
        employee: {
          userid: employeeId,
          name: latenessResults.length > 0 ? latenessResults[0].name : 'Unknown'
        },
        totalWorkingDays: latenessResults.filter(r => r.attendance_status !== 'off_day').length,
        totalScheduledDays: latenessResults.length,
        onTime: latenessResults.filter(r => r.attendance_status === 'on_time').length,
        late: latenessResults.filter(r => r.attendance_status === 'late').length,
        veryLate: latenessResults.filter(r => r.attendance_status === 'very_late').length,
        absent: latenessResults.filter(r => r.attendance_status === 'absent').length,
        offDays: latenessResults.filter(r => r.attendance_status === 'off_day').length,
        startLatenessMinutes: Math.round(totalStartLateness),
        breakLatenessMinutes: Math.round(totalBreakLateness),
        totalLatenessMinutes: Math.round(totalLatenessMinutes),
        attendanceRate: 0,
        punctualityRate: 0,
        averageWorkingHours: 0,
        averageStartLateness: formatMinutesToReadable(avgStartLateness),
        totalLateMinutes: formatMinutesToReadable(totalLatenessMinutes)
      };

      // Hitung rate
      const workingDays = monthlyStats.totalWorkingDays;
      if (workingDays > 0) {
        const presentDays = workingDays - monthlyStats.absent;
        monthlyStats.attendanceRate = Math.round((presentDays / workingDays) * 100);
        monthlyStats.punctualityRate = Math.round((monthlyStats.onTime / presentDays) * 100) || 0;
        monthlyStats.averageWorkingHours = Math.round(
          latenessResults.reduce((sum, r) => sum + r.total_working_minutes, 0) / presentDays / 60 * 100
        ) / 100;
      }

      logger.info(`Monthly lateness calculated`, {
        requestId,
        employeeId,
        month: monthNum,
        year: yearNum,
        attendanceRate: monthlyStats.attendanceRate,
        punctualityRate: monthlyStats.punctualityRate
      });

      // Format response sesuai dokumentasi
      const response = {
        success: true,
        message: 'Monthly lateness calculated successfully',
        data: {
          employee_id: employeeId,
          employee_name: latenessResults.length > 0 ? latenessResults[0].name : 'Unknown',
          period: {
            month: monthNum,
            year: yearNum,
            month_name: new Date(yearNum, monthNum - 1).toLocaleString('id-ID', { month: 'long' }),
            total_days: latenessResults.length,
            working_days: monthlyStats.totalWorkingDays
          },
          summary: {
            on_time: monthlyStats.onTime,
            late: monthlyStats.late,
            very_late: monthlyStats.veryLate,
            absent: monthlyStats.absent,
            off_days: monthlyStats.offDays,
            attendance_rate: monthlyStats.attendanceRate,
            punctuality_rate: monthlyStats.punctualityRate,
            total_lateness_minutes: monthlyStats.totalLatenessMinutes,
            average_lateness_minutes: Math.round(monthlyStats.totalLatenessMinutes / Math.max(1, monthlyStats.late + monthlyStats.veryLate)),
            average_working_hours: monthlyStats.averageWorkingHours
          },
          daily_records: latenessResults.map(result => ({
            _id: (result as any)._id || null,
            employee_id: result.userid,
            date: result.date,
            attendance_status: result.attendance_status,
            start_lateness_minutes: result.start_lateness_minutes,
            break_lateness_minutes: result.break_lateness_minutes,
            end_lateness_minutes: result.end_lateness_minutes,
            total_working_minutes: result.total_working_minutes,
            is_complete_attendance: result.is_complete_attendance,
            shift: result.shift,
            scheduled_start_time: result.scheduled_start_time,
            scheduled_end_time: result.scheduled_end_time,
            actual_start_time: result.actual_start_time || null,
            actual_end_time: result.actual_end_time || null,
            actual_break_out: result.actual_break_out_time || null,
            actual_break_in: result.actual_break_in_time || null,
            break_status: result.break_status,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })),
          saved_to_database: saveToDb === 'true',
          saved_records_count: saveToDb === 'true' ? savedResults.length : 0
        },
        timestamp: new Date().toISOString()
      };

      res.status(200).json(response);
      
    } catch (error: any) {
      logger.error(`Failed to calculate monthly lateness:`, {
        requestId,
        employeeId,
        month: monthNum,
        year: yearNum,
        error: error.message
      });
      throw error;
    }
  });

  /**
   * Ambil data keterlambatan yang sudah tersimpan
   */
  getLatenessData = asyncHandler(async (req: Request, res: Response) => {
    const { employeeId } = req.params;
    const { date, startDate, endDate, limit, page } = req.query;
    const requestId = (req as any).requestId;

    if (!employeeId) {
      throw new AppError('Employee ID is required', 400);
    }

    // Parse pagination parameters
    const limitNum = parseInt(limit as string) || 50;
    const pageNum = parseInt(page as string) || 1;
    const skip = (pageNum - 1) * limitNum;

    // Validate pagination parameters
    if (limitNum > 100) {
      throw new AppError('Limit cannot exceed 100', 400);
    }

    if (pageNum < 1) {
      throw new AppError('Page must be greater than 0', 400);
    }

    logger.info(`Getting lateness data for employee ${employeeId}`, { requestId, page: pageNum, limit: limitNum });

    try {
      // Get total count first
      const allData = await latenessService.getLatenessData(
        employeeId,
        date as string,
        startDate as string,
        endDate as string
      );

      const totalRecords = allData.length;
      const totalPages = Math.ceil(totalRecords / limitNum);
      
      // Apply pagination
      const paginatedData = allData.slice(skip, skip + limitNum);

      // Format response sesuai dokumentasi
      const response = {
        success: true,
        message: 'Lateness data retrieved successfully',
        data: {
          employee_id: employeeId,
          employee_name: paginatedData.length > 0 ? paginatedData[0].name : 'Unknown',
          total_records: totalRecords,
          page: pageNum,
          limit: limitNum,
          total_pages: totalPages,
          records: paginatedData.map(record => ({
            _id: record._id,
            employee_id: record.userid,
            date: record.date,
            attendance_status: record.attendance_status,
            start_lateness_minutes: record.start_lateness_minutes,
            break_lateness_minutes: record.break_lateness_minutes,
            end_lateness_minutes: record.end_lateness_minutes,
            total_working_minutes: record.total_working_minutes,
            is_complete_attendance: record.is_complete_attendance,
            shift: record.shift,
            scheduled_start_time: record.scheduled_start_time,
            scheduled_end_time: record.scheduled_end_time,
            actual_start_time: record.actual_start_time || null,
            actual_end_time: record.actual_end_time || null,
            actual_break_out: record.actual_break_out_time || null,
            actual_break_in: record.actual_break_in_time || null,
            break_status: record.break_status,
            created_at: record.createdAt,
            updated_at: record.updatedAt
          }))
        },
        timestamp: new Date().toISOString()
      };

      res.status(200).json(response);
      
    } catch (error: any) {
      logger.error(`Failed to get lateness data:`, {
        requestId,
        employeeId,
        error: error.message
      });
      throw error;
    }
  });

  /**
   * Ambil statistik keterlambatan
   */
  getLatenessStats = asyncHandler(async (req: Request, res: Response) => {
    const { employeeId } = req.params;
    const { startDate, endDate, groupBy } = req.query;
    const requestId = (req as any).requestId;

    // Validate groupBy parameter
    const validGroupBy = ['day', 'week', 'month'];
    const groupByParam = groupBy as string || 'day';
    
    if (!validGroupBy.includes(groupByParam)) {
      throw new AppError('groupBy must be one of: day, week, month', 400);
    }

    // Validate date parameters if provided
    if (startDate && endDate) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(startDate as string) || !dateRegex.test(endDate as string)) {
        throw new AppError('Dates must be in YYYY-MM-DD format', 400);
      }

      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      if (start > end) {
        throw new AppError('Start date must be before end date', 400);
      }
    }

    logger.info(`Getting lateness statistics`, { requestId, employeeId, groupBy: groupByParam, startDate, endDate });

    try {
      const stats = await latenessService.getLatenessStats(
        employeeId,
        startDate as string,
        endDate as string,
        groupByParam
      );

      // Format response sesuai dokumentasi dengan data lengkap
      const response = {
        success: true,
        message: `Lateness statistics retrieved successfully for ${employeeId ? 'employee' : 'all employees'}`,
        data: {
          employee_id: employeeId || null,
          employee_name: stats.employee?.name || null,
          period: {
            start_date: startDate || null,
            end_date: endDate || null,
            total_days: stats.totalRecords || 0,
            working_days: stats.workingDays || 0,
            group_by: groupByParam
          },
          overall_statistics: {
            total_employees: stats.totalEmployees || 1,
            total_records: stats.totalRecords || 0,
            attendance_rate: stats.attendanceRate || 0,
            punctuality_rate: stats.punctualityRate || 0,
            total_lateness_minutes: stats.totalLatenessMinutes || 0,
            average_lateness_minutes: stats.averageLatenessPerDay || 0,
            average_working_hours: stats.averageWorkingHours || 0,
            max_lateness_minutes: stats.maxLatenessMinutes || 0,
            min_lateness_minutes: stats.minLatenessMinutes || 0
          },
          status_breakdown: {
            on_time: stats.onTimeCount || 0,
            late: stats.lateCount || 0,
            very_late: stats.veryLateCount || 0,
            absent: stats.absentCount || 0,
            off_day: stats.offDayCount || 0
          },
          weekly_trends: groupByParam === 'week' ? stats.trends || [] : [],
          monthly_trends: groupByParam === 'month' ? stats.trends || [] : [],
          daily_trends: groupByParam === 'day' ? stats.trends || [] : []
        },
        timestamp: new Date().toISOString()
      };

      logger.info(`Lateness statistics retrieved successfully`, {
        requestId,
        employeeId,
        totalRecords: stats.totalRecords,
        attendanceRate: stats.attendanceRate,
        punctualityRate: stats.punctualityRate,
        trendsCount: stats.trends?.length || 0
      });

      res.status(200).json(response);
      
    } catch (error: any) {
      logger.error(`Failed to get lateness statistics:`, {
        requestId,
        employeeId,
        startDate,
        endDate,
        groupBy: groupByParam,
        error: error.message
      });
      throw error;
    }
  });

  /**
   * Ambil karyawan yang terlambat pada tanggal tertentu
   */
  getLateEmployees = asyncHandler(async (req: Request, res: Response) => {
    const { 
      date, 
      department, 
      minLatenessMinutes, 
      maxLatenessMinutes, 
      latenessType,
      limit,
      page 
    } = req.query;
    const requestId = (req as any).requestId;

    const targetDate = (date as string) || DateHelper.getCurrentDateIndonesia();
    
    // Validasi format tanggal
    if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
      throw new AppError('Date must be in YYYY-MM-DD format', 400);
    }

    // Validasi parameter paginasi
    const pageNumber = parseInt(page as string) || 1;
    const limitNumber = parseInt(limit as string) || 50;
    
    if (pageNumber < 1) {
      throw new AppError('Page must be greater than 0', 400);
    }
    
    if (limitNumber < 1 || limitNumber > 100) {
      throw new AppError('Limit must be between 1 and 100', 400);
    }

    // Validasi latenessType
    const validLatenessTypes = ['start', 'break', 'end', 'all'];
    const latenessTypeParam = (latenessType as string) || 'all';
    
    if (!validLatenessTypes.includes(latenessTypeParam)) {
      throw new AppError('latenessType must be one of: start, break, end, all', 400);
    }

    logger.info(`Getting late employees for ${targetDate}`, { 
      requestId, 
      department, 
      latenessType: latenessTypeParam,
      pagination: { page: pageNumber, limit: limitNumber }
    });

    try {
      const Lateness = (await import('../models/Lateness')).default;
      let lateEmployees = await Lateness.findLateEmployees(targetDate);

      // Apply filters
      if (department) {
        // Department filter not available in ILateness model
        // Skip department filtering for now
      }

      if (minLatenessMinutes) {
        const minMinutes = parseInt(minLatenessMinutes as string);
        lateEmployees = lateEmployees.filter(emp => 
          ((emp.start_lateness_minutes || 0) + (emp.break_lateness_minutes || 0) + (emp.end_lateness_minutes || 0)) >= minMinutes
        );
      }

      if (maxLatenessMinutes) {
        const maxMinutes = parseInt(maxLatenessMinutes as string);
        lateEmployees = lateEmployees.filter(emp => 
          ((emp.start_lateness_minutes || 0) + (emp.break_lateness_minutes || 0) + (emp.end_lateness_minutes || 0)) <= maxMinutes
        );
      }

      // Filter by lateness type
      if (latenessTypeParam !== 'all') {
        lateEmployees = lateEmployees.filter(emp => {
          switch (latenessTypeParam) {
            case 'start':
              return emp.start_lateness_minutes > 0;
            case 'break':
              return emp.break_lateness_minutes > 0;
            case 'end':
              return emp.end_lateness_minutes > 0;
            default:
              return true;
          }
        });
      }

      // Sort by total lateness (descending)
      lateEmployees.sort((a, b) => 
        ((b.start_lateness_minutes || 0) + (b.break_lateness_minutes || 0) + (b.end_lateness_minutes || 0)) - 
        ((a.start_lateness_minutes || 0) + (a.break_lateness_minutes || 0) + (a.end_lateness_minutes || 0))
      );

      // Calculate pagination
      const totalRecords = lateEmployees.length;
      const totalPages = Math.ceil(totalRecords / limitNumber);
      const offset = (pageNumber - 1) * limitNumber;
      const paginatedEmployees = lateEmployees.slice(offset, offset + limitNumber);

      // Kelompokkan berdasarkan tingkat keterlambatan
      const categorized = {
        late: lateEmployees.filter(emp => 
          emp.start_lateness_minutes > 0 && emp.start_lateness_minutes <= 60
        ),
        very_late: lateEmployees.filter(emp => 
          emp.start_lateness_minutes > 60
        ),
        long_break: lateEmployees.filter(emp => 
          emp.break_lateness_minutes > 0
        ),
        early_departure: lateEmployees.filter(emp => 
          emp.end_lateness_minutes > 0
        )
      };

      // Format detailed employee data
      const formattedEmployees = paginatedEmployees.map(emp => ({
        employee: {
          userid: emp.userid,
          name: emp.name || 'Unknown',
          department: 'Unknown' // Department info not available in ILateness
        },
        date: targetDate,
        shift: {
          name: emp.shift || 'Unknown',
          start_time: emp.scheduled_start_time,
          end_time: emp.scheduled_end_time,
          break_start: null, // Break times not available in ILateness
          break_end: null
        },
        attendance: {
          check_in: emp.actual_start_time,
          check_out: emp.actual_end_time,
          break_start: emp.actual_break_out_time,
          break_end: emp.actual_break_in_time,
          status: emp.attendance_status
        },
        lateness: {
          start_minutes: emp.start_lateness_minutes || 0,
          break_minutes: emp.break_lateness_minutes || 0,
          end_minutes: emp.end_lateness_minutes || 0,
          total_minutes: (emp.start_lateness_minutes || 0) + (emp.break_lateness_minutes || 0) + (emp.end_lateness_minutes || 0),
          formatted_start: this.formatMinutesToReadable(emp.start_lateness_minutes || 0),
          formatted_break: this.formatMinutesToReadable(emp.break_lateness_minutes || 0),
          formatted_end: this.formatMinutesToReadable(emp.end_lateness_minutes || 0),
          formatted_total: this.formatMinutesToReadable((emp.start_lateness_minutes || 0) + (emp.break_lateness_minutes || 0) + (emp.end_lateness_minutes || 0))
        },
        severity: emp.start_lateness_minutes > 60 ? 'very_late' : 
                 emp.start_lateness_minutes > 0 ? 'late' : 'on_time'
      }));

      const response = {
        success: true,
        message: 'Late employees retrieved successfully',
        data: {
          date: targetDate,
          total_late_employees: totalRecords,
          page: pageNumber,
          limit: limitNumber,
          total_pages: totalPages,
          summary: {
            late: categorized.late.length,
            very_late: categorized.very_late.length,
            long_break: categorized.long_break.length,
            early_departure: categorized.early_departure.length,
            average_lateness_minutes: totalRecords > 0 ? 
              Math.round(lateEmployees.reduce((sum, emp) => sum + (emp.start_lateness_minutes || 0) + (emp.break_lateness_minutes || 0) + (emp.end_lateness_minutes || 0), 0) / totalRecords) : 0
          },
          employees: paginatedEmployees.map(emp => ({
            employee_id: emp.userid,
            employee_name: emp.name || 'Unknown',
            date: targetDate,
            shift: emp.shift || 'Unknown',
            scheduled_start_time: emp.scheduled_start_time,
            actual_start_time: emp.actual_start_time,
            attendance_status: emp.attendance_status,
            start_lateness_minutes: emp.start_lateness_minutes || 0,
            break_lateness_minutes: emp.break_lateness_minutes || 0,
            total_lateness_minutes: (emp.start_lateness_minutes || 0) + (emp.break_lateness_minutes || 0) + (emp.end_lateness_minutes || 0),
            lateness_category: (emp.start_lateness_minutes || 0) > 60 ? 'very_late' : 
                              (emp.start_lateness_minutes || 0) > 0 ? 'late' : 'on_time'
          }))
        },
        timestamp: new Date().toISOString()
      };

      res.status(200).json(response);
      
    } catch (error: any) {
      logger.error(`Failed to get late employees:`, {
        requestId,
        date: targetDate,
        error: error.message
      });
      throw error;
    }
  });
}

// Export controller instance
const latenessController = new LatenessController();

export const {
  calculateLatenessForDate,
  calculateLatenessForDateRange,
  calculateLatenessForMonth,
  getLatenessData,
  getLatenessStats,
  getLateEmployees
} = latenessController;
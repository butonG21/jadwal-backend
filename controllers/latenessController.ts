import { Request, Response } from 'express';
import { latenessService } from '../services/latenessService';
import { logger } from '../utils/loggers';
import { ApiResponse } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError, NotFoundError } from '../utils/errorTypes';
import { DateHelper } from '../utils/dateHelper';

class LatenessController {

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

      res.status(200).json(
        ApiResponse.success('Lateness calculated successfully', {
          calculation: latenessResult,
          saved: {
            id: savedResult._id,
            createdAt: savedResult.createdAt,
            updatedAt: savedResult.updatedAt
          }
        })
      );
      
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

      res.status(200).json(
        ApiResponse.success('Lateness calculated for date range', {
          dateRange: { startDate, endDate },
          results: latenessResults,
          statistics: stats,
          saved: saveToDb === 'true' ? savedResults : null
        })
      );
      
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

      res.status(200).json(
        ApiResponse.success('Monthly lateness calculated successfully', {
          period: { month: monthNum, year: yearNum },
          results: latenessResults,
          statistics: monthlyStats,
          saved: saveToDb === 'true' ? savedResults : null
        })
      );
      
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
    const { date, startDate, endDate } = req.query;
    const requestId = (req as any).requestId;

    if (!employeeId) {
      throw new AppError('Employee ID is required', 400);
    }

    logger.info(`Getting lateness data for employee ${employeeId}`, { requestId });

    try {
      const latenessData = await latenessService.getLatenessData(
        employeeId,
        date as string,
        startDate as string,
        endDate as string
      );

      res.status(200).json(
        ApiResponse.success('Lateness data retrieved successfully', {
          employeeId,
          filter: { date, startDate, endDate },
          data: latenessData,
          total: latenessData.length
        })
      );
      
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
    const { startDate, endDate } = req.query;
    const requestId = (req as any).requestId;

    logger.info(`Getting lateness statistics`, { requestId, employeeId });

    try {
      const stats = await latenessService.getLatenessStats(
        employeeId,
        startDate as string,
        endDate as string
      );

      res.status(200).json(
        ApiResponse.success('Lateness statistics retrieved successfully', {
          filter: { employeeId, startDate, endDate },
          statistics: stats
        })
      );
      
    } catch (error: any) {
      logger.error(`Failed to get lateness statistics:`, {
        requestId,
        employeeId,
        error: error.message
      });
      throw error;
    }
  });

  /**
   * Ambil karyawan yang terlambat pada tanggal tertentu
   */
  getLateEmployees = asyncHandler(async (req: Request, res: Response) => {
    const { date } = req.query;
    const requestId = (req as any).requestId;

    const targetDate = (date as string) || DateHelper.getCurrentDateIndonesia();
    
    // Validasi format tanggal
    if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
      throw new AppError('Date must be in YYYY-MM-DD format', 400);
    }

    logger.info(`Getting late employees for ${targetDate}`, { requestId });

    try {
      const Lateness = (await import('../models/Lateness')).default;
      const lateEmployees = await Lateness.findLateEmployees(targetDate);

      // Kelompokkan berdasarkan tingkat keterlambatan
      const categorized = {
        late: lateEmployees.filter(emp => 
          emp.start_lateness_minutes > 0 && emp.start_lateness_minutes <= 60
        ),
        veryLate: lateEmployees.filter(emp => 
          emp.start_lateness_minutes > 60
        ),
        longBreak: lateEmployees.filter(emp => 
          emp.break_lateness_minutes > 0
        ),
        earlyDeparture: lateEmployees.filter(emp => 
          emp.end_lateness_minutes < -30
        )
      };

      const summary = {
        date: targetDate,
        totalLateEmployees: lateEmployees.length,
        lateCount: categorized.late.length,
        veryLateCount: categorized.veryLate.length,
        longBreakCount: categorized.longBreak.length,
        earlyDepartureCount: categorized.earlyDeparture.length
      };

      res.status(200).json(
        ApiResponse.success('Late employees retrieved successfully', {
          summary,
          categorized,
          allLateEmployees: lateEmployees
        })
      );
      
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
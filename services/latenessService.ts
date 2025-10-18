import Lateness, { ILateness } from '../models/Lateness';
import Schedule from '../models/schedule';
import Attendance from '../models/Attendance';
import { logger } from '../utils/loggers';
import { AppError } from '../utils/errorTypes';
import { 
  SHIFT_SCHEDULES, 
  SCHEDULE_TYPES, 
  SHIFT_NUMBER_MAPPING
} from '../config/constants';

interface LatenessData {
  userid: string;
  name?: string;
  date: string;
  shift: string;
  scheduled_start_time: string;
  scheduled_end_time: string;
  actual_start_time?: string;
  actual_end_time?: string;
  actual_break_out_time?: string;
  actual_break_in_time?: string;
  start_lateness_minutes: number;
  end_lateness_minutes: number;
  break_lateness_minutes: number;
  attendance_status: 'on_time' | 'late' | 'very_late' | 'absent' | 'off_day' | 'early_departure' | 'incomplete_attendance';
  break_status: 'normal' | 'long_break' | 'no_break';
  total_working_minutes: number;
  is_complete_attendance: boolean;
}

export class LatenessService {
  /**
   * Simpan hasil perhitungan ke database dengan validasi yang lebih baik
   */
  async saveLatenessData(latenessData: LatenessData): Promise<ILateness> {
    try {
      // Validasi data input
      if (!latenessData) {
        throw new AppError('Lateness data is required', 400);
      }

      if (!latenessData.userid || !latenessData.date) {
        throw new AppError('User ID and date are required', 400);
      }

      // Validasi format tanggal
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(latenessData.date)) {
        throw new AppError('Date must be in YYYY-MM-DD format', 400);
      }

      logger.info(`Attempting to save lateness data for user ${latenessData.userid} on ${latenessData.date}`);

      const existingRecord = await Lateness.findByUserAndDate(latenessData.userid, latenessData.date);
      
      if (existingRecord) {
        // Update existing record
        try {
          Object.assign(existingRecord, latenessData);
          const savedRecord = await existingRecord.save();
          logger.info(`Successfully updated lateness record for user ${latenessData.userid} on ${latenessData.date}`);
          return savedRecord;
        } catch (updateError: any) {
          logger.error(`Failed to update existing lateness record:`, {
            userid: latenessData.userid,
            date: latenessData.date,
            error: updateError.message,
            stack: updateError.stack
          });
          throw new AppError(`Failed to update lateness record: ${updateError.message}`, 500);
        }
      } else {
        // Create new record
        try {
          const newRecord = new Lateness(latenessData);
          const savedRecord = await newRecord.save();
          logger.info(`Successfully created lateness record for user ${latenessData.userid} on ${latenessData.date}`);
          return savedRecord;
        } catch (createError: any) {
          logger.error(`Failed to create new lateness record:`, {
            userid: latenessData.userid,
            date: latenessData.date,
            error: createError.message,
            stack: createError.stack,
            data: latenessData
          });
          throw new AppError(`Failed to create lateness record: ${createError.message}`, 500);
        }
      }
    } catch (error: any) {
      logger.error(`Failed to save lateness data:`, {
        userid: latenessData?.userid || 'unknown',
        date: latenessData?.date || 'unknown',
        error: error.message,
        stack: error.stack
      });
      
      // Re-throw AppError as is, wrap other errors
      if (error instanceof AppError) {
        throw error;
      } else {
        throw new AppError(`Database error while saving lateness data: ${error.message}`, 500);
      }
    }
  }

  /**
   * Hitung keterlambatan untuk satu karyawan pada tanggal tertentu
   */
  async calculateLatenessForUser(userid: string, date: string): Promise<LatenessData | null> {
    try {
      logger.info(`Calculating lateness for user ${userid} on ${date}`);

      // 1. Ambil jadwal karyawan
      const schedule = await Schedule.findByEmployeeId(userid);
      if (!schedule) {
        throw new AppError(`Schedule not found for employee ${userid}`, 404);
      }

      // 2. Cari jadwal untuk tanggal tertentu
      const daySchedule = schedule.schedule.find((s: any) => s.date === date);
      if (!daySchedule) {
        logger.warn(`No schedule found for user ${userid} on ${date}`);
        return null;
      }

      // 3. Cek apakah hari libur (OFF/CT)
      if (daySchedule.shift === SCHEDULE_TYPES.OFF || daySchedule.shift === SCHEDULE_TYPES.CT) {
        return this.createOffDayResult(userid, schedule.name, date, daySchedule.shift);
      }

      // 4. Ambil konfigurasi shift
      let shiftConfig = SHIFT_SCHEDULES[daySchedule.shift];
      let shiftDisplayName = daySchedule.shift;

      if (!shiftConfig) {
        const mappedShiftName = SHIFT_NUMBER_MAPPING[daySchedule.shift];
        if (mappedShiftName) {
          shiftConfig = SHIFT_SCHEDULES[mappedShiftName];
          shiftDisplayName = mappedShiftName;
        }
      } else {
        shiftDisplayName = shiftConfig.category || daySchedule.shift;
      }

      if (!shiftConfig) {
        throw new AppError(`Invalid shift type: ${daySchedule.shift}`, 400);
      }

      // 5. Ambil data kehadiran
      const attendance = await Attendance.findByUserAndDate(userid, date);

      // 6. Hitung keterlambatan
      const result = this.calculateLateness(
        userid,
        schedule.name,
        date,
        shiftDisplayName,
        shiftConfig,
        attendance
      );

      return result;
    } catch (error: any) {
      logger.error(`Failed to calculate lateness for user ${userid}:`, {
        userid,
        date,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Hitung keterlambatan untuk date range
   */
  async calculateLatenessForDateRange(userid: string, startDate: string, endDate: string): Promise<LatenessData[]> {
    try {
      logger.info(`Calculating lateness for user ${userid} from ${startDate} to ${endDate}`);
      
      const results: LatenessData[] = [];
      const currentDate = new Date(startDate);
      const endDateObj = new Date(endDate);

      while (currentDate <= endDateObj) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const result = await this.calculateLatenessForUser(userid, dateStr);
        
        if (result) {
          results.push(result);
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
      }

      return results;
    } catch (error: any) {
      logger.error(`Failed to calculate lateness for date range:`, {
        userid,
        startDate,
        endDate,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Hitung keterlambatan untuk satu bulan
   */
  async calculateLatenessForMonth(userid: string, month: number, year: number): Promise<LatenessData[]> {
    try {
      const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
      const endDate = `${year}-${month.toString().padStart(2, '0')}-31`;
      
      return await this.calculateLatenessForDateRange(userid, startDate, endDate);
    } catch (error: any) {
      logger.error(`Failed to calculate lateness for month:`, {
        userid,
        month,
        year,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Ambil data keterlambatan dari database
   */
  async getLatenessData(userid: string, date?: string, startDate?: string, endDate?: string): Promise<ILateness[]> {
    try {
      let query: any = { userid };

      if (date) {
        query.date = date;
        const result = await Lateness.findByUserAndDate(userid, date);
        return result ? [result] : [];
      } else if (startDate && endDate) {
        const results = await Lateness.findByUserAndDateRange(userid, startDate, endDate);
        return results;
      } else {
        const results = await Lateness.find(query).sort({ date: -1 }).limit(100);
        return results;
      }
    } catch (error: any) {
      logger.error(`Failed to get lateness data:`, {
        userid,
        date,
        startDate,
        endDate,
        error: error.message
      });
      throw new AppError('Failed to retrieve lateness data', 500);
    }
  }

  /**
   * Ambil statistik keterlambatan
   */
  async getLatenessStats(userid?: string, startDate?: string, endDate?: string, groupBy?: string): Promise<any> {
    try {
      // Get lateness data from database
      const latenessData = await this.getLatenessData(userid || '', undefined, startDate, endDate);
      
      if (!latenessData || latenessData.length === 0) {
        return {
          employee: null,
          totalRecords: 0,
          onTimeCount: 0,
          lateCount: 0,
          veryLateCount: 0,
          absentCount: 0,
          offDayCount: 0,
          attendanceRate: 0,
          punctualityRate: 0,
          totalLatenessMinutes: 0,
          averageLatenessPerDay: 0,
          maxLatenessMinutes: 0,
          minLatenessMinutes: 0,
          averageWorkingHours: 0,
          trends: []
        };
      }

      // Get employee information from first record
      const employee = {
        id: userid,
        name: latenessData[0].name || 'Unknown'
      };

      // Calculate statistics
      const workingDays = latenessData.filter(r => r.attendance_status !== 'off_day');
      const presentDays = workingDays.filter(r => r.attendance_status !== 'absent');
      
      const onTimeCount = latenessData.filter(r => r.attendance_status === 'on_time').length;
      const lateCount = latenessData.filter(r => r.attendance_status === 'late').length;
      const veryLateCount = latenessData.filter(r => r.attendance_status === 'very_late').length;
      const absentCount = latenessData.filter(r => r.attendance_status === 'absent').length;
      const offDayCount = latenessData.filter(r => r.attendance_status === 'off_day').length;

      // Calculate lateness minutes
      const totalStartLateness = latenessData.reduce((sum, r) => sum + Math.max(0, r.start_lateness_minutes), 0);
      const totalBreakLateness = latenessData.reduce((sum, r) => sum + Math.max(0, r.break_lateness_minutes), 0);
      const totalLatenessMinutes = totalStartLateness + totalBreakLateness;
      
      // Calculate rates
      const attendanceRate = workingDays.length > 0 ? Math.round((presentDays.length / workingDays.length) * 100) : 0;
      const punctualityRate = presentDays.length > 0 ? Math.round((onTimeCount / presentDays.length) * 100) : 0;
      
      // Calculate average working hours
      const totalWorkingMinutes = latenessData.reduce((sum, r) => sum + r.total_working_minutes, 0);
      const averageWorkingHours = presentDays.length > 0 ? Math.round((totalWorkingMinutes / presentDays.length / 60) * 100) / 100 : 0;
      
      // Calculate lateness statistics
      const lateRecords = latenessData.filter(r => r.start_lateness_minutes > 0 || r.break_lateness_minutes > 0);
      const latenessMinutes = lateRecords.map(r => r.start_lateness_minutes + r.break_lateness_minutes);
      const maxLatenessMinutes = latenessMinutes.length > 0 ? Math.max(...latenessMinutes) : 0;
      const minLatenessMinutes = latenessMinutes.length > 0 ? Math.min(...latenessMinutes.filter(m => m > 0)) : 0;
      const averageLatenessPerDay = lateRecords.length > 0 ? Math.round(totalLatenessMinutes / lateRecords.length) : 0;

      // Generate trends based on groupBy parameter
      let trends: any[] = [];
      if (groupBy === 'week' && startDate && endDate) {
        trends = this.generateWeeklyTrends(latenessData, startDate, endDate);
      } else if (groupBy === 'month' && startDate && endDate) {
        trends = this.generateMonthlyTrends(latenessData, startDate, endDate);
      }

      return {
        employee,
        totalRecords: latenessData.length,
        totalEmployees: userid ? 1 : new Set(latenessData.map(r => r.userid)).size,
        onTimeCount,
        lateCount,
        veryLateCount,
        absentCount,
        offDayCount,
        attendanceRate,
        punctualityRate,
        totalLatenessMinutes,
        averageLatenessPerDay,
        maxLatenessMinutes,
        minLatenessMinutes,
        averageWorkingHours,
        workingDays: workingDays.length,
        trends
      };
    } catch (error: any) {
      logger.error(`Failed to get lateness statistics:`, {
        userid,
        startDate,
        endDate,
        error: error.message
      });
      throw new AppError('Failed to retrieve lateness statistics', 500);
    }
  }

  private generateWeeklyTrends(latenessData: any[], startDate: string, endDate: string): any[] {
    const trends: any[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Group data by week
    const weeklyData = new Map();
    
    latenessData.forEach(record => {
      const recordDate = new Date(record.date);
      const weekStart = new Date(recordDate);
      weekStart.setDate(recordDate.getDate() - recordDate.getDay()); // Start of week (Sunday)
      const weekKey = weekStart.toISOString().split('T')[0];
      
      if (!weeklyData.has(weekKey)) {
        weeklyData.set(weekKey, []);
      }
      weeklyData.get(weekKey).push(record);
    });
    
    // Calculate statistics for each week
    weeklyData.forEach((records, weekStart) => {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      
      const onTime = records.filter((r: any) => r.attendance_status === 'on_time').length;
      const late = records.filter((r: any) => r.attendance_status === 'late').length;
      const veryLate = records.filter((r: any) => r.attendance_status === 'very_late').length;
      const absent = records.filter((r: any) => r.attendance_status === 'absent').length;
      const workingDays = records.filter((r: any) => r.attendance_status !== 'off_day').length;
      const presentDays = workingDays - absent;
      
      trends.push({
        period: `${weekStart} to ${weekEnd.toISOString().split('T')[0]}`,
        week_start: weekStart,
        week_end: weekEnd.toISOString().split('T')[0],
        total_days: records.length,
        working_days: workingDays,
        on_time: onTime,
        late: late,
        very_late: veryLate,
        absent: absent,
        attendance_rate: workingDays > 0 ? Math.round((presentDays / workingDays) * 100) : 0,
        punctuality_rate: presentDays > 0 ? Math.round((onTime / presentDays) * 100) : 0
      });
    });
    
    return trends.sort((a, b) => a.week_start.localeCompare(b.week_start));
  }

  private generateMonthlyTrends(latenessData: any[], startDate: string, endDate: string): any[] {
    const trends: any[] = [];
    
    // Group data by month
    const monthlyData = new Map();
    
    latenessData.forEach(record => {
      const recordDate = new Date(record.date);
      const monthKey = `${recordDate.getFullYear()}-${String(recordDate.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, []);
      }
      monthlyData.get(monthKey).push(record);
    });
    
    // Calculate statistics for each month
    monthlyData.forEach((records, monthKey) => {
      const [year, month] = monthKey.split('-');
      const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleString('id-ID', { month: 'long' });
      
      const onTime = records.filter((r: any) => r.attendance_status === 'on_time').length;
      const late = records.filter((r: any) => r.attendance_status === 'late').length;
      const veryLate = records.filter((r: any) => r.attendance_status === 'very_late').length;
      const absent = records.filter((r: any) => r.attendance_status === 'absent').length;
      const workingDays = records.filter((r: any) => r.attendance_status !== 'off_day').length;
      const presentDays = workingDays - absent;
      
      trends.push({
        period: `${monthName} ${year}`,
        month: parseInt(month),
        year: parseInt(year),
        month_name: monthName,
        total_days: records.length,
        working_days: workingDays,
        on_time: onTime,
        late: late,
        very_late: veryLate,
        absent: absent,
        attendance_rate: workingDays > 0 ? Math.round((presentDays / workingDays) * 100) : 0,
        punctuality_rate: presentDays > 0 ? Math.round((onTime / presentDays) * 100) : 0
      });
    });
    
    return trends.sort((a, b) => a.year - b.year || a.month - b.month);
  }

  // Helper methods (implementasi lengkap akan ditambahkan sesuai kebutuhan)
  private createOffDayResult(userid: string, name: string, date: string, shift: string): LatenessData {
    return {
      userid,
      name,
      date,
      shift,
      scheduled_start_time: '00:00:00',
      scheduled_end_time: '00:00:00',
      start_lateness_minutes: 0,
      end_lateness_minutes: 0,
      break_lateness_minutes: 0,
      attendance_status: 'off_day',
      break_status: 'no_break',
      total_working_minutes: 0,
      is_complete_attendance: true
    };
  }

  private calculateLateness(
    userid: string,
    name: string,
    date: string,
    shift: string,
    shiftConfig: any,
    attendance: any
  ): LatenessData {
    // Pastikan format waktu HH:mm:ss
    const formatTime = (time: string): string => {
      if (!time) return '00:00:00';
      if (time.length === 5) return `${time}:00`; // HH:mm -> HH:mm:ss
      return time;
    };

    // Helper function untuk cek apakah waktu adalah 00:00:00 (dianggap tidak ada data)
    const isZeroTime = (time: string): boolean => {
      if (!time) return true;
      const formatted = formatTime(time);
      return formatted === '00:00:00';
    };

    // Helper function untuk menghitung selisih waktu dalam menit
    const calculateTimeDifference = (actualTime: string, scheduledTime: string): number => {
      if (!actualTime || !scheduledTime || isZeroTime(actualTime)) return 0;
      
      const actual = new Date(`1970-01-01T${formatTime(actualTime)}`);
      const scheduled = new Date(`1970-01-01T${formatTime(scheduledTime)}`);
      
      return Math.floor((actual.getTime() - scheduled.getTime()) / (1000 * 60));
    };

    // Inisialisasi data dasar
    const result: LatenessData = {
      userid,
      name,
      date,
      shift,
      scheduled_start_time: formatTime(shiftConfig.start_time),
      scheduled_end_time: formatTime(shiftConfig.end_time),
      actual_start_time: attendance?.start_time ? formatTime(attendance.start_time) : undefined,
      actual_end_time: attendance?.end_time ? formatTime(attendance.end_time) : undefined,
      actual_break_out_time: attendance?.break_out_time ? formatTime(attendance.break_out_time) : undefined,
      actual_break_in_time: attendance?.break_in_time ? formatTime(attendance.break_in_time) : undefined,
      start_lateness_minutes: 0,
      end_lateness_minutes: 0,
      break_lateness_minutes: 0,
      attendance_status: 'absent',
      break_status: 'no_break',
      total_working_minutes: 0,
      is_complete_attendance: false
    };

    // Jika tidak ada data attendance, return sebagai absent
    if (!attendance) {
      return result;
    }

    // Cek apakah start_time atau end_time adalah 00:00:00 (dianggap absent)
    const hasValidStartTime = attendance.start_time && !isZeroTime(attendance.start_time);
    const hasValidEndTime = attendance.end_time && !isZeroTime(attendance.end_time);

    // Jika start_time dan end_time keduanya 00:00:00 atau tidak ada, dianggap absent
    if (!hasValidStartTime && !hasValidEndTime) {
      return result; // status tetap 'absent'
    }

    // Hitung keterlambatan masuk
    if (hasValidStartTime) {
      result.start_lateness_minutes = calculateTimeDifference(
        attendance.start_time,
        shiftConfig.start_time
      );
      
      // Pastikan tidak negatif (jika datang lebih awal)
      if (result.start_lateness_minutes < 0) {
        result.start_lateness_minutes = 0;
      }
    }

    // Hitung keterlambatan pulang (negatif jika pulang lebih awal)
    if (hasValidEndTime) {
      result.end_lateness_minutes = calculateTimeDifference(
        attendance.end_time,
        shiftConfig.end_time
      );
    }

    // Hitung keterlambatan istirahat
    if (attendance.break_out_time && attendance.break_in_time && 
        !isZeroTime(attendance.break_out_time) && !isZeroTime(attendance.break_in_time)) {
      const breakOutTime = new Date(`1970-01-01T${formatTime(attendance.break_out_time)}`);
      const breakInTime = new Date(`1970-01-01T${formatTime(attendance.break_in_time)}`);
      const actualBreakDuration = Math.floor((breakInTime.getTime() - breakOutTime.getTime()) / (1000 * 60));
      const scheduledBreakDuration = shiftConfig.break_duration_minutes || 60;
      
      result.break_lateness_minutes = Math.max(0, actualBreakDuration - scheduledBreakDuration);
      
      // Tentukan break status
      if (actualBreakDuration > scheduledBreakDuration + 15) {
        result.break_status = 'long_break';
      } else {
        result.break_status = 'normal';
      }
    } else if (hasValidStartTime && hasValidEndTime) {
      // Jika ada start dan end time tapi tidak ada break data, set sebagai no_break
      result.break_status = 'no_break';
    }

    // Hitung total jam kerja aktual
    if (hasValidStartTime && hasValidEndTime) {
      const startTime = new Date(`1970-01-01T${formatTime(attendance.start_time)}`);
      const endTime = new Date(`1970-01-01T${formatTime(attendance.end_time)}`);
      let workingMinutes = Math.floor((endTime.getTime() - startTime.getTime()) / (1000 * 60));
      
      // Kurangi waktu istirahat jika ada
      if (attendance.break_out_time && attendance.break_in_time && 
          !isZeroTime(attendance.break_out_time) && !isZeroTime(attendance.break_in_time)) {
        const breakOutTime = new Date(`1970-01-01T${formatTime(attendance.break_out_time)}`);
        const breakInTime = new Date(`1970-01-01T${formatTime(attendance.break_in_time)}`);
        const breakDuration = Math.floor((breakInTime.getTime() - breakOutTime.getTime()) / (1000 * 60));
        workingMinutes -= breakDuration;
      }
      
      result.total_working_minutes = Math.max(0, workingMinutes);
    }

    // Tentukan attendance status berdasarkan keterlambatan
    if (hasValidStartTime || hasValidEndTime) {
      // Cek apakah data attendance tidak lengkap
      if (hasValidStartTime && !hasValidEndTime) {
        result.attendance_status = 'incomplete_attendance';
      } else if (!hasValidStartTime && hasValidEndTime) {
        result.attendance_status = 'incomplete_attendance';
      } else if (hasValidStartTime && hasValidEndTime) {
        // Data lengkap, tentukan status berdasarkan keterlambatan
        if (result.start_lateness_minutes === 0) {
          result.attendance_status = 'on_time';
        } else if (result.start_lateness_minutes <= 15) {
          result.attendance_status = 'late';
        } else {
          result.attendance_status = 'very_late';
        }
        
        // Jika pulang lebih awal dari jadwal (early departure)
        if (result.end_lateness_minutes < -30) {
          result.attendance_status = 'early_departure';
        }
      }
    }

    // Tentukan apakah data kehadiran lengkap
    result.is_complete_attendance = !!(hasValidStartTime && hasValidEndTime);

    return result;
  }
}

export const latenessService = new LatenessService();
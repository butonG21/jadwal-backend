import Lateness, { ILateness, ILatenessMethods } from '../models/Lateness';
import Schedule, { ISchedule } from '../models/schedule';
import Attendance, { IAttendance } from '../models/Attendance';
import { logger } from '../utils/loggers';
import { AppError } from '../utils/errorTypes';
import { DateHelper } from '../utils/dateHelper';
import { SHIFT_SCHEDULES, LATENESS_STATUS, SCHEDULE_TYPES, SHIFT_NUMBER_MAPPING } from '../config/constants';
import { Document } from 'mongoose';

interface LatenessCalculationResult {
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
  attendance_status: string;
  break_status: string;
  total_working_minutes: number;
  is_complete_attendance: boolean;
  start_lateness_display?: string;
  end_lateness_display?: string;
  break_lateness_display?: string;
}

interface LatenessStats {
  totalRecords: number;
  onTimeCount: number;
  lateCount: number;
  veryLateCount: number;
  absentCount: number;
  averageStartLateness: number;
  averageBreakLateness: number;
  averageWorkingHours: number;
  longBreakCount: number;
}

export class LatenessService {
  
  /**
   * Hitung keterlambatan untuk satu karyawan pada tanggal tertentu
   */
  async calculateLatenessForUser(userid: string, date: string): Promise<LatenessCalculationResult | null> {
    try {
      logger.info(`Calculating lateness for user ${userid} on ${date}`);
      
      // 1. Ambil jadwal karyawan
      const schedule = await Schedule.findByEmployeeId(userid);
      if (!schedule) {
        throw new AppError(`Schedule not found for employee ${userid}`, 404);
      }

      // 2. Cari jadwal untuk tanggal tertentu
      const daySchedule = schedule.schedule.find(s => s.date === date);
      if (!daySchedule) {
        logger.warn(`No schedule found for user ${userid} on ${date}`);
        return null;
      }

      // 3. Cek apakah hari libur (OFF/CT)
      if (daySchedule.shift === SCHEDULE_TYPES.OFF || daySchedule.shift === SCHEDULE_TYPES.CT) {
        return this.createOffDayResult(userid, schedule.name, date, daySchedule.shift);
      }

      // 4. Ambil konfigurasi shift
      // Gunakan shift angka langsung, fallback ke mapping jika tidak ada
      let shiftConfig = SHIFT_SCHEDULES[daySchedule.shift as keyof typeof SHIFT_SCHEDULES];
      let shiftDisplayName = daySchedule.shift;
      
      if (!shiftConfig) {
        // Fallback: gunakan mapping ke nama shift jika shift angka tidak ditemukan
        const mappedShiftName = SHIFT_NUMBER_MAPPING[daySchedule.shift as keyof typeof SHIFT_NUMBER_MAPPING];
        if (mappedShiftName) {
          shiftConfig = SHIFT_SCHEDULES[mappedShiftName as keyof typeof SHIFT_SCHEDULES];
          shiftDisplayName = mappedShiftName;
        }
      } else {
        // Jika shift angka ditemukan, gunakan category sebagai display name
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
        shiftDisplayName, // Gunakan shiftDisplayName untuk tampilan
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
   * Hitung keterlambatan untuk multiple users dalam date range
   */
  async calculateLatenessForDateRange(
    userid: string, 
    startDate: string, 
    endDate: string
  ): Promise<LatenessCalculationResult[]> {
    try {
      logger.info(`Calculating lateness for user ${userid} from ${startDate} to ${endDate}`);
      
      const results: LatenessCalculationResult[] = [];
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
  async calculateLatenessForMonth(
    userid: string, 
    month: number, 
    year: number
  ): Promise<LatenessCalculationResult[]> {
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
   * Simpan hasil perhitungan ke database
   */
  async saveLatenessData(latenessData: LatenessCalculationResult): Promise<ILateness & ILatenessMethods & Document> {
    try {
      const existingRecord = await Lateness.findByUserAndDate(latenessData.userid, latenessData.date);
      
      if (existingRecord) {
        // Update existing record
        Object.assign(existingRecord, latenessData);
        const savedRecord = await existingRecord.save();
        logger.info(`Updated lateness record for user ${latenessData.userid} on ${latenessData.date}`);
        return savedRecord as unknown as (ILateness & ILatenessMethods & Document);
      } else {
        // Create new record
        const newRecord = new Lateness(latenessData);
        const savedRecord = await newRecord.save();
        logger.info(`Created lateness record for user ${latenessData.userid} on ${latenessData.date}`);
        return savedRecord as unknown as (ILateness & ILatenessMethods & Document);
      }
      
    } catch (error: any) {
      logger.error(`Failed to save lateness data:`, {
        userid: latenessData.userid,
        date: latenessData.date,
        error: error.message
      });
      throw new AppError('Failed to save lateness data', 500);
    }
  }

  /**
   * Ambil data keterlambatan dari database
   */
  async getLatenessData(
    userid: string, 
    date?: string, 
    startDate?: string, 
    endDate?: string
  ): Promise<(ILateness & ILatenessMethods & Document)[]> {
    try {
      let query: any = { userid };
      
      if (date) {
        query.date = date;
        const result = await Lateness.findByUserAndDate(userid, date);
        return result ? [result as unknown as (ILateness & ILatenessMethods & Document)] : [];
      } else if (startDate && endDate) {
        const results = await Lateness.findByUserAndDateRange(userid, startDate, endDate);
        return results as unknown as (ILateness & ILatenessMethods & Document)[];
      } else {
        const results = await Lateness.find(query).sort({ date: -1 }).limit(100);
        return results as unknown as (ILateness & ILatenessMethods & Document)[];
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
  async getLatenessStats(
    userid?: string, 
    startDate?: string, 
    endDate?: string
  ): Promise<LatenessStats> {
    try {
      const result = await Lateness.getLatenessStats(userid, startDate, endDate);
      return result[0] || {
        totalRecords: 0,
        onTimeCount: 0,
        lateCount: 0,
        veryLateCount: 0,
        absentCount: 0,
        averageStartLateness: 0,
        averageBreakLateness: 0,
        averageWorkingHours: 0,
        longBreakCount: 0
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

  /**
   * Core logic untuk menghitung keterlambatan
   */
  private calculateLateness(
    userid: string,
    name: string,
    date: string,
    shift: string,
    shiftConfig: any,
    attendance: IAttendance | null
  ): LatenessCalculationResult {
    
    const result: LatenessCalculationResult = {
      userid,
      name,
      date,
      shift,
      scheduled_start_time: shiftConfig.start_time,
      scheduled_end_time: shiftConfig.end_time,
      start_lateness_minutes: 0,
      end_lateness_minutes: 0,
      break_lateness_minutes: 0,
      attendance_status: LATENESS_STATUS.ABSENT,
      break_status: 'no_break',
      total_working_minutes: 0,
      is_complete_attendance: false
    };

    // Jika tidak ada data kehadiran
    if (!attendance || !attendance.start_time) {
      return result;
    }

    // Cek apakah semua waktu adalah 00:00:00 (dianggap absent)
    const isAllTimeEmpty = (
      attendance.start_time === '00:00:00' &&
      attendance.end_time === '00:00:00' &&
      attendance.break_out_time === '00:00:00' &&
      attendance.break_in_time === '00:00:00'
    );

    if (isAllTimeEmpty) {
      result.actual_start_time = attendance.start_time;
      result.actual_end_time = attendance.end_time;
      result.actual_break_out_time = attendance.break_out_time;
      result.actual_break_in_time = attendance.break_in_time;
      result.attendance_status = LATENESS_STATUS.ABSENT;
      return result;
    }

    result.actual_start_time = attendance.start_time;
    result.actual_end_time = attendance.end_time;
    result.actual_break_out_time = attendance.break_out_time;
    result.actual_break_in_time = attendance.break_in_time;

    // Hitung keterlambatan masuk (positif jika terlambat, negatif jika lebih awal)
    const rawStartLateness = this.calculateTimeDifferenceInMinutes(
      attendance.start_time,
      shiftConfig.start_time
    );
    // Terapkan toleransi 1 menit untuk keterlambatan masuk
    result.start_lateness_minutes = rawStartLateness <= 1 ? 0 : rawStartLateness;
    result.start_lateness_display = this.formatMinutesToReadable(result.start_lateness_minutes);

    // Hitung keterlambatan pulang (positif jika pulang terlambat, negatif jika pulang lebih awal)
    if (attendance.end_time) {
      const rawEndLateness = this.calculateTimeDifferenceInMinutes(
        attendance.end_time,
        shiftConfig.end_time
      );
      // Terapkan toleransi 1 menit untuk keterlambatan pulang
      result.end_lateness_minutes = rawEndLateness <= 1 && rawEndLateness >= -1 ? 0 : rawEndLateness;
      result.end_lateness_display = this.formatMinutesToReadable(result.end_lateness_minutes);
      result.is_complete_attendance = true;
    } else {
      result.end_lateness_display = '0 menit';
    }

    // Hitung keterlambatan break
    if (attendance.break_out_time && attendance.break_in_time) {
      const breakDurationMinutes = Math.abs(this.calculateTimeDifferenceInMinutes(
        attendance.break_out_time,
        attendance.break_in_time
      ));
      
      const allowedBreakMinutes = shiftConfig.break_duration_minutes;
      result.break_lateness_minutes = Math.max(0, breakDurationMinutes - allowedBreakMinutes);
      
      if (breakDurationMinutes > allowedBreakMinutes) {
        result.break_status = 'long_break';
      } else {
        result.break_status = 'normal';
      }
      result.break_lateness_display = this.formatMinutesToReadable(result.break_lateness_minutes);
    } else {
      result.break_lateness_display = '0 menit';
    }

    // Hitung total jam kerja berdasarkan jadwal shift (start_time + end_time)
    if (attendance.start_time && attendance.end_time && 
        attendance.start_time !== '00:00:00' && attendance.end_time !== '00:00:00') {
      // Hitung total waktu kerja berdasarkan jadwal shift
      let totalMinutes = this.calculateTimeDifferenceInMinutes(
        shiftConfig.start_time,
        shiftConfig.end_time
      );
      
      // Kurangi waktu break yang diizinkan
      if (shiftConfig.break_duration_minutes) {
        totalMinutes -= shiftConfig.break_duration_minutes;
      }
      
      result.total_working_minutes = Math.max(0, Math.abs(totalMinutes));
    }

    // Tentukan status kehadiran
    result.attendance_status = this.determineAttendanceStatus(
      result.start_lateness_minutes,
      result.end_lateness_minutes,
      result.is_complete_attendance
    );

    return result;
  }

  /**
   * Buat result untuk hari libur
   */
  private createOffDayResult(
    userid: string,
    name: string,
    date: string,
    shift: string
  ): LatenessCalculationResult {
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
      attendance_status: LATENESS_STATUS.OFF_DAY,
      break_status: 'no_break',
      total_working_minutes: 0,
      is_complete_attendance: false
    };
  }

  /**
   * Hitung selisih waktu dalam menit
   * Untuk keterlambatan: actualTime - scheduledTime
   * Positif = terlambat, Negatif = lebih awal
   */
  private calculateTimeDifferenceInMinutes(actualTime: string, scheduledTime: string): number {
    const actual = this.timeToMinutes(actualTime);
    const scheduled = this.timeToMinutes(scheduledTime);
    
    // Handle cross-midnight shifts
    if (actual < scheduled && (scheduled - actual) > 12 * 60) {
      // Jika selisih lebih dari 12 jam, kemungkinan cross-midnight
      return (24 * 60 + actual) - scheduled;
    }
    
    return actual - scheduled;
  }

  /**
   * Convert time string (HH:mm:ss) to minutes
   */
  private timeToMinutes(timeStr: string): number {
    const [hours, minutes, seconds] = timeStr.split(':').map(Number);
    return hours * 60 + minutes + (seconds || 0) / 60;
  }

  /**
   * Format menit menjadi tampilan yang lebih sederhana
   * Contoh: 3.5 -> "4 menit", 65.2 -> "1 jam 5 menit"
   */
  private formatMinutesToReadable(minutes: number): string {
    const absMinutes = Math.abs(minutes);
    const roundedMinutes = Math.round(absMinutes);
    
    if (roundedMinutes === 0) {
      return "0 menit";
    }
    
    if (roundedMinutes < 60) {
      return `${roundedMinutes} menit`;
    }
    
    const hours = Math.floor(roundedMinutes / 60);
    const remainingMinutes = roundedMinutes % 60;
    
    if (remainingMinutes === 0) {
      return `${hours} jam`;
    }
    
    return `${hours} jam ${remainingMinutes} menit`;
  }

  /**
   * Tentukan status kehadiran berdasarkan keterlambatan
   */
  private determineAttendanceStatus(
    startLatenessMinutes: number,
    endLatenessMinutes: number,
    isCompleteAttendance: boolean
  ): string {
    
    // Jika pulang lebih awal dari jadwal (early departure)
    if (endLatenessMinutes < -30) { // lebih dari 30 menit lebih awal
      return LATENESS_STATUS.EARLY_DEPARTURE;
    }
    
    // Jika terlambat masuk
    if (startLatenessMinutes > 60) { // lebih dari 1 jam
      return LATENESS_STATUS.VERY_LATE;
    } else if (startLatenessMinutes > 0) {
      return LATENESS_STATUS.LATE;
    }
    
    // Jika tepat waktu
    return LATENESS_STATUS.ON_TIME;
  }
}

export const latenessService = new LatenessService();
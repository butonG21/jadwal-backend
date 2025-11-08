import { Router } from 'express';
import {
  calculateLatenessForDate,
  calculateLatenessForDateRange,
  calculateLatenessForMonth,
  getLatenessData,
  getLatenessStats,
  getLateEmployees
} from '../controllers/latenessController';
import { verifyToken } from '../middlewares/verifyToken';
import { DateHelper } from '../utils/dateHelper';

const router = Router();

// Apply authentication middleware
router.use(verifyToken);

/**
 * @route POST /api/lateness/calculate/date/:employeeId
 * @desc Hitung keterlambatan untuk satu karyawan pada tanggal tertentu
 * @access Private
 * @param {string} employeeId - ID karyawan
 * @query {string} date - Tanggal dalam format YYYY-MM-DD (optional, default: hari ini)
 * @example POST /api/lateness/calculate/date/EMP001?date=2024-01-15
 */
router.post('/calculate/date/:employeeId', calculateLatenessForDate);

/**
 * @route POST /api/lateness/calculate/range/:employeeId
 * @desc Hitung keterlambatan untuk karyawan dalam rentang tanggal
 * @access Private
 * @param {string} employeeId - ID karyawan
 * @query {string} startDate - Tanggal mulai (YYYY-MM-DD)
 * @query {string} endDate - Tanggal akhir (YYYY-MM-DD)
 * @query {string} saveToDb - Simpan ke database (true/false, default: false)
 * @example POST /api/lateness/calculate/range/EMP001?startDate=2024-01-01&endDate=2024-01-31&saveToDb=true
 */
router.post('/calculate/range/:employeeId', calculateLatenessForDateRange);

/**
 * @route POST /api/lateness/calculate/month/:employeeId
 * @desc Hitung keterlambatan untuk karyawan dalam satu bulan
 * @access Private
 * @param {string} employeeId - ID karyawan
 * @query {number} month - Bulan (1-12)
 * @query {number} year - Tahun (2020-2030)
 * @query {string} saveToDb - Simpan ke database (true/false, default: false)
 * @example POST /api/lateness/calculate/month/EMP001?month=1&year=2024&saveToDb=true
 */
router.post('/calculate/month/:employeeId', calculateLatenessForMonth);

/**
 * @route GET /api/lateness/data/:employeeId
 * @desc Ambil data keterlambatan yang sudah tersimpan
 * @access Private
 * @param {string} employeeId - ID karyawan
 * @query {string} date - Tanggal tertentu (YYYY-MM-DD, optional)
 * @query {string} startDate - Tanggal mulai untuk range (YYYY-MM-DD, optional)
 * @query {string} endDate - Tanggal akhir untuk range (YYYY-MM-DD, optional)
 * @example GET /api/lateness/data/EMP001?startDate=2024-01-01&endDate=2024-01-31
 */
router.get('/data/:employeeId', getLatenessData);

/**
 * @route GET /api/lateness/stats/:employeeId
 * @desc Ambil statistik keterlambatan karyawan
 * @access Private
 * @param {string} employeeId - ID karyawan (optional, jika tidak ada akan ambil semua)
 * @query {string} startDate - Tanggal mulai (YYYY-MM-DD, optional)
 * @query {string} endDate - Tanggal akhir (YYYY-MM-DD, optional)
 * @example GET /api/lateness/stats/EMP001?startDate=2024-01-01&endDate=2024-01-31
 */
router.get('/stats/:employeeId?', getLatenessStats);

/**
 * @route GET /api/lateness/late-employees
 * @desc Ambil daftar karyawan yang terlambat pada tanggal tertentu
 * @access Private
 * @query {string} date - Tanggal (YYYY-MM-DD, optional, default: hari ini)
 * @example GET /api/lateness/late-employees?date=2024-01-15
 */
router.get('/late-employees', getLateEmployees);

// Endpoint untuk bulk calculation (admin only)
/**
 * @route POST /api/lateness/calculate/bulk
 * @desc Hitung keterlambatan untuk multiple karyawan (admin only).
 *       Bisa berdasarkan daftar employeeId, bulan/tahun, atau periode 'today'.
 * @access Private (Admin)
 * @body {
 *   period?: 'today', // Opsi baru untuk menghitung semua yang terjadwal hari ini
 *   employeeIds?: string[], // Opsi 1: Daftar ID karyawan manual
 *   month?: number, // Opsi 2: Bulan (1-12) untuk mengambil semua user dengan jadwal
 *   year?: number,  // Opsi 2: Tahun (2020-2030)
 *   date?: string, // Opsional: Untuk digunakan dengan employeeIds
 *   startDate?: string, // Opsional: Untuk digunakan dengan employeeIds
 *   endDate?: string,   // Opsional: Untuk digunakan dengan employeeIds
 *   saveToDb?: boolean
 * }
 */
router.post('/calculate/bulk', async (req, res, next) => {
  try {
    // Check admin role
    const user = (req as any).user;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin role required.'
      });
    }
    
    const { employeeIds, date, startDate, endDate, month, year, period, saveToDb = false } = req.body;
    
    let targetEmployeeIds: string[] = [];
    let calculationDate: string | undefined = date;
    let source: string = 'manual_selection';

    const Schedule = (await import('../models/schedule')).default;

    if (period === 'today') {
      calculationDate = DateHelper.getCurrentDateIndonesia();
      const today = new Date(calculationDate);
      targetEmployeeIds = await Schedule.findUserIdsWithSchedulesForMonth(today.getMonth() + 1, today.getFullYear());
      source = `today_auto_discovery (${calculationDate})`;
      
      if (targetEmployeeIds.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No employees found with active schedules for today'
        });
      }
    } else if (month && year && !employeeIds) {
      targetEmployeeIds = await Schedule.findUserIdsWithSchedulesForMonth(month, year);
      source = `month_based_auto_discovery (${month}/${year})`;
      
      if (targetEmployeeIds.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No employees found with schedules for the specified month'
        });
      }
    } else if (employeeIds && Array.isArray(employeeIds) && employeeIds.length > 0) {
      targetEmployeeIds = employeeIds;
      source = 'manual_selection';
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid parameters. Provide 'period: \"today\"', or 'month' and 'year', or a list of 'employeeIds'."
      });
    }
    
    // Limit bulk processing untuk menghindari overload
    const MAX_BULK_PROCESSING = 200;
    if (targetEmployeeIds.length > MAX_BULK_PROCESSING) {
      return res.status(400).json({
        success: false,
        message: `Maximum ${MAX_BULK_PROCESSING} employees allowed per bulk request`,
        totalEmployees: targetEmployeeIds.length,
        suggestion: 'Please process in smaller batches or use month-based filtering'
      });
    }
    
    const { latenessService } = await import('../services/latenessService');
    const results: any[] = [];
    const errors: any[] = [];
    
    // Process employees dengan batasan concurrency untuk menghindari overload
    const CONCURRENCY_LIMIT = 10;
    const processBatch = async (batch: string[]) => {
      const batchResults: Array<{ employeeId: string; success: boolean; data: any }> = [];
      const batchErrors: Array<{ employeeId: string; success: boolean; error: string }> = [];
      
      for (const employeeId of batch) {
        try {
          let latenessData;
          const targetDate = calculationDate || startDate;

          if (targetDate && !endDate) {
            // Single date calculation (termasuk untuk period: 'today')
            latenessData = await latenessService.calculateLatenessForUser(employeeId, targetDate);
            if (latenessData && saveToDb) {
              await latenessService.saveLatenessData(latenessData);
            }
          } else if (startDate && endDate) {
            // Date range calculation
            latenessData = await latenessService.calculateLatenessForDateRange(employeeId, startDate, endDate);
            if (saveToDb) {
              for (const data of latenessData) {
                await latenessService.saveLatenessData(data);
              }
            }
          } else if (month && year) {
            // Month-based calculation
            latenessData = await latenessService.calculateLatenessForMonth(employeeId, month, year);
            if (saveToDb) {
              for (const data of latenessData) {
                await latenessService.saveLatenessData(data);
              }
            }
          } else {
            throw new Error('No valid period (date, date range, or month) was specified for calculation.');
          }
          
          batchResults.push({
            employeeId,
            success: true,
            data: latenessData
          });
          
        } catch (error: any) {
          batchErrors.push({
            employeeId,
            success: false,
            error: error.message
          });
        }
      }
      
      return { batchResults, batchErrors };
    };
    
    // Process dalam batch untuk menghindari overload
    for (let i = 0; i < targetEmployeeIds.length; i += CONCURRENCY_LIMIT) {
      const batch = targetEmployeeIds.slice(i, i + CONCURRENCY_LIMIT);
      const { batchResults, batchErrors } = await processBatch(batch);
      results.push(...batchResults);
      errors.push(...batchErrors);
    }
    
    res.status(200).json({
      success: true,
      message: 'Bulk lateness calculation completed',
      data: {
        processed: targetEmployeeIds.length,
        successful: results.length,
        failed: errors.length,
        source,
        period: {
          date: calculationDate,
          startDate,
          endDate,
          month,
          year
        },
        results,
        errors
      }
    });
    
  } catch (error) {
    next(error);
  }
});

// Health check endpoint
/**
 * @route GET /api/lateness/health
 * @desc Health check untuk lateness service
 * @access Private
 */
router.get('/health', async (req, res) => {
  try {
    const { latenessService } = await import('../services/latenessService');
    
    // Test database connection
    const Lateness = (await import('../models/Lateness')).default;
    await Lateness.countDocuments().limit(1);
    
    res.status(200).json({
      success: true,
      message: 'Lateness service is healthy',
      timestamp: new Date().toISOString(),
      service: 'lateness',
      status: 'operational'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Lateness service health check failed',
      error: error.message,
      timestamp: new Date().toISOString(),
      service: 'lateness',
      status: 'error'
    });
  }
});

export default router;
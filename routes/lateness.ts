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
 * @desc Hitung keterlambatan untuk multiple karyawan (admin only)
 * @access Private (Admin)
 * @body {
 *   employeeIds: string[],
 *   date?: string,
 *   startDate?: string,
 *   endDate?: string,
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
    
    const { employeeIds, date, startDate, endDate, saveToDb = false } = req.body;
    
    if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Employee IDs array is required'
      });
    }
    
    // Limit bulk processing to 50 employees at once
    if (employeeIds.length > 50) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 50 employees allowed per bulk request'
      });
    }
    
    const { latenessService } = await import('../services/latenessService');
    const results: any[] = [];
    const errors: any[] = [];
    
    for (const employeeId of employeeIds) {
      try {
        let latenessData;
        
        if (date) {
          // Single date calculation
          latenessData = await latenessService.calculateLatenessForUser(employeeId, date);
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
        } else {
          throw new Error('Either date or startDate+endDate must be provided');
        }
        
        results.push({
          employeeId,
          success: true,
          data: latenessData
        });
        
      } catch (error: any) {
        errors.push({
          employeeId,
          success: false,
          error: error.message
        });
      }
    }
    
    res.status(200).json({
      success: true,
      message: 'Bulk lateness calculation completed',
      data: {
        processed: employeeIds.length,
        successful: results.length,
        failed: errors.length,
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
// routes/scheduleRoutes.ts
import { Router } from 'express';
import multer from 'multer';
import {
  uploadExcel,
  getAllSchedules,
  getSchedulesByEmployee,
  getScheduleByMonth,
  getCurrentMonthSchedule,
  getAvailableMonths,
  getScheduleByDateRange
} from '../controllers/scheduleController';
import Schedule from '../models/schedule';
import {
  validateEmployeeId,
  validateMonthYear,
  validateDateRange,
  handleMulterError,
  requestLogger,
  rateLimiter
} from '../middlewares/validation';

const router = Router();

// Apply middleware to all routes
router.use(requestLogger);
router.use(rateLimiter(15 * 60 * 1000, 100)); // 100 requests per 15 minutes

// Configure multer for file upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only Excel files
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.mimetype === 'application/vnd.ms-excel') {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed!'));
    }
  }
});

// ==================== EXISTING ROUTES ====================
/**
 * Upload Excel file and parse schedule data
 * POST /api/schedule/upload-excel
 */
router.post('/upload-excel', upload.single('file'), handleMulterError, uploadExcel);

/**
 * Get all schedules
 * GET /api/schedule/all
 */
router.get('/all', getAllSchedules);

/**
 * Get schedules by employee name (search)
 * GET /api/schedule/search?name=John
 */
router.get('/search', getSchedulesByEmployee);

// ==================== NEW FILTERING ROUTES ====================
/**
 * Get employee schedule filtered by specific month and year
 * GET /api/schedule/:employeeId/filter?month=7&year=2025
 * 
 * Query Parameters:
 * - month: 1-12 (required)
 * - year: YYYY format (required)
 * 
 * Example: GET /api/schedule/2405047/filter?month=7&year=2025
 */
router.get('/:employeeId/filter', validateEmployeeId, validateMonthYear, getScheduleByMonth);

/**
 * Get employee schedule for current month
 * GET /api/schedule/:employeeId/current-month
 * 
 * Example: GET /api/schedule/2405047/current-month
 */
router.get('/:employeeId/current-month', validateEmployeeId, getCurrentMonthSchedule);

/**
 * Get list of available months that have schedule data for employee
 * GET /api/schedule/:employeeId/available-months
 * 
 * Example: GET /api/schedule/2405047/available-months
 */
router.get('/:employeeId/available-months', validateEmployeeId, getAvailableMonths);

/**
 * Get employee schedule filtered by date range
 * GET /api/schedule/:employeeId/date-range?start_date=2025-07-01&end_date=2025-07-31
 * 
 * Query Parameters:
 * - start_date: YYYY-MM-DD format (required)
 * - end_date: YYYY-MM-DD format (required)
 * 
 * Example: GET /api/schedule/2405047/date-range?start_date=2025-07-01&end_date=2025-07-31
 */
router.get('/:employeeId/date-range', validateEmployeeId, validateDateRange, getScheduleByDateRange);

// ==================== GENERAL EMPLOYEE ROUTES ====================
/**
 * Get all schedule data for specific employee (without filter)
 * GET /api/schedule/:employeeId
 * 
 * Example: GET /api/schedule/2405047
 */
router.get('/:employeeId', validateEmployeeId, async (req, res) => {
  try {
    const { employeeId } = req.params;
    
    if (!employeeId) {
      return res.status(400).json({
        success: false,
        error: 'Employee ID is required'
      });
    }

    const schedule = await Schedule.findOne({ employee_id: employeeId });
    
    if (!schedule) {
      return res.status(404).json({
        success: false,
        error: `No schedule found for employee ${employeeId}`
      });
    }

    // Sort schedule by date
    schedule.schedule.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

    res.status(200).json({
      success: true,
      message: 'Schedule retrieved successfully',
      data: schedule
    });

  } catch (error) {
    console.error('❌ Error getting employee schedule:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;

// ==================== USAGE EXAMPLES ====================
/*

1. UPLOAD EXCEL FILE:
   POST /api/schedule/upload-excel
   Content-Type: multipart/form-data
   Body: file (Excel file)

2. GET ALL SCHEDULES:
   GET /api/schedule/all

3. SEARCH BY EMPLOYEE NAME:
   GET /api/schedule/search?name=Anggi

4. GET SPECIFIC EMPLOYEE ALL DATA:
   GET /api/schedule/2405047

5. FILTER BY MONTH:
   GET /api/schedule/2405047/filter?month=7&year=2025

6. GET CURRENT MONTH:
   GET /api/schedule/2405047/current-month

7. GET AVAILABLE MONTHS:
   GET /api/schedule/2405047/available-months

8. FILTER BY DATE RANGE:
   GET /api/schedule/2405047/date-range?start_date=2025-07-01&end_date=2025-07-15

RESPONSE EXAMPLES:

// Month Filter Response
{
  "success": true,
  "message": "Schedule retrieved successfully for 7/2025",
  "data": {
    "employee_id": "2405047",
    "name": "Anggi Firmansyah",
    "position": "Staff",
    "department": "IT",
    "filter": {
      "month": 7,
      "year": 2025,
      "month_name": "July",
      "total_days": 22
    },
    "statistics": {
      "total_scheduled_days": 22,
      "shift_distribution": {
        "Pagi": 10,
        "Siang": 8,
        "Malam": 4
      },
      "working_days_in_month": 31
    },
    "schedule": [
      {
        "date": "2025-07-01",
        "shift": "Pagi"
      },
      {
        "date": "2025-07-02",
        "shift": "Siang"
      }
    ]
  }
}

// Available Months Response
{
  "success": true,
  "message": "Available months retrieved successfully",
  "data": {
    "employee_id": "2405047",
    "available_months": [
      {
        "year": 2025,
        "month": 8,
        "month_name": "August",
        "total_days": 23,
        "period": {
          "start": "2025-08-01",
          "end": "2025-08-31"
        }
      },
      {
        "year": 2025,
        "month": 7,
        "month_name": "July",
        "total_days": 22,
        "period": {
          "start": "2025-07-01",
          "end": "2025-07-31"
        }
      }
    ],
    "total_months": 2
  }
}

*/
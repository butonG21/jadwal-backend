import express from 'express';
import { 
    fetchAttendance, 
    fetchAttendanceByUser, 
    getAttendanceByFilter,
    migrateExistingImages,
    getMigrationStats,
    getOptimizationStats,
    testOptimizedFetch,
    getJobStatus,
    getAllJobs
  } from '../controllers/attendanceController';
const router = express.Router();

router.post('/fetch-all', fetchAttendance);
router.get('/fetch/:employeeId', fetchAttendanceByUser); // fetch satu user
router.get('/:employeeId/filter', getAttendanceByFilter);

// Job status and management routes
router.get('/job-status/:jobId', getJobStatus);
router.get('/jobs', getAllJobs);

// Migration routes
router.post('/migrate-images', migrateExistingImages);
router.get('/migration-stats', getMigrationStats);

// Optimization routes
router.get('/optimization-stats', getOptimizationStats);
router.get('/test-optimized-fetch/:employeeId', testOptimizedFetch);



export default router;

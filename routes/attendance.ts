import express from 'express';
import { 
    fetchAttendance, 
    fetchAttendanceByUser, 
    getAttendanceByFilter,
    migrateExistingImages,
    getMigrationStats,
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

// New migration routes
router.post('/migrate-images', migrateExistingImages);
router.get('/migration-stats', getMigrationStats);



export default router;

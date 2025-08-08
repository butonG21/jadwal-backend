import express from 'express';
import { 
    fetchAttendance, 
    fetchAttendanceByUser, 
    getAttendanceByFilter,
    migrateExistingImages,
    getMigrationStats
  } from '../controllers/attendanceController';
const router = express.Router();

router.post('/fetch-all', fetchAttendance);
router.get('/fetch/:employeeId', fetchAttendanceByUser); // fetch satu user
router.get('/:employeeId/filter', getAttendanceByFilter);

// New migration routes
router.post('/migrate-images', migrateExistingImages);
router.get('/migration-stats', getMigrationStats);



export default router;

import express from 'express';
import multer from 'multer';
import { uploadExcel, getAllSchedules, getSchedulesByEmployee } from '../controllers/scheduleController';

const router = express.Router();
const upload = multer(); // pakai memory storage (tidak simpan ke disk)

router.post('/upload-excel', upload.single('file'), uploadExcel);
router.get('/all', getAllSchedules);
router.get('/filter', getSchedulesByEmployee);


export default router;

import express from 'express';
import multer from 'multer';
import { uploadExcel, getAllSchedules, getSchedulesByEmployee } from '../controllers/scheduleController';
import { verifyToken } from '../middlewares/verifyToken';


const router = express.Router();
const upload = multer(); // pakai memory storage (tidak simpan ke disk)

router.post('/upload-excel', upload.single('file'), uploadExcel);
router.get('/all', getAllSchedules);
router.get('/filter', verifyToken,getSchedulesByEmployee);


export default router;

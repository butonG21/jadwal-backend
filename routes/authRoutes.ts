import express from 'express';
import { login } from '../controllers/authController';
import { logout } from '../controllers/authController';
import { verifyToken } from '../middlewares/verifyToken';


const router = express.Router();

router.post('/login', login);
router.post('/auth/logout', verifyToken, logout);

export default router;

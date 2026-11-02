import { Router } from 'express';
import { login, verifyAdminPassword } from '../controllers/authController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

router.post('/login', login);
router.post('/verify-admin-password', protect, verifyAdminPassword);

export default router;

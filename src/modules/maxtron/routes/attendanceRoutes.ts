import { Router } from 'express';
import {
    getAllAttendance,
    getAttendanceByDate,
    getAttendanceByRange,
    createAttendance,
    createBulkAttendance,
    updateAttendance,
    deleteAttendance
} from '../controllers/attendanceController';
import { protect } from '../../../middleware/authMiddleware';

const router = Router();

router.get('/', protect, getAllAttendance);
router.get('/range', protect, getAttendanceByRange);
router.get('/date/:date', protect, getAttendanceByDate);
router.post('/', protect, createAttendance);
router.post('/bulk', protect, createBulkAttendance);
router.put('/:id', protect, updateAttendance);
router.delete('/:id', protect, deleteAttendance);


export default router;

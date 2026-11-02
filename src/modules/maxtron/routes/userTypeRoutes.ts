import { Router } from 'express';
import {
    getUserTypes,
    createUserType,
    updateUserType,
    deleteUserType
} from '../controllers/userTypeController';
import { protect, adminOnly } from '../../../middleware/authMiddleware';

const router = Router();

router.get('/', protect, getUserTypes);
router.post('/', protect, adminOnly, createUserType);
router.put('/:id', protect, adminOnly, updateUserType);
router.delete('/:id', protect, adminOnly, deleteUserType);

export default router;

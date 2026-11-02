import { Router } from 'express';
import { getAllPermissions, getRolePermissions, updatePermission } from '../../../controllers/permissionController';
import { protect, adminOnly } from '../../../middleware/authMiddleware';

const router = Router();

// Only protected users can access these
router.get('/', protect, adminOnly, getAllPermissions);
router.get('/:roleId', protect, getRolePermissions);
router.post('/update', protect, adminOnly, updatePermission);

export default router;

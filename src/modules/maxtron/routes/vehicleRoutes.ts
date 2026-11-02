import { Router } from 'express';
import {
    getVehicles,
    getVehicle,
    createVehicle,
    updateVehicle,
    deleteVehicle
} from '../controllers/vehicleController';
import { protect } from '../../../middleware/authMiddleware';

const router = Router();

router.get('/', protect, getVehicles);
router.get('/:id', protect, getVehicle);
router.post('/', protect, createVehicle);
router.put('/:id', protect, updateVehicle);
router.delete('/:id', protect, deleteVehicle);

export default router;

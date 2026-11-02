import { Router } from 'express';
import {
    getRMOrders,
    getRMOrder,
    createRMOrder,
    updateRMOrder,
    deleteRMOrder
} from '../controllers/rmOrderController';
import { protect } from '../../../middleware/authMiddleware';

const router = Router();

router.use(protect);

router.get('/', getRMOrders);
router.get('/:id', getRMOrder);
router.post('/', createRMOrder);
router.put('/:id', updateRMOrder);
router.delete('/:id', deleteRMOrder);

export default router;

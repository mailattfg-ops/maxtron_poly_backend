import { Router } from 'express';
import {
    getOrders,
    getOrder,
    createOrder,
    updateOrder,
    deleteOrder
} from '../controllers/orderController';
import { protect } from '../../../middleware/authMiddleware';

const router = Router();

router.get('/', protect, getOrders);
router.get('/:id', protect, getOrder);
router.post('/', protect, createOrder);
router.put('/:id', protect, updateOrder);
router.delete('/:id', protect, deleteOrder);

export default router;

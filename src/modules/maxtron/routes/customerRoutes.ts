import { Router } from 'express';
import {
    getCustomers,
    getCustomer,
    getNextCustomerCode,
    createCustomer,
    updateCustomer,
    deleteCustomer
} from '../controllers/customerController';
import { protect } from '../../../middleware/authMiddleware';

const router = Router();

router.get('/', protect, getCustomers);
// Before '/:id', or "next-code" would be read as a customer id
router.get('/next-code', protect, getNextCustomerCode);
router.get('/:id', protect, getCustomer);
router.post('/', protect, createCustomer);
router.put('/:id', protect, updateCustomer);
router.delete('/:id', protect, deleteCustomer);

export default router;

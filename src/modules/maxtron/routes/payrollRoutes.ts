import { Router } from 'express';
import { 
    getPayrolls, 
    getPayroll, 
    createPayroll, 
    updatePayroll, 
    deletePayroll 
} from '../controllers/payrollController';

const router = Router();

router.get('/', getPayrolls);
router.get('/:id', getPayroll);
router.post('/', createPayroll);
router.put('/:id', updatePayroll);
router.delete('/:id', deletePayroll);

export default router;

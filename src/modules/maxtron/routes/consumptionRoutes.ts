import { Router } from 'express';
import {
    getConsumptions,
    getConsumption,
    createConsumption,
    updateConsumption,
    deleteConsumption
} from '../controllers/consumptionController';
import { protect } from '../../../middleware/authMiddleware';

const router = Router();

router.use(protect);

router.get('/', getConsumptions);
router.get('/:id', getConsumption);
router.post('/', createConsumption);
router.put('/:id', updateConsumption);
router.delete('/:id', deleteConsumption);

export default router;

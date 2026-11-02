import { Router } from 'express';
import {
    getAllOutcomes,
    createOutcome,
    updateOutcome,
    deleteOutcome
} from '../controllers/marketingOutcomeController';

const router = Router();

router.get('/', getAllOutcomes);
router.post('/', createOutcome);
router.put('/:id', updateOutcome);
router.delete('/:id', deleteOutcome);

export default router;

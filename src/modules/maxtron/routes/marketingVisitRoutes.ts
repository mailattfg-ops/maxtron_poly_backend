import { Router } from 'express';
import {
    getAllMarketingVisits,
    createMarketingVisit,
    updateMarketingVisit,
    deleteMarketingVisit
} from '../controllers/marketingVisitController';
import { protect } from '../../../middleware/authMiddleware';

const router = Router();

router.get('/', protect, getAllMarketingVisits);
router.post('/', protect, createMarketingVisit);
router.put('/:id', protect, updateMarketingVisit);
router.delete('/:id', protect, deleteMarketingVisit);

export default router;

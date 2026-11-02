import { Router } from 'express';
import {
    getPurchaseEntries,
    getPurchaseEntry,
    createPurchaseEntry,
    updatePurchaseEntry,
    deletePurchaseEntry
} from '../controllers/purchaseEntryController';
import { protect } from '../../../middleware/authMiddleware';

const router = Router();

router.use(protect);

router.get('/', getPurchaseEntries);
router.get('/:id', getPurchaseEntry);
router.post('/', createPurchaseEntry);
router.put('/:id', updatePurchaseEntry);
router.delete('/:id', deletePurchaseEntry);

export default router;

import { Router } from 'express';
import {
    getPurchaseReturns,
    getPurchaseReturn,
    createPurchaseReturn,
    updatePurchaseReturn,
    deletePurchaseReturn
} from '../controllers/purchaseReturnController';
import { protect } from '../../../middleware/authMiddleware';

const router = Router();

router.use(protect);

router.get('/', getPurchaseReturns);
router.get('/:id', getPurchaseReturn);
router.post('/', createPurchaseReturn);
router.put('/:id', updatePurchaseReturn);
router.delete('/:id', deletePurchaseReturn);

export default router;

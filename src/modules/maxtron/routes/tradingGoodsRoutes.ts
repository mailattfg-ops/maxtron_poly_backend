import { Router } from 'express';
import {
    getTradingGoods,
    getTradingGood,
    createTradingGood,
    updateTradingGood,
    deleteTradingGood,
    getNextInwardNumber
} from '../controllers/tradingGoodsController';
import { protect } from '../../../middleware/authMiddleware';

const router = Router();

router.use(protect);

router.get('/next-number', getNextInwardNumber);
router.get('/', getTradingGoods);
router.get('/:id', getTradingGood);
router.post('/', createTradingGood);
router.put('/:id', updateTradingGood);
router.delete('/:id', deleteTradingGood);

export default router;

import { Router } from 'express';
import {
    getInventory,
    getInventoryItem,
    createInventoryItem,
    updateInventoryItem,
    deleteInventoryItem
} from '../controllers/inventoryController';
import { getStockSummary, getFGStockSummary, getSFGStockSummary } from '../controllers/stockController';
import { protect } from '../../../middleware/authMiddleware';

const router = Router();

router.get('/stock-summary', protect, getStockSummary);
router.get('/fg-stock-summary', protect, getFGStockSummary);
router.get('/sfg-stock-summary', protect, getSFGStockSummary);

// Map route paths to controller methods
router.route('/')
    .get(protect, getInventory)
    .post(protect, createInventoryItem);

router.route('/:id')
    .get(protect, getInventoryItem)
    .put(protect, updateInventoryItem)
    .delete(protect, deleteInventoryItem);

export default router;

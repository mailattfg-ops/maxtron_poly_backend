import { Router } from 'express';
import { productionController } from '../controllers/productionController';
import { protect } from '../../../middleware/authMiddleware';

const router = Router();

// Batches / Extrusion
router.get('/batches', protect, productionController.getBatches);
router.post('/batches', protect, productionController.createBatch);
router.put('/batches/:id', protect, productionController.updateBatch);
router.delete('/batches/:id', protect, productionController.deleteBatch);

// Conversion / Cutting
router.get('/conversions', protect, productionController.getConversions);
router.post('/conversions', protect, productionController.createConversion);
router.put('/conversions/:id', protect, productionController.updateConversion);
router.delete('/conversions/:id', protect, productionController.deleteConversion);

// Printing
router.get('/printing', protect, productionController.getPrinting);
router.post('/printing', protect, productionController.createPrinting);
router.put('/printing/:id', protect, productionController.updatePrinting);
router.delete('/printing/:id', protect, productionController.deletePrinting);

// Packing
router.get('/packing', protect, productionController.getPacking);
router.post('/packing', protect, productionController.createPacking);
router.put('/packing/:id', protect, productionController.updatePacking);
router.delete('/packing/:id', protect, productionController.deletePacking);

// Wastage
router.get('/wastage', protect, productionController.getWastage);
router.post('/wastage', protect, productionController.createWastage);
router.put('/wastage/:id', protect, productionController.updateWastage);
router.delete('/wastage/:id', protect, productionController.deleteWastage);

// Miscellaneous Expenses
router.get('/expenses', protect, productionController.getExpenses);
router.post('/expenses', protect, productionController.createExpense);
router.put('/expenses/:id', protect, productionController.updateExpense);
router.delete('/expenses/:id', protect, productionController.deleteExpense);

export default router;

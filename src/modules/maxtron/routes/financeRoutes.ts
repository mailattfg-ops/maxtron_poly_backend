import { Router } from 'express';
import { FinanceController } from '../controllers/financeController';
import { protect } from '../../../middleware/authMiddleware';

const router = Router();

// Collections
router.get('/collections', protect, FinanceController.getCollections);
router.post('/collections', protect, FinanceController.createCollection);
router.put('/collections/:id', protect, FinanceController.updateCollection);
router.delete('/collections/:id', protect, FinanceController.deleteCollection);
router.get('/pending-invoices', protect, FinanceController.getPendingInvoices);

// Payments
router.get('/payments', protect, FinanceController.getPayments);
router.post('/payments', protect, FinanceController.createPayment);
router.put('/payments/:id', protect, FinanceController.updatePayment);
router.delete('/payments/:id', protect, FinanceController.deletePayment);
router.get('/pending-bills', protect, FinanceController.getPendingBills);

// Petty Cash
router.get('/petty-cash', protect, FinanceController.getPettyCash);
router.post('/petty-cash', protect, FinanceController.createPettyCash);
router.put('/petty-cash/:id', protect, FinanceController.updatePettyCash);
router.delete('/petty-cash/:id', protect, FinanceController.deletePettyCash);

// Reports
router.get('/scorecard', protect, FinanceController.getScorecard);

export default router;

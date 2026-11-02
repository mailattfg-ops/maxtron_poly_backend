import { Router } from 'express';
import { salesController } from '../controllers/salesController';
import { invoiceController } from '../controllers/invoiceController';
import { deliveryController } from '../controllers/deliveryController';
import { salesReturnController } from '../controllers/salesReturnController';
import { protect } from '../../../middleware/authMiddleware';

const router = Router();

// Orders
router.get('/orders', protect, salesController.getOrders);
router.get('/orders/next-number', protect, salesController.getNextNumber);
router.post('/orders', protect, salesController.createOrder);
router.put('/orders/:id', protect, salesController.updateOrder);
router.delete('/orders/:id', protect, salesController.deleteOrder);

// Invoices
router.get('/invoices', protect, invoiceController.getAll);
router.get('/invoices/next-number', protect, invoiceController.getNextNumber);
router.post('/invoices', protect, invoiceController.create);
router.put('/invoices/:id', protect, invoiceController.update);
router.delete('/invoices/:id', protect, invoiceController.delete);
router.post('/invoices/:id/einvoice', protect, invoiceController.generateEInvoice);
router.post('/invoices/:id/einvoice/cancel', protect, invoiceController.cancelEInvoice);
router.post('/invoices/:id/ewaybill', protect, invoiceController.generateEwb);
router.post('/invoices/:id/ewaybill/cancel', protect, invoiceController.cancelEwb);

// Deliveries
router.get('/deliveries', protect, deliveryController.getAll);
router.post('/deliveries', protect, deliveryController.create);
router.put('/deliveries/:id', protect, deliveryController.update);
router.delete('/deliveries/:id', protect, deliveryController.delete);

// Returns
router.get('/returns', protect, salesReturnController.getAll);
router.post('/returns', protect, salesReturnController.create);
router.put('/returns/:id', protect, salesReturnController.update);
router.delete('/returns/:id', protect, salesReturnController.delete);
router.post('/returns/:id/credit-note', protect, salesReturnController.generateCreditNote);


export default router;

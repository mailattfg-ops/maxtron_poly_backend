import { Request, Response } from 'express';
import { CustomerCollectionModel } from '../models/customerCollectionModel';
import { SupplierPaymentModel } from '../models/supplierPaymentModel';
import { PettyCashModel } from '../models/pettyCashModel';
import { PurchaseEntryModel } from '../models/purchaseEntryModel';
import { InvoiceModel } from '../models/invoiceModel';
import { supabase } from '../../../config/supabase';
import { collectionSchema, paymentSchema, pettyCashSchema } from '../validators/financeValidator';

export const FinanceController = {
    // --- Customer Collections ---
    getCollections: async (req: Request, res: Response) => {
        try {
            const companyId = String(req.query.companyId || '');
            const data = await CustomerCollectionModel.getAll(companyId);
            res.json({ success: true, data });
        } catch (err: any) {
            res.status(500).json({ success: false, message: 'Failed to fetch collections', error: err.message });
        }
    },

    createCollection: async (req: Request, res: Response) => {
        try {
            const validation = collectionSchema.safeParse(req.body);
            if (!validation.success) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Validation failed', 
                    errors: validation.error.flatten().fieldErrors 
                });
            }
            const data = await CustomerCollectionModel.create(validation.data);
            res.json({ success: true, data });
        } catch (err: any) {
            res.status(500).json({ success: false, message: 'Failed to record collection', error: err.message });
        }
    },

    deleteCollection: async (req: Request, res: Response) => {
        try {
            await CustomerCollectionModel.delete(req.params.id as string);
            res.json({ success: true, message: 'Collection deleted successfully' });
        } catch (err: any) {
            res.status(500).json({ success: false, message: 'Failed to delete collection', error: err.message });
        }
    },
    
    updateCollection: async (req: Request, res: Response) => {
        try {
            const validation = collectionSchema.safeParse(req.body);
            if (!validation.success) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Validation failed', 
                    errors: validation.error.flatten().fieldErrors 
                });
            }
            const data = await CustomerCollectionModel.update(req.params.id as string, validation.data);
            res.json({ success: true, data });
        } catch (err: any) {
            res.status(500).json({ success: false, message: 'Failed to update collection', error: err.message });
        }
    },

    getPendingInvoices: async (req: Request, res: Response) => {
        try {
            const customerId = (req.query.customerId || req.query.customer_id) as string;
            const companyId = (req.query.companyId || req.query.company_id) as string;
            const data = await InvoiceModel.getPendingByCustomer(customerId, companyId);
            res.json({ success: true, data });
        } catch (err: any) {
            res.status(500).json({ success: false, message: 'Failed to fetch pending invoices', error: err.message });
        }
    },

    // --- Supplier Payments ---
    getPayments: async (req: Request, res: Response) => {
        try {
            const companyId = String(req.query.companyId || '');
            const data = await SupplierPaymentModel.getAll(companyId);
            res.json({ success: true, data });
        } catch (err: any) {
            res.status(500).json({ success: false, message: 'Failed to fetch payments', error: err.message });
        }
    },

    createPayment: async (req: Request, res: Response) => {
        try {
            const validation = paymentSchema.safeParse(req.body);
            if (!validation.success) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Validation failed', 
                    errors: validation.error.flatten().fieldErrors 
                });
            }
            const data = await SupplierPaymentModel.create(validation.data);
            res.json({ success: true, data });
        } catch (err: any) {
            res.status(500).json({ success: false, message: 'Failed to record payment', error: err.message });
        }
    },

    deletePayment: async (req: Request, res: Response) => {
        try {
            await SupplierPaymentModel.delete(req.params.id as string);
            res.json({ success: true, message: 'Payment deleted successfully' });
        } catch (err: any) {
            res.status(500).json({ success: false, message: 'Failed to delete payment', error: err.message });
        }
    },
    
    updatePayment: async (req: Request, res: Response) => {
        try {
            const validation = paymentSchema.safeParse(req.body);
            if (!validation.success) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Validation failed', 
                    errors: validation.error.flatten().fieldErrors 
                });
            }
            const data = await SupplierPaymentModel.update(req.params.id as string, validation.data);
            res.json({ success: true, data });
        } catch (err: any) {
            res.status(500).json({ success: false, message: 'Failed to update payment', error: err.message });
        }
    },

    getPendingBills: async (req: Request, res: Response) => {
        try {
            const supplierId = (req.query.supplierId || req.query.supplier_id) as string;
            const companyId = (req.query.companyId || req.query.company_id) as string;
            const data = await PurchaseEntryModel.getPendingBySupplier(supplierId, companyId);
            res.json({ success: true, data });
        } catch (err: any) {
            res.status(500).json({ success: false, message: 'Failed to fetch pending bills', error: err.message });
        }
    },

    // --- Petty Cash ---
    getPettyCash: async (req: Request, res: Response) => {
        try {
            const companyId = String(req.query.companyId || '');
            const data = await PettyCashModel.getAll(companyId);
            res.json({ success: true, data });
        } catch (err: any) {
            res.status(500).json({ success: false, message: 'Failed to fetch petty cash records', error: err.message });
        }
    },

    createPettyCash: async (req: Request, res: Response) => {
        try {
            const validation = pettyCashSchema.safeParse(req.body);
            if (!validation.success) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Validation failed', 
                    errors: validation.error.flatten().fieldErrors 
                });
            }
            const data = await PettyCashModel.create(validation.data);
            res.json({ success: true, data });
        } catch (err: any) {
            res.status(500).json({ success: false, message: 'Failed to record petty cash', error: err.message });
        }
    },

    deletePettyCash: async (req: Request, res: Response) => {
        try {
            await PettyCashModel.delete(req.params.id as string);
            res.json({ success: true, message: 'Petty cash record deleted successfully' });
        } catch (err: any) {
            res.status(500).json({ success: false, message: 'Failed to delete petty cash record', error: err.message });
        }
    },
    
    updatePettyCash: async (req: Request, res: Response) => {
        try {
            const validation = pettyCashSchema.safeParse(req.body);
            if (!validation.success) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Validation failed', 
                    errors: validation.error.flatten().fieldErrors 
                });
            }
            const data = await PettyCashModel.update(req.params.id as string, validation.data);
            res.json({ success: true, data });
        } catch (err: any) {
            res.status(500).json({ success: false, message: 'Failed to update petty cash record', error: err.message });
        }
    },

    // --- Financial Summaries & Scorecard ---
    getScorecard: async (req: Request, res: Response) => {
        try {
            const { companyId, startDate, endDate } = req.query;

            // Added up in the database (migrations/scorecard_totals.sql).
            const { data: totals, error } = await supabase.rpc('scorecard_totals', {
                p_company: companyId || null,
                p_start: startDate || null,
                p_end: endDate || null
            });
            if (error) throw new Error(error.message);

            const t = (key: string) => Number((totals as any)?.[key] || 0);
            const summary = {
                totalSales: t('sales'),
                totalPurchases: t('purchases'),
                totalCollections: t('collections'),
                totalPayments: t('payments'),
                totalExpenses: t('expenses'),
                cashInHand: t('collections') - (t('payments') + t('expenses'))
            };

            res.json({ success: true, data: summary });
        } catch (err: any) {
            res.status(500).json({ success: false, message: 'Failed to fetch scorecard', error: err.message });
        }
    }
};

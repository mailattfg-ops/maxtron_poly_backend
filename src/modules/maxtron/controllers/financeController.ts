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

            const cId = companyId as string;
            const sDate = startDate as string | undefined;
            const eDate = endDate as string | undefined;

            const runQuery = async (table: string, column: string, dateColumn: string): Promise<any[]> => {
                let q = supabase.from(table).select(column).eq('company_id', cId);
                if (sDate) q = (q as any).gte(dateColumn, sDate);
                if (eDate) q = (q as any).lte(dateColumn, eDate);
                const { data } = await q;
                return (data as any[]) || [];
            };

            const [sales, purchases, collections, payments, expenses] = await Promise.all([
                runQuery('sales_invoices', 'net_amount', 'invoice_date'),
                runQuery('purchase_entries', 'total_amount', 'entry_date'),
                runQuery('customer_collections', 'amount', 'collection_date'),
                runQuery('supplier_payments', 'amount', 'payment_date'),
                runQuery('petty_cash', 'amount', 'expense_date')
            ]);

            const summary = {
                totalSales: sales.reduce((sum: number, item: any) => sum + Number(item.net_amount), 0),
                totalPurchases: purchases.reduce((sum: number, item: any) => sum + Number(item.total_amount), 0),
                totalCollections: collections.reduce((sum: number, item: any) => sum + Number(item.amount), 0),
                totalPayments: payments.reduce((sum: number, item: any) => sum + Number(item.amount), 0),
                totalExpenses: expenses.reduce((sum: number, item: any) => sum + Number(item.amount), 0),
                cashInHand: collections.reduce((sum: number, item: any) => sum + Number(item.amount), 0) -
                    (payments.reduce((sum: number, item: any) => sum + Number(item.amount), 0) +
                        expenses.reduce((sum: number, item: any) => sum + Number(item.amount), 0))
            };

            res.json({ success: true, data: summary });
        } catch (err: any) {
            res.status(500).json({ success: false, message: 'Failed to fetch scorecard', error: err.message });
        }
    }
};

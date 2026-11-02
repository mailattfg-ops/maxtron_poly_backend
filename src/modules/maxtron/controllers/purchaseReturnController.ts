import { Request, Response } from 'express';
import { PurchaseReturnModel } from '../models/purchaseReturnModel';

export const getPurchaseReturns = async (req: Request, res: Response): Promise<void> => {
    try {
        const { company_id } = req.query;
        const items = await PurchaseReturnModel.getAll(company_id as string);
        res.status(200).json({ success: true, count: items.length, data: items });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to fetch purchase returns', error: error.message });
    }
};

export const getPurchaseReturn = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const item = await PurchaseReturnModel.getById(id as string);
        if (!item) {
            res.status(404).json({ success: false, message: 'Return record not found' });
            return;
        }
        res.status(200).json({ success: true, data: item });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to fetch return', error: error.message });
    }
};

export const createPurchaseReturn = async (req: Request, res: Response): Promise<void> => {
    try {
        const newItem = await PurchaseReturnModel.create(req.body);
        res.status(201).json({ success: true, data: newItem });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to record return', error: error.message });
    }
};

export const updatePurchaseReturn = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const updated = await PurchaseReturnModel.update(id as string, req.body);
        if (!updated) {
            res.status(404).json({ success: false, message: 'Return record not found' });
            return;
        }
        res.status(200).json({ success: true, data: updated });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to update return', error: error.message });
    }
};

export const deletePurchaseReturn = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const deleted = await PurchaseReturnModel.delete(id as string);
        if (!deleted) {
            res.status(404).json({ success: false, message: 'ReturnNotFound' });
            return;
        }
        res.status(200).json({ success: true, message: 'Return record deleted' });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to delete return', error: error.message });
    }
};

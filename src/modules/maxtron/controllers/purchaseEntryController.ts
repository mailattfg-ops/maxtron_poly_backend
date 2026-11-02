import { Request, Response } from 'express';
import { PurchaseEntryModel } from '../models/purchaseEntryModel';

export const getPurchaseEntries = async (req: Request, res: Response): Promise<void> => {
    try {
        const { company_id } = req.query;
        const entries = await PurchaseEntryModel.getAll(company_id as string);
        res.status(200).json({ success: true, count: entries.length, data: entries });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to fetch purchase entries', error: error.message });
    }
};

export const getPurchaseEntry = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const entry = await PurchaseEntryModel.getById(id as string);
        if (!entry) {
            res.status(404).json({ success: false, message: 'Purchase entry not found' });
            return;
        }
        res.status(200).json({ success: true, data: entry });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to fetch entry', error: error.message });
    }
};

export const createPurchaseEntry = async (req: Request, res: Response): Promise<void> => {
    try {
        const newEntry = await PurchaseEntryModel.create(req.body);
        res.status(201).json({ success: true, data: newEntry });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to create purchase entry', error: error.message });
    }
};

export const updatePurchaseEntry = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const updated = await PurchaseEntryModel.update(id as string, req.body);
        if (!updated) {
            res.status(404).json({ success: false, message: 'Purchase entry not found' });
            return;
        }
        res.status(200).json({ success: true, data: updated });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to update entry', error: error.message });
    }
};

export const deletePurchaseEntry = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const deleted = await PurchaseEntryModel.delete(id as string);
        if (!deleted) {
            res.status(404).json({ success: false, message: 'EntryNotFound' });
            return;
        }
        res.status(200).json({ success: true, message: 'Purchase entry removed' });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to delete entry', error: error.message });
    }
};

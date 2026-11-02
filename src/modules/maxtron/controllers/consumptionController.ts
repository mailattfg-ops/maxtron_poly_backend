import { Request, Response } from 'express';
import { ConsumptionModel } from '../models/consumptionModel';

export const getConsumptions = async (req: Request, res: Response): Promise<void> => {
    try {
        const { company_id } = req.query;
        const items = await ConsumptionModel.getAll(company_id as string);
        res.status(200).json({ success: true, count: items.length, data: items });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to fetch consumptions', error: error.message });
    }
};

export const getConsumption = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const item = await ConsumptionModel.getById(id as string);
        if (!item) {
            res.status(404).json({ success: false, message: 'Consumption record not found' });
            return;
        }
        res.status(200).json({ success: true, data: item });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to fetch consumption', error: error.message });
    }
};

export const createConsumption = async (req: Request, res: Response): Promise<void> => {
    try {
        const newItem = await ConsumptionModel.create(req.body);
        res.status(201).json({ success: true, data: newItem });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to record consumption', error: error.message });
    }
};

export const updateConsumption = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const updated = await ConsumptionModel.update(id as string, req.body);
        if (!updated) {
            res.status(404).json({ success: false, message: 'Consumption record not found' });
            return;
        }
        res.status(200).json({ success: true, data: updated });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to update consumption', error: error.message });
    }
};

export const deleteConsumption = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const deleted = await ConsumptionModel.delete(id as string);
        if (!deleted) {
            res.status(404).json({ success: false, message: 'ConsumptionNotFound' });
            return;
        }
        res.status(200).json({ success: true, message: 'Consumption record deleted' });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to delete consumption', error: error.message });
    }
};

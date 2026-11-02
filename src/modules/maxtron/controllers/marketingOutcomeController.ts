import { Request, Response } from 'express';
import { MarketingOutcomeModel } from '../models/marketingOutcomeModel';

export const getAllOutcomes = async (req: Request, res: Response): Promise<void> => {
    try {
        const { company_id } = req.query;
        const outcomes = await MarketingOutcomeModel.getAll(company_id as string);
        res.status(200).json({ success: true, count: outcomes.length, data: outcomes });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to fetch visit outcomes', error: error.message });
    }
};

export const createOutcome = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, company_id, color, display_order } = req.body;
        if (!name || !name.trim()) {
            res.status(400).json({ success: false, message: 'Outcome name is required' });
            return;
        }
        const created = await MarketingOutcomeModel.create({ name, company_id, color, display_order });
        res.status(201).json({ success: true, data: created });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to create visit outcome', error: error.message });
    }
};

export const updateOutcome = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const updated = await MarketingOutcomeModel.update(id, req.body);
        if (!updated) {
            res.status(404).json({ success: false, message: 'Visit outcome not found' });
            return;
        }
        res.status(200).json({ success: true, data: updated });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to update visit outcome', error: error.message });
    }
};

export const deleteOutcome = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        await MarketingOutcomeModel.delete(id);
        res.status(200).json({ success: true, message: 'Visit outcome deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to delete visit outcome', error: error.message });
    }
};

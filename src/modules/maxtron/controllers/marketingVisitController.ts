import { Request, Response } from 'express';
import { MarketingVisitModel } from '../models/marketingVisitModel';

export const getAllMarketingVisits = async (req: Request, res: Response): Promise<void> => {
    try {
        const { company_id } = req.query;
        const visits = await MarketingVisitModel.getAll(company_id as string);
        res.status(200).json({ success: true, count: visits.length, data: visits });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to fetch marketing visits', error: error.message });
    }
};

export const createMarketingVisit = async (req: Request, res: Response): Promise<void> => {
    try {
        const newVisit = await MarketingVisitModel.create(req.body);
        res.status(201).json({ success: true, data: newVisit });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to create marketing visit', error: error.message });
    }
};

export const updateMarketingVisit = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const updatedVisit = await MarketingVisitModel.update(id as string, req.body);
        if (!updatedVisit) {
            res.status(404).json({ success: false, message: 'Marketing visit not found' });
            return;
        }
        res.status(200).json({ success: true, data: updatedVisit });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to update marketing visit', error: error.message });
    }
};

export const deleteMarketingVisit = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const deleted = await MarketingVisitModel.delete(id as string);
        if (!deleted) {
            res.status(404).json({ success: false, message: 'Marketing visit not found' });
            return;
        }
        res.status(200).json({ success: true, message: 'Marketing visit deleted' });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to delete marketing visit', error: error.message });
    }
};

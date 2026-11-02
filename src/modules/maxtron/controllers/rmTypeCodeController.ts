import { Request, Response } from 'express';
import { RMTypeCodeModel } from '../models/rmTypeCodeModel';

export const getRMTypeCodes = async (req: Request, res: Response): Promise<void> => {
    try {
        const { company_id } = req.query;
        const items = await RMTypeCodeModel.getAll(company_id as string);
        res.status(200).json({ success: true, count: items.length, data: items });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to fetch RM type codes', error: error.message });
    }
};

export const createRMTypeCode = async (req: Request, res: Response): Promise<void> => {
    try {
        const newItem = await RMTypeCodeModel.create(req.body);
        res.status(201).json({ success: true, data: newItem });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to create RM type code', error: error.message });
    }
};

export const updateRMTypeCode = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const updated = await RMTypeCodeModel.update(id as string, req.body);
        if (!updated) {
            res.status(404).json({ success: false, message: 'RM type code not found' });
            return;
        }
        res.status(200).json({ success: true, data: updated });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to update RM type code', error: error.message });
    }
};

export const deleteRMTypeCode = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const deleted = await RMTypeCodeModel.delete(id as string);
        if (!deleted) {
            res.status(404).json({ success: false, message: 'RM type code not found' });
            return;
        }
        res.status(200).json({ success: true, message: 'RM type code deleted' });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to delete RM type code', error: error.message });
    }
};

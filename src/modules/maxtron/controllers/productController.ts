import { Request, Response } from 'express';
import { FinishedProductModel } from '../models/finishedProductModel';

export const productController = {
    getAll: async (req: Request, res: Response) => {
        try {
            const { company_id, category } = req.query;
            const data = await FinishedProductModel.getAll(company_id as string, category as string);
            res.json({ success: true, data });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    create: async (req: Request, res: Response) => {
        try {
            const data = await FinishedProductModel.create(req.body);
            res.status(201).json({ success: true, data });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    update: async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const data = await FinishedProductModel.update(id as string, req.body);
            res.json({ success: true, data });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    delete: async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            await FinishedProductModel.delete(id as string);
            res.json({ success: true, message: 'Product deleted successfully' });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
};

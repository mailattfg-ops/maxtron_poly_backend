import { Request, Response } from 'express';
import { DeliveryModel } from '../models/deliveryModel';

export const deliveryController = {
    getAll: async (req: Request, res: Response) => {
        try {
            const { company_id } = req.query;
            const data = await DeliveryModel.getAll(company_id as string);
            res.json({ success: true, data });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    create: async (req: Request, res: Response) => {
        try {
            const data = await DeliveryModel.create(req.body);
            res.status(201).json({ success: true, data });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    update: async (req: Request, res: Response) => {
        try {
            const id = req.params.id as string;
            await DeliveryModel.update(id, req.body);
            res.json({ success: true, message: 'Delivery record updated successfully' });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    delete: async (req: Request, res: Response) => {
        try {
            const id = req.params.id as string;
            await DeliveryModel.delete(id);
            res.json({ success: true, message: 'Delivery record deleted successfully' });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
};

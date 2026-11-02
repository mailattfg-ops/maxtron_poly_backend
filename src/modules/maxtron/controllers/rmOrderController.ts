import { Request, Response } from 'express';
import { RMOrderModel } from '../models/rmOrderModel';

export const getRMOrders = async (req: Request, res: Response): Promise<void> => {
    try {
        const { company_id } = req.query;
        const orders = await RMOrderModel.getAll(company_id as string);
        res.status(200).json({ success: true, count: orders.length, data: orders });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to fetch RM orders', error: error.message });
    }
};

export const getRMOrder = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const order = await RMOrderModel.getById(id as string);
        if (!order) {
            res.status(404).json({ success: false, message: 'Order not found' });
            return;
        }
        res.status(200).json({ success: true, data: order });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to fetch order', error: error.message });
    }
};

export const createRMOrder = async (req: Request, res: Response): Promise<void> => {
    try {
        const newOrder = await RMOrderModel.create(req.body);
        res.status(201).json({ success: true, data: newOrder });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to create order', error: error.message });
    }
};

export const updateRMOrder = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const updated = await RMOrderModel.update(id as string, req.body);
        if (!updated) {
            res.status(404).json({ success: false, message: 'Order not found' });
            return;
        }
        res.status(200).json({ success: true, data: updated });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to update order', error: error.message });
    }
};

export const deleteRMOrder = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const deleted = await RMOrderModel.delete(id as string);
        if (!deleted) {
            res.status(404).json({ success: false, message: 'OrderNotFound' });
            return;
        }
        res.status(200).json({ success: true, message: 'RM Order canceled' });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to delete order', error: error.message });
    }
};

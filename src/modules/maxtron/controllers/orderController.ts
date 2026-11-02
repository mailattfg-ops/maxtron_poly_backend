import { Request, Response } from 'express';
import { OrderModel } from '../models/orderModel';
import { supabase } from '../../../config/supabase';
import { EwbService } from '../services/ewbService';

export const getOrders = async (req: Request, res: Response): Promise<void> => {
    try {
        const { company_id } = req.query;
        const orders = await OrderModel.getAll(company_id as string);
        res.status(200).json({ success: true, count: orders.length, data: orders });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to fetch customer orders', error: error.message });
    }
};

export const getOrder = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const order = await OrderModel.getById(id as string);
        if (!order) {
            res.status(404).json({ success: false, message: 'Order not found' });
            return;
        }
        res.status(200).json({ success: true, data: order });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to fetch order', error: error.message });
    }
};

export const createOrder = async (req: Request, res: Response): Promise<void> => {
    try {
        let order = await OrderModel.create(req.body);
        console.log('[orderController] created order:', JSON.stringify(order, null, 2));
        console.log('[orderController] net_amount value:', order.net_amount, 'type:', typeof order.net_amount);

        if (Number(order.net_amount) > 50000) {
            console.log(`[orderController] Grand Total (${order.net_amount}) > 50000. Triggering E-Way Bill generation...`);
            const ewbResult = await EwbService.generateEwb(order, order.customers, order.items);

            const { data: updatedData, error } = await supabase
                .from('customer_orders')
                .update({
                    ewb_status: ewbResult.ewb_status,
                    ewb_no: ewbResult.ewb_no || null,
                    ewb_date: ewbResult.ewb_date || null,
                    ewb_valid_till: ewbResult.ewb_valid_till || null,
                    ewb_error: ewbResult.ewb_error || null
                })
                .eq('id', order.id)
                .select();

            if (error) {
                console.error('[orderController] Error updating order with EWB status:', error.message);
            } else if (updatedData && updatedData.length > 0) {
                order = await OrderModel.getById(order.id);
            }
        }

        res.status(201).json({ success: true, data: order });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to create order', error: error.message });
    }
};

export const updateOrder = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        let order = await OrderModel.update(id as string, req.body);
        if (!order) {
            res.status(404).json({ success: false, message: 'Order not found' });
            return;
        }

        if (Number(order.net_amount) > 50000 && order.ewb_status !== 'GENERATED') {
            console.log(`[orderController] Grand Total (${order.net_amount}) > 50000. Triggering E-Way Bill generation on update...`);
            const ewbResult = await EwbService.generateEwb(order, order.customers, order.items);

            const { data: updatedData, error } = await supabase
                .from('customer_orders')
                .update({
                    ewb_status: ewbResult.ewb_status,
                    ewb_no: ewbResult.ewb_no || null,
                    ewb_date: ewbResult.ewb_date || null,
                    ewb_valid_till: ewbResult.ewb_valid_till || null,
                    ewb_error: ewbResult.ewb_error || null
                })
                .eq('id', order.id)
                .select();

            if (error) {
                console.error('[orderController] Error updating order with EWB status:', error.message);
            } else if (updatedData && updatedData.length > 0) {
                order = await OrderModel.getById(order.id);
            }
        }

        res.status(200).json({ success: true, data: order });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to update order', error: error.message });
    }
};

export const deleteOrder = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const deleted = await OrderModel.delete(id as string);
        if (!deleted) {
            res.status(404).json({ success: false, message: 'Order not found' });
            return;
        }
        res.status(200).json({ success: true, message: 'Order deleted' });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to delete order', error: error.message });
    }
};


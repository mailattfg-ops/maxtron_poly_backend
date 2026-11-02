import { Request, Response } from 'express';
import { SalesModel } from '../models/salesModel';
import { supabase } from '../../../config/supabase';
import { EwbService } from '../services/ewbService';

const getEnrichedOrder = async (id: string) => {
    const { data, error } = await supabase
        .from('customer_orders')
        .select(`
            *,
            customers(*),
            items:customer_order_items(
                *,
                finished_products(product_name, product_code)
            )
        `)
        .eq('id', id)
        .single();
    if (error) throw new Error(error.message);
    return data;
};

export const salesController = {
    getNextNumber: async (req: Request, res: Response) => {
        try {
            const { company_id } = req.query;
            const data = await SalesModel.getNextNumber(company_id as string);
            res.json({ success: true, data });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    getOrders: async (req: Request, res: Response) => {
        try {
            const { company_id } = req.query;
            const data = await SalesModel.getOrders(company_id as string);
            res.json({ success: true, data });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    createOrder: async (req: Request, res: Response) => {
        try {
            const orderData = await SalesModel.createOrder(req.body);
            let finalOrderData = orderData;

            if (Number(orderData.net_amount) > 50000) {
                console.log(`[salesController] Grand Total (${orderData.net_amount}) > 50000. Triggering EWB generation...`);
                const enriched = await getEnrichedOrder(orderData.id);
                const ewbResult = await EwbService.generateEwb(enriched, enriched.customers, enriched.items);
                
                const { data: updatedData, error: updateErr } = await supabase
                    .from('customer_orders')
                    .update({
                        ewb_status: ewbResult.ewb_status,
                        ewb_no: ewbResult.ewb_no || null,
                        ewb_date: ewbResult.ewb_date || null,
                        ewb_valid_till: ewbResult.ewb_valid_till || null,
                        ewb_error: ewbResult.ewb_error || null
                    })
                    .eq('id', orderData.id)
                    .select();

                if (updateErr) {
                    console.error('[salesController] Error updating EWB status:', updateErr.message);
                } else if (updatedData && updatedData.length > 0) {
                    finalOrderData = updatedData[0];
                }
            }

            res.status(201).json({ success: true, data: finalOrderData });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    updateOrder: async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            await SalesModel.updateOrder(id as string, req.body);
            
            const order = await getEnrichedOrder(id);

            if (Number(order.net_amount) > 50000 && order.ewb_status !== 'GENERATED') {
                console.log(`[salesController] Grand Total (${order.net_amount}) > 50000. Triggering EWB generation on update...`);
                const ewbResult = await EwbService.generateEwb(order, order.customers, order.items);
                
                const { error: updateErr } = await supabase
                    .from('customer_orders')
                    .update({
                        ewb_status: ewbResult.ewb_status,
                        ewb_no: ewbResult.ewb_no || null,
                        ewb_date: ewbResult.ewb_date || null,
                        ewb_valid_till: ewbResult.ewb_valid_till || null,
                        ewb_error: ewbResult.ewb_error || null
                    })
                    .eq('id', id);

                if (updateErr) {
                    console.error('[salesController] Error updating EWB status on update:', updateErr.message);
                }
            }

            res.json({ success: true, message: 'Order updated successfully' });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    deleteOrder: async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            await SalesModel.deleteOrder(id as string);
            res.json({ success: true, message: 'Order deleted successfully' });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
};


import { supabase } from '../../../config/supabase';

export const RMOrderModel = {
    getAll: async (companyId?: string) => {
        let query = supabase.from('rm_orders').select(`
            *,
            supplier_master!supplier_id(supplier_name, supplier_code),
            rm_order_items(
                rm_id, quantity, rate, amount, gst_percent, gst_amount,
                raw_materials!rm_id(rm_name, rm_code)
            )
        `);
        if (companyId) {
            query = query.eq('company_id', companyId);
        }
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw new Error(error.message);
        return data || [];
    },

    getById: async (id: string) => {
        const { data, error } = await supabase
            .from('rm_orders')
            .select(`
                *,
                supplier_master!supplier_id(supplier_name, supplier_code),
                rm_order_items(
                    id, rm_id, quantity, rate, amount, gst_percent, gst_amount,
                    raw_materials!rm_id(rm_name, rm_code, grade)
                )
            `)
            .eq('id', id)
            .single();
        if (error) throw new Error(error.message);
        return data;
    },

    create: async (orderData: any) => {
        const { items, ...orderInfo } = orderData;

        const { data: order, error: orderErr } = await supabase
            .from('rm_orders')
            .insert([orderInfo])
            .select();

        if (orderErr) throw new Error(orderErr.message);

        const orderId = order[0].id;
        const itemsWithId = items.map((item: any) => {
            const totalAmount = Number(item.total_line_amount || item.amount) || (Number(item.quantity) * Number(item.rate)) + Number(item.gst_amount || 0);
            const baseAmount = totalAmount - Number(item.gst_amount || 0);
            return {
                order_id: orderId,
                rm_id: item.rm_id,
                quantity: item.quantity,
                rate: item.rate,
                gst_percent: item.gst_percent,
                gst_amount: item.gst_amount,
                amount: baseAmount
            };
        });

        const { error: itemsErr } = await supabase.from('rm_order_items').insert(itemsWithId);
        if (itemsErr) throw new Error(itemsErr.message);

        return order[0];
    },

    update: async (id: string, orderData: any) => {
        const { items, ...orderInfo } = orderData;

        const { data: order, error: orderErr } = await supabase
            .from('rm_orders')
            .update(orderInfo)
            .eq('id', id)
            .select();

        if (orderErr) throw new Error(orderErr.message);

        // Replace items
        const { error: deleteErr } = await supabase.from('rm_order_items').delete().eq('order_id', id);
        if (deleteErr) throw new Error(deleteErr.message);

        if (items && items.length > 0) {
            const itemsWithId = items.map((item: any) => {
                const totalAmount = Number(item.total_line_amount || item.amount) || (Number(item.quantity) * Number(item.rate)) + Number(item.gst_amount || 0);
                const baseAmount = totalAmount - Number(item.gst_amount || 0);
                return {
                    order_id: id,
                    rm_id: item.rm_id,
                    quantity: item.quantity,
                    rate: item.rate,
                    gst_percent: item.gst_percent,
                    gst_amount: item.gst_amount,
                    amount: baseAmount
                };
            });
            const { error: insertErr } = await supabase.from('rm_order_items').insert(itemsWithId);
            if (insertErr) throw new Error(insertErr.message);
        }

        return order[0];
    },

    delete: async (id: string) => {
        const { error } = await supabase.from('rm_orders').delete().eq('id', id);
        if (error) throw new Error(error.message);
        return true;
    }
};

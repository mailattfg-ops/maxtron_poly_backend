import { supabase } from '../../../config/supabase';

export const OrderModel = {
    getAll: async (companyId?: string) => {
        let query = supabase.from('customer_orders').select(`
            *,
            customers(customer_name, customer_code),
            items:customer_order_items(*)
        `);
        if (companyId) {
            query = query.eq('company_id', companyId);
        }
        const { data, error } = await query.order('order_date', { ascending: false });
        if (error) throw new Error(error.message);
        return data || [];
    },

    getById: async (id: string) => {
        const { data, error } = await supabase
            .from('customer_orders')
            .select(`
                *,
                customers(*),
                items:customer_order_items(*)
            `)
            .eq('id', id)
            .single();
        if (error) throw new Error(error.message);
        return data;
    },

    create: async (orderData: any) => {
        const { items, ...orderInfo } = orderData;

        // Header
        const { data: headerData, error: headerErr } = await supabase
            .from('customer_orders')
            .insert([orderInfo])
            .select();

        if (headerErr) throw new Error(headerErr.message);
        const orderId = headerData[0].id;

        // Items
        if (items && items.length > 0) {
            const enrichedItems = items.map((item: any) => {
                const { value, ...rest } = item;
                return { ...rest, order_id: orderId };
            });
            const { error: itemsErr } = await supabase.from('customer_order_items').insert(enrichedItems);
            if (itemsErr) {
                // Should potentially rollback or delete header, but simple logic for now
                await supabase.from('customer_orders').delete().eq('id', orderId);
                throw new Error(itemsErr.message);
            }
        }

        return OrderModel.getById(orderId);
    },

    update: async (id: string, orderData: any) => {
        const { items, ...orderInfo } = orderData;

        // Header
        const { error: headerErr } = await supabase
            .from('customer_orders')
            .update(orderInfo)
            .eq('id', id);

        if (headerErr) throw new Error(headerErr.message);

        // Replace Items (Delete all & Reinstate)
        if (items) {
            await supabase.from('customer_order_items').delete().eq('order_id', id);
            const enrichedItems = items.map((item: any) => {
                const { value, ...rest } = item;
                return { ...rest, order_id: id };
            });
            const { error: itemsErr } = await supabase.from('customer_order_items').insert(enrichedItems);
            if (itemsErr) throw new Error(itemsErr.message);
        }

        return OrderModel.getById(id);
    },

    delete: async (id: string) => {
        // FK constraint will handle cascade if defined or if manually deleted
        const { error } = await supabase.from('customer_orders').delete().eq('id', id);
        if (error) throw new Error(error.message);
        return true;
    }
};

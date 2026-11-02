import { supabase } from '../../../config/supabase';

export const SalesModel = {
    getOrders: async (companyId: string) => {
        const { data, error } = await supabase
            .from('customer_orders')
            .select(`
                *,
                customers(customer_name, customer_code),
                executive:users!executive_id(name),
                items:customer_order_items(
                    *,
                    finished_products(product_name, product_code)
                )
            `)
            .eq('company_id', companyId)
            .order('created_at', { ascending: false });

        if (error) throw new Error(error.message);
        return data || [];
    },

    getNextNumber: async (companyId?: string) => {
        // Highest trailing number, found in the database: reading every row here stopped
        // at the 1000-row cap and handed out numbers already in use.
        const { data: maxNum, error } = await supabase.rpc('max_doc_number', {
            p_table: 'customer_orders', p_col: 'order_number', p_pattern: '([0-9]+)$', p_company: companyId || null
        });
        if (error) throw new Error(error.message);

        const nextNum = Number(maxNum || 0) + 1;
        return `ORD-${String(nextNum).padStart(4, '0')}`;
    },

    createOrder: async (orderData: any) => {
        const { items, ...header } = orderData;

        // Sanitize header values (convert empty strings to null)
        const sanitizedHeader = { ...header };
        Object.keys(sanitizedHeader).forEach(f => {
            if (sanitizedHeader[f] === '') sanitizedHeader[f] = null;
        });

        if (!sanitizedHeader.order_number || !sanitizedHeader.order_number.trim()) {
            sanitizedHeader.order_number = await SalesModel.getNextNumber(sanitizedHeader.company_id);
        }

        const { data, error } = await supabase
            .from('customer_orders')
            .insert([sanitizedHeader])
            .select()
            .single();

        if (error) throw new Error(error.message);

        if (items && items.length > 0) {
            const itemsToInsert = items.map((item: any) => {
                const { value, ...rest } = item;
                const sanitizedItem = { ...rest, order_id: data.id };
                if (sanitizedItem.product_id === '') sanitizedItem.product_id = null;
                return sanitizedItem;
            });

            const { error: itemError } = await supabase
                .from('customer_order_items')
                .insert(itemsToInsert);

            if (itemError) {
                // Don't leave an order with no lines behind.
                await supabase.from('customer_orders').delete().eq('id', data.id);
                throw new Error(itemError.message);
            }
        }

        return data;
    },

    updateOrder: async (id: string, orderData: any) => {
        const { items, ...header } = orderData;

        // Sanitize header values (convert empty strings to null)
        const sanitizedHeader = { ...header };
        Object.keys(sanitizedHeader).forEach(f => {
            if (sanitizedHeader[f] === '') sanitizedHeader[f] = null;
        });

        // Update header
        const { error: headerError } = await supabase
            .from('customer_orders')
            .update(sanitizedHeader)
            .eq('id', id);

        if (headerError) throw new Error(headerError.message);

        // Old lines out and new lines in, in one transaction: if the insert fails the old lines stay.
        if (items) {
            const itemsToInsert = items.map((item: any) => {
                const { value, ...rest } = item;
                const sanitizedItem = { ...rest, order_id: id };
                if (sanitizedItem.product_id === '') sanitizedItem.product_id = null;
                return sanitizedItem;
            });

            const { error: itemError } = await supabase.rpc('replace_child_rows', {
                p_table: 'customer_order_items', p_fk: 'order_id', p_parent: id, p_rows: itemsToInsert
            });

            if (itemError) throw new Error(itemError.message);
        }

        return true;
    },

    deleteOrder: async (id: string) => {
        const { error } = await supabase
            .from('customer_orders')
            .delete()
            .eq('id', id);

        if (error) throw new Error(error.message);
        return true;
    }
};

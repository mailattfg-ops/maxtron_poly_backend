import { supabase } from '../../../config/supabase';

export const DeliveryModel = {
    getAll: async (companyId: string) => {
        const { data, error } = await supabase
            .from('deliveries')
            .select(`
                *,
                invoices:sales_invoices(invoice_number),
                orders:customer_orders(order_number),
                vehicles:vehicles(registration_number),
                delivery_person:users!delivery_person_id(name),
                items:delivery_items(
                    *,
                    finished_products(product_name, product_code)
                )
            `)
            .eq('company_id', companyId)
            .order('created_at', { ascending: false });

        if (error) throw new Error(error.message);
        return data || [];
    },

    create: async (deliveryData: any) => {
        const { items, ...header } = deliveryData;

        const sanitizedHeader = { ...header };
        ['invoice_id', 'order_id', 'vehicle_id', 'company_id', 'delivery_person_id'].forEach(f => {
            if (sanitizedHeader[f] === '') sanitizedHeader[f] = null;
        });

        const { data, error } = await supabase
            .from('deliveries')
            .insert([sanitizedHeader])
            .select()
            .single();

        if (error) throw new Error(error.message);

        if (items && items.length > 0) {
            const itemsToInsert = items.map((item: any) => ({
                ...item,
                delivery_id: data.id,
                product_id: item.product_id === '' ? null : item.product_id
            }));

            const { error: itemError } = await supabase
                .from('delivery_items')
                .insert(itemsToInsert);

            if (itemError) throw new Error(itemError.message);
        }

        return data;
    },

    update: async (id: string, deliveryData: any) => {
        const { items, ...header } = deliveryData;

        const sanitizedHeader = { ...header };
        ['invoice_id', 'order_id', 'vehicle_id', 'company_id', 'delivery_person_id'].forEach(f => {
            if (sanitizedHeader[f] === '') sanitizedHeader[f] = null;
        });

        const { error: headerError } = await supabase
            .from('deliveries')
            .update(sanitizedHeader)
            .eq('id', id);

        if (headerError) throw new Error(headerError.message);

        if (items) {
            await supabase.from('delivery_items').delete().eq('delivery_id', id);

            if (items.length > 0) {
                const itemsToInsert = items.map((item: any) => ({
                    ...item,
                    delivery_id: id,
                    product_id: item.product_id === '' ? null : item.product_id
                }));

                const { error: itemError } = await supabase
                    .from('delivery_items')
                    .insert(itemsToInsert);
                if (itemError) throw new Error(itemError.message);
            }
        }
        return true;
    },

    delete: async (id: string) => {
        const { error } = await supabase.from('deliveries').delete().eq('id', id);
        if (error) throw new Error(error.message);
        return true;
    }
};

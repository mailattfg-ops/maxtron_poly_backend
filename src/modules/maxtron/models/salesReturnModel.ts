import { supabase } from '../../../config/supabase';

export const SalesReturnModel = {
    getAll: async (companyId: string) => {
        const { data, error } = await supabase
            .from('sales_returns')
            .select(`
                *,
                invoices:sales_invoices(invoice_number, einvoice_status, einvoice_irn, einvoice_ack_no, einvoice_ack_date, invoice_date, invoice_type, tax_amount, net_amount),
                customers(customer_name, customer_code, gst_no, addresses(*)),

                return_employee:users!return_employee_id(name),
                items:sales_return_items(
                    *,
                    finished_products(product_name, product_code, hsn_code)
                )
            `)
            .eq('company_id', companyId)
            .order('created_at', { ascending: false });

        if (error) throw new Error(error.message);
        return data || [];
    },


    create: async (returnData: any) => {
        const { items, ...header } = returnData;

        const sanitizedHeader = { ...header };
        ['invoice_id', 'customer_id', 'company_id', 'return_employee_id'].forEach(f => {
            if (sanitizedHeader[f] === '') sanitizedHeader[f] = null;
        });

        const { data, error } = await supabase
            .from('sales_returns')
            .insert([sanitizedHeader])
            .select()
            .single();

        if (error) throw new Error(error.message);

        if (items && items.length > 0) {
            const itemsToInsert = items.map((item: any) => {
                const { value, ...rest } = item;
                return {
                    ...rest,
                    return_id: data.id,
                    product_id: item.product_id === '' ? null : item.product_id
                };
            });

            const { error: itemError } = await supabase
                .from('sales_return_items')
                .insert(itemsToInsert);

            if (itemError) throw new Error(itemError.message);
        }

        return data;
    },

    update: async (id: string, returnData: any) => {
        const { items, ...header } = returnData;

        const sanitizedHeader = { ...header };
        ['invoice_id', 'customer_id', 'company_id', 'return_employee_id'].forEach(f => {
            if (sanitizedHeader[f] === '') sanitizedHeader[f] = null;
        });

        const { error: headerError } = await supabase
            .from('sales_returns')
            .update(sanitizedHeader)
            .eq('id', id);

        if (headerError) throw new Error(headerError.message);

        if (items) {
            await supabase.from('sales_return_items').delete().eq('return_id', id);

            if (items.length > 0) {
                const itemsToInsert = items.map((item: any) => {
                    const { value, ...rest } = item;
                    return {
                        ...rest,
                        return_id: id,
                        product_id: item.product_id === '' ? null : item.product_id
                    };
                });

                const { error: itemError } = await supabase
                    .from('sales_return_items')
                    .insert(itemsToInsert);
                if (itemError) throw new Error(itemError.message);
            }
        }
        return true;
    },

    delete: async (id: string) => {
        const { error } = await supabase.from('sales_returns').delete().eq('id', id);
        if (error) throw new Error(error.message);
        return true;
    }
};

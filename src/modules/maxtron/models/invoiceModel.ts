import { supabase } from '../../../config/supabase';

/**
 * One row per invoice line. gst_percent is the rate typed for that line — the
 * printed invoice, the e-Invoice and the e-Way Bill are all computed from it.
 * It used not to be stored at all, and everything downstream assumed 18%.
 */
const itemRows = (invoiceId: string, items: any[], withGst: boolean) => items.map((item: any) => ({
    invoice_id: invoiceId,
    product_id: item.product_id === '' ? null : item.product_id,
    quantity: Number(item.quantity) || 0,
    rate: Number(item.rate) || 0,
    ...(withGst ? {
        gst_percent: item.gst_percent === '' || item.gst_percent === undefined || item.gst_percent === null
            ? null
            : Number(item.gst_percent)
    } : {}),
}));

const insertItems = async (invoiceId: string, items: any[]) => {
    let { error } = await supabase.from('sales_invoice_items').insert(itemRows(invoiceId, items, true));
    /* Until migrations/add_gst_percent_to_invoice_items.sql is applied the
     * column does not exist. The invoice must still save: store its lines
     * without the rate rather than leave an invoice with no lines. */
    if (error && /gst_percent/.test(error.message)) {
        ({ error } = await supabase.from('sales_invoice_items').insert(itemRows(invoiceId, items, false)));
    }
    if (error) throw new Error(error.message);
};

export const InvoiceModel = {
    getAll: async (companyId: string) => {
        const { data, error } = await supabase
            .from('sales_invoices')
            .select(`
                *,
                customers(customer_name, customer_code, gst_no, addresses(*)),
                orders:customer_orders(order_number),
                executive:users!executive_id(name),
                items:sales_invoice_items(
                    *,
                    finished_products(product_name, product_code, hsn_code)
                )
            `)
            .eq('company_id', companyId)
            .order('created_at', { ascending: false });

        if (error) throw new Error(error.message);
        // Attached bills are whole files stored as text (hundreds of kB each): the list only
        // says whether one exists; getBillDocument loads it when the user opens it.
        return (data || []).map(({ bill_document_url, ...inv }: any) => ({ ...inv, has_bill_document: !!bill_document_url }));
    },

    getBillDocument: async (id: string) => {
        const { data, error } = await supabase
            .from('sales_invoices')
            .select('bill_document_url, bill_document_name')
            .eq('id', id)
            .single();
        if (error) throw new Error(error.message);
        return data;
    },

    getNextNumber: async (companyId?: string) => {
        // Highest MP<number>, found in the database: reading every row here stopped at
        // the 1000-row cap and handed out numbers already in use.
        const { data: maxNum, error } = await supabase.rpc('max_doc_number', {
            p_table: 'sales_invoices', p_col: 'invoice_number', p_pattern: '^MP([0-9]+)$', p_company: companyId || null
        });
        if (error) throw new Error(error.message);

        const nextNum = Number(maxNum || 0) + 1;
        return `MP${String(nextNum).padStart(3, '0')}`;
    },

    create: async (invoiceData: any) => {
        const { items, ...header } = invoiceData;

        // Sanitize header (convert empty string dates & UUIDs to null for Postgres)
        const sanitizedHeader: any = { ...header };
        const nullableFields = [
            'customer_id', 'executive_id', 'order_id', 'company_id',
            'transporter_id', 'trans_doc_no', 'trans_doc_date',
            'scheduled_delivery_date', 'remarks', 'vehicle_no', 'transporter_name',
            'billing_software', 'bill_document_url', 'bill_document_name'
        ];
        nullableFields.forEach(f => {
            if (sanitizedHeader[f] === '' || sanitizedHeader[f] === undefined) {
                sanitizedHeader[f] = null;
            }
        });

        if (!sanitizedHeader.invoice_number || !sanitizedHeader.invoice_number.trim()) {
            sanitizedHeader.invoice_number = await InvoiceModel.getNextNumber(sanitizedHeader.company_id);
        }

        const { data, error } = await supabase
            .from('sales_invoices')
            .insert([sanitizedHeader])
            .select()
            .single();

        if (error) throw new Error(error.message);

        if (items && items.length > 0) {
            try {
                await insertItems(data.id, items);
            } catch (itemError) {
                // Don't leave an invoice with no lines behind; it also blocks retrying with the same number.
                await supabase.from('sales_invoices').delete().eq('id', data.id);
                throw itemError;
            }
        }

        return data;
    },

    update: async (id: string, invoiceData: any) => {
        const { items, ...header } = invoiceData;

        // Sanitize header
        const sanitizedHeader: any = { ...header };
        const nullableFields = [
            'customer_id', 'executive_id', 'order_id', 'company_id',
            'transporter_id', 'trans_doc_no', 'trans_doc_date',
            'scheduled_delivery_date', 'remarks', 'vehicle_no', 'transporter_name',
            'billing_software', 'bill_document_url', 'bill_document_name'
        ];
        nullableFields.forEach(f => {
            if (sanitizedHeader[f] === '' || sanitizedHeader[f] === undefined) {
                sanitizedHeader[f] = null;
            }
        });
        // Not sent = keep the stored bill (the list no longer carries it, so a client that
        // never loaded it must not wipe it). Sending '' still removes it on purpose.
        if (!('bill_document_url' in header)) delete sanitizedHeader.bill_document_url;
        if (!('bill_document_name' in header)) delete sanitizedHeader.bill_document_name;

        const { error: headerError } = await supabase
            .from('sales_invoices')
            .update(sanitizedHeader)
            .eq('id', id);

        if (headerError) throw new Error(headerError.message);

        if (items) {
            // Old lines out and new lines in, in one transaction: if the insert fails the
            // old lines stay. The function skips gst_percent until that column exists.
            const { error: itemsError } = await supabase.rpc('replace_child_rows', {
                p_table: 'sales_invoice_items', p_fk: 'invoice_id', p_parent: id,
                p_rows: itemRows(id, items, true)
            });
            if (itemsError) throw new Error(itemsError.message);
        }
        return true;
    },

    delete: async (id: string) => {
        const { error } = await supabase.from('sales_invoices').delete().eq('id', id);
        if (error) throw new Error(error.message);
        return true;
    },

    getPendingByCustomer: async (customerId: string, companyId: string) => {
        const { data, error } = await supabase
            .from('v_sales_invoice_balances')
            .select('*')
            .eq('customer_id', customerId)
            .eq('company_id', companyId)
            .gt('pending_amount', 0)
            .order('invoice_date', { ascending: false });

        if (error) throw new Error(error.message);
        return data || [];
    }
};

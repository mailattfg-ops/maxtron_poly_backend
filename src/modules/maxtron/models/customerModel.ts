import { supabase } from '../../../config/supabase';

export const CustomerModel = {
    getAll: async (companyId?: string) => {
        let query = supabase.from('customers').select(`
            *,
            addresses(*)
        `);
        if (companyId) {
            query = query.eq('company_id', companyId);
        }
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw new Error(error.message);
        return data || [];
    },

    /**
     * The next free customer code for a company: one above the highest
     * CUST-number it uses, written CUST-032. Counting customers does not work,
     * as codes have gaps and two widths (CUST-000010, CUST-031).
     */
    getNextCode: async (companyId?: string) => {
        // Found in the database: reading every code here stopped at the 1000-row cap.
        const { data, error } = await supabase.rpc('max_doc_number', {
            p_table: 'customers', p_col: 'customer_code', p_pattern: '^CUST-0*([0-9]+)$', p_company: companyId || null
        });
        if (error) throw new Error(error.message);
        const highest = Number(data || 0);
        return `CUST-${String(highest + 1).padStart(3, '0')}`;
    },

    getById: async (id: string) => {
        const { data, error } = await supabase
            .from('customers')
            .select(`
                *,
                addresses(*)
            `)
            .eq('id', id)
            .single();
        if (error) throw new Error(error.message);
        return data;
    },

    create: async (customerData: any) => {
        const { addresses, ...customerInfo } = customerData;

        const { data, error } = await supabase
            .from('customers')
            .insert([customerInfo])
            .select();

        if (error) throw new Error(error.message);
        const newCustomer = data[0];

        if (newCustomer && addresses && addresses.length > 0) {
            const enrichedAddresses = addresses.map((addr: any) => ({
                ...addr,
                customer_id: newCustomer.id
            }));
            const { error: addrError } = await supabase.from('addresses').insert(enrichedAddresses);
            if (addrError) {
                // All or nothing: without this the customer stayed saved with no
                // address while the screen reported a failure.
                // ponytail: two statements, not one transaction; a crash between
                // them still leaves the customer. Move both into a database
                // function if that ever happens.
                await supabase.from('customers').delete().eq('id', newCustomer.id);
                throw new Error(addrError.message);
            }
        }

        return CustomerModel.getById(newCustomer.id);
    },

    update: async (id: string, customerData: any) => {
        const { addresses, ...customerInfo } = customerData;

        const { data, error } = await supabase
            .from('customers')
            .update(customerInfo)
            .eq('id', id)
            .select();

        if (error) throw new Error(error.message);

        if (addresses) {
            // Delete old addresses and insert new ones or perform a more sophisticated update
            await supabase.from('addresses').delete().eq('customer_id', id);
            const enrichedAddresses = addresses.map((addr: any) => ({
                ...addr,
                customer_id: id
            }));
            await supabase.from('addresses').insert(enrichedAddresses);
        }

        return CustomerModel.getById(id);
    },

    delete: async (id: string) => {
        const { error } = await supabase.from('customers').delete().eq('id', id);
        if (error) throw new Error(error.message);
        return true;
    }
};

import { supabase } from '../../../config/supabase';

export const SupplierPaymentModel = {
    getAll: async (companyId?: string) => {
        let query = supabase.from('supplier_payments').select(`
            *,
            supplier_master!supplier_id(supplier_name, supplier_code)
        `);
        if (companyId) {
            query = query.eq('company_id', companyId);
        }
        const { data, error } = await query.order('payment_date', { ascending: false });
        if (error) throw new Error(error.message);
        return data || [];
    },

    getById: async (id: string) => {
        const { data, error } = await supabase
            .from('supplier_payments')
            .select(`
                *,
                supplier_master!supplier_id(*)
            `)
            .eq('id', id)
            .single();
        if (error) throw new Error(error.message);
        return data;
    },

    create: async (paymentData: any) => {
        const { allocations, ...paymentInfo } = paymentData;

        // 1. Create the Payment record
        const { data: payment, error: payErr } = await supabase
            .from('supplier_payments')
            .insert([paymentInfo])
            .select();

        if (payErr) throw new Error(payErr.message);

        const paymentId = payment[0].id;

        // 2. Create the Allocations if any
        if (allocations && allocations.length > 0) {
            const allocationsWithId = allocations.map((a: any) => ({
                ...a,
                payment_id: paymentId,
                company_id: paymentInfo.company_id
            }));

            const { error: allocErr } = await supabase
                .from('supplier_payment_allocations')
                .insert(allocationsWithId);

            if (allocErr) throw new Error(allocErr.message);
        }

        return payment[0];
    },

    update: async (id: string, paymentData: any) => {
        const { allocations, ...paymentInfo } = paymentData;

        const { data: record, error: payErr } = await supabase
            .from('supplier_payments')
            .update(paymentInfo)
            .eq('id', id)
            .select();

        if (payErr) throw new Error(payErr.message);

        // Update allocations (Delete old and insert new for simplicity)
        await supabase.from('supplier_payment_allocations').delete().eq('payment_id', id);

        if (allocations && allocations.length > 0) {
            const allocationsWithId = allocations.map((a: any) => ({
                ...a,
                payment_id: id,
                company_id: paymentInfo.company_id
            }));
            await supabase.from('supplier_payment_allocations').insert(allocationsWithId);
        }

        return record[0];
    },

    delete: async (id: string) => {
        const { error } = await supabase.from('supplier_payments').delete().eq('id', id);
        if (error) throw new Error(error.message);
        return true;
    }
};

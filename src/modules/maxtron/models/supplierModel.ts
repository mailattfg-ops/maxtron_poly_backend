import { supabase } from '../../../config/supabase';

const TABLE = 'supplier_master';
const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const nameRegex = /^[a-zA-Z0-9\s.\-&',]+$/;

export const SupplierModel = {
    getAll: async (companyId?: string) => {
        let query = supabase.from(TABLE).select(`
            id, supplier_code, supplier_name, gst_no, credit_period, credit_limit,
            product_supplied, delivery_period, delivery_mode, opening_balance, company_id,
            supplier_address_id, billing_address_id,
            office_addr_data:addresses!supplier_address_id(*),
            billing_addr_data:addresses!billing_address_id(*),
            supplied_materials:supplier_materials!supplier_id(rm_id, raw_materials(rm_name))
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
            .from(TABLE)
            .select(`
                id, supplier_code, supplier_name, gst_no, credit_period, credit_limit,
                product_supplied, delivery_period, delivery_mode, opening_balance, company_id,
                supplier_address_id, billing_address_id,
                office_addr_data:addresses!supplier_address_id(*),
                billing_addr_data:addresses!billing_address_id(*),
                supplied_materials:supplier_materials!supplier_id(rm_id, raw_materials(rm_name))
            `)
            .eq('id', id)
            .single();
        if (error) throw new Error(error.message);
        return data;
    },

    create: async (input: any) => {
        let regId = null;
        let billId = null;

        if (input.gst_no && !gstRegex.test(input.gst_no)) {
            throw new Error('Invalid GST number format. Must be 15 characters (e.g., 29ABCDE1234F1Z5).');
        }

        if (input.supplier_name && !nameRegex.test(input.supplier_name)) {
            throw new Error('Invalid Supplier Name. Special characters are not allowed except . - & \' ,');
        }

        if (input.supplier_address && input.supplier_address.street) {
            const { data: reg, error: regErr } = await supabase
                .from('addresses')
                .insert([{ ...input.supplier_address, address_type: 'supplier' }])
                .select()
                .single();
            if (regErr) throw new Error(regErr.message);
            regId = reg.id;
        }

        if (input.billing_address && input.billing_address.street) {
            const { data: bill, error: billErr } = await supabase
                .from('addresses')
                .insert([{ ...input.billing_address, address_type: 'billing' }])
                .select()
                .single();
            if (billErr) throw new Error(billErr.message);
            billId = bill.id;
        }

        const payload = {
            supplier_code: input.supplier_code,
            supplier_name: input.supplier_name,
            gst_no: input.gst_no === '' || !input.gst_no ? null : input.gst_no,
            credit_period: Number(input.credit_period) || 0,
            credit_limit: Number(input.credit_limit) || 0,
            product_supplied: input.product_supplied,
            delivery_period: input.delivery_period,
            delivery_mode: input.delivery_mode,
            opening_balance: Number(input.opening_balance) || 0,
            company_id: input.company_id,
            supplier_address_id: regId,
            billing_address_id: billId
        };

        const { data, error } = await supabase
            .from(TABLE)
            .insert([payload])
            .select('id, supplier_name');

        if (error) throw new Error(error.message);
        
        const newSupplierId = data[0].id;
        
        if (input.supplied_materials && Array.isArray(input.supplied_materials) && input.supplied_materials.length > 0) {
            const smPayload = input.supplied_materials.map((rm_id: string) => ({
                supplier_id: newSupplierId,
                rm_id
            }));
            const { error: smError } = await supabase.from('supplier_materials').insert(smPayload);
            if (smError) {
                throw new Error("Failed to assign materials to supplier: " + smError.message);
            }
        }

        return await SupplierModel.getById(newSupplierId);
    },

    update: async (id: string, input: any) => {
        const current = await SupplierModel.getById(id);
        let regId = current.supplier_address_id;
        let billId = current.billing_address_id;

        if (input.gst_no && !gstRegex.test(input.gst_no)) {
            throw new Error('Invalid GST number format. Must be 15 characters (e.g., 29ABCDE1234F1Z5).');
        }

        if (input.supplier_name && !nameRegex.test(input.supplier_name)) {
            throw new Error('Invalid Supplier Name. Special characters are not allowed except . - & \' ,');
        }

        if (input.supplier_address && input.supplier_address.street) {
            if (regId) {
                await supabase.from('addresses').update(input.supplier_address).eq('id', regId);
            } else {
                const { data: nR } = await supabase.from('addresses').insert([{ ...input.supplier_address, address_type: 'supplier' }]).select().single();
                regId = nR?.id;
            }
        }

        if (input.billing_address && input.billing_address.street) {
            if (billId) {
                await supabase.from('addresses').update(input.billing_address).eq('id', billId);
            } else {
                const { data: nB } = await supabase.from('addresses').insert([{ ...input.billing_address, address_type: 'billing' }]).select().single();
                billId = nB?.id;
            }
        }

        const payload = {
            supplier_code: input.supplier_code,
            supplier_name: input.supplier_name,
            gst_no: input.gst_no === '' || !input.gst_no ? null : input.gst_no,
            credit_period: Number(input.credit_period) || 0,
            credit_limit: Number(input.credit_limit) || 0,
            product_supplied: input.product_supplied,
            delivery_period: input.delivery_period,
            delivery_mode: input.delivery_mode,
            opening_balance: Number(input.opening_balance) || 0,
            company_id: input.company_id,
            supplier_address_id: regId,
            billing_address_id: billId
        };

        const { data, error } = await supabase
            .from(TABLE)
            .update(payload)
            .eq('id', id)
            .select(`
                id, supplier_code, supplier_name, gst_no, credit_period, credit_limit,
                product_supplied, delivery_period, delivery_mode, opening_balance, company_id,
                supplier_address_id, billing_address_id,
                office_addr_data:addresses!supplier_address_id(*),
                billing_addr_data:addresses!billing_address_id(*),
                supplied_materials:supplier_materials!supplier_id(rm_id, raw_materials(rm_name))
            `)
            .single();

        if (error) throw new Error(error.message);

        if (input.supplied_materials !== undefined && Array.isArray(input.supplied_materials)) {
            // Delete old ones first
            const { error: delError } = await supabase.from('supplier_materials').delete().eq('supplier_id', id);
            if (delError) console.error("Error deleting old supplier materials:", delError);
            
            if (input.supplied_materials.length > 0) {
                const smPayload = input.supplied_materials.map((rm_id: string) => ({
                    supplier_id: id,
                    rm_id
                }));
                const { error: smError } = await supabase.from('supplier_materials').insert(smPayload);
                if (smError) {
                    console.error("Error updating supplier materials:", smError);
                    throw new Error("Failed to update assigned materials: " + smError.message);
                }
            }
        }

        // Fetch again to get the absolute latest state including the updated materials
        return await SupplierModel.getById(id);
    },

    delete: async (id: string) => {
        const { error } = await supabase.from(TABLE).delete().eq('id', id);
        if (error) throw new Error(error.message);
        return true;
    }
};

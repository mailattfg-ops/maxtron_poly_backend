import { supabase } from '../../../config/supabase';

export const RMTypeCodeModel = {
    getAll: async (companyId?: string) => {
        let query = supabase.from('rm_type_codes').select('*');
        if (companyId) query = query.eq('company_id', companyId);
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw new Error(error.message);
        return data || [];
    },

    getById: async (id: string) => {
        const { data, error } = await supabase
            .from('rm_type_codes')
            .select('*')
            .eq('id', id)
            .single();
        if (error) throw new Error(error.message);
        return data;
    },

    create: async (data: any) => {
        const { data: newItem, error } = await supabase
            .from('rm_type_codes')
            .insert([data])
            .select();
        if (error) throw new Error(error.message);
        return newItem[0];
    },

    update: async (id: string, data: any) => {
        const { data: updatedItem, error } = await supabase
            .from('rm_type_codes')
            .update(data)
            .eq('id', id)
            .select();
        if (error) throw new Error(error.message);
        return updatedItem[0];
    },

    delete: async (id: string) => {
        const { error } = await supabase.from('rm_type_codes').delete().eq('id', id);
        if (error) throw new Error(error.message);
        return true;
    }
};

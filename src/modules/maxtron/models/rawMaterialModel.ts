import { supabase } from '../../../config/supabase';

export const RawMaterialModel = {
    getAll: async (companyId?: string) => {
        let query = supabase.from('raw_materials').select('*');
        if (companyId) {
            query = query.eq('company_id', companyId);
        }
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw new Error(error.message);
        return data || [];
    },

    getById: async (id: string) => {
        const { data, error } = await supabase
            .from('raw_materials')
            .select('*')
            .eq('id', id)
            .single();
        if (error) throw new Error(error.message);
        return data;
    },

    create: async (rmData: any) => {
        const { data, error } = await supabase
            .from('raw_materials')
            .insert([rmData])
            .select();

        if (error) throw new Error(error.message);
        return data[0];
    },

    update: async (id: string, rmData: any) => {
        const { data, error } = await supabase
            .from('raw_materials')
            .update(rmData)
            .eq('id', id)
            .select();

        if (error) throw new Error(error.message);
        return data[0];
    },

    delete: async (id: string) => {
        const { error } = await supabase.from('raw_materials').delete().eq('id', id);
        if (error) throw new Error(error.message);
        return true;
    }
};

import { supabase } from '../../../config/supabase';

export const PettyCashModel = {
    getAll: async (companyId?: string) => {
        let query = supabase.from('petty_cash').select(`*`);
        if (companyId) {
            query = query.eq('company_id', companyId);
        }
        const { data, error } = await query.order('date', { ascending: false });
        if (error) throw new Error(error.message);
        return data || [];
    },

    getById: async (id: string) => {
        const { data, error } = await supabase
            .from('petty_cash')
            .select(`*`)
            .eq('id', id)
            .single();
        if (error) throw new Error(error.message);
        return data;
    },

    create: async (data: any) => {
        const { data: result, error } = await supabase
            .from('petty_cash')
            .insert([data])
            .select();
        if (error) throw new Error(error.message);
        return result[0];
    },

    update: async (id: string, data: any) => {
        const { data: result, error } = await supabase
            .from('petty_cash')
            .update(data)
            .eq('id', id)
            .select();
        if (error) throw new Error(error.message);
        return result[0];
    },

    delete: async (id: string) => {
        const { error } = await supabase.from('petty_cash').delete().eq('id', id);
        if (error) throw new Error(error.message);
        return true;
    }
};

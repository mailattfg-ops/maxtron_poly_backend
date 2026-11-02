import { supabase } from '../../../config/supabase';

export const VehicleModel = {
    getAll: async (companyId?: string) => {
        let query = supabase.from('vehicles').select('*');
        if (companyId) {
            query = query.eq('company_id', companyId);
        }
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw new Error(error.message);
        return data || [];
    },

    getById: async (id: string) => {
        const { data, error } = await supabase
            .from('vehicles')
            .select('*')
            .eq('id', id)
            .single();
        if (error) throw new Error(error.message);
        return data;
    },

    create: async (vehicleData: any) => {
        const { data, error } = await supabase
            .from('vehicles')
            .insert([vehicleData])
            .select();

        if (error) throw new Error(error.message);
        return data[0];
    },

    update: async (id: string, vehicleData: any) => {
        const { data, error } = await supabase
            .from('vehicles')
            .update(vehicleData)
            .eq('id', id)
            .select();

        if (error) throw new Error(error.message);
        return data[0];
    },

    delete: async (id: string) => {
        const { error } = await supabase.from('vehicles').delete().eq('id', id);
        if (error) throw new Error(error.message);
        return true;
    }
};

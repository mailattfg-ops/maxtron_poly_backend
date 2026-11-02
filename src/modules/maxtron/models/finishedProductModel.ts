import { supabase } from '../../../config/supabase';

export interface FinishedProduct {
    id?: string;
    product_code: string;
    product_name: string;
    color?: string;
    thickness_microns?: number;
    size?: string;
    avg_count_per_kg?: number;
    company_id: string;
    description?: string;
    stock_threshold?: number;
    hsn_code?: string;
    opening_stock?: number;
    category?: string;
    created_at?: string;
    updated_at?: string;
}

export const FinishedProductModel = {
    getAll: async (companyId?: string, category?: string): Promise<FinishedProduct[]> => {
        let query = supabase.from('finished_products').select('*');
        if (companyId) {
            query = query.eq('company_id', companyId);
        }
        if (category) {
            query = query.eq('category', category);
        }
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw new Error(error.message);
        return data || [];
    },

    getById: async (id: string): Promise<FinishedProduct | null> => {
        const { data, error } = await supabase
            .from('finished_products')
            .select('*')
            .eq('id', id)
            .single();
        if (error && error.code !== 'PGRST116') throw new Error(error.message);
        return data || null;
    },

    create: async (productData: FinishedProduct): Promise<FinishedProduct> => {
        const { data, error } = await supabase
            .from('finished_products')
            .insert([productData])
            .select()
            .single();
        if (error) throw new Error(error.message);
        return data;
    },

    update: async (id: string, updates: Partial<FinishedProduct>): Promise<FinishedProduct> => {
        const { data, error } = await supabase
            .from('finished_products')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error) throw new Error(error.message);
        return data;
    },

    delete: async (id: string): Promise<boolean> => {
        const { error } = await supabase.from('finished_products').delete().eq('id', id);
        if (error) throw new Error(error.message);
        return true;
    }
};

import { supabase } from '../../../config/supabase';

export interface InventoryItem {
    id: string; // Used by Supabase UUID
    name: string;
    sku: string;
    quantity: number;
    category: string;
    price: number;
    created_at?: string;
}

export const InventoryModel = {
    getAll: async (): Promise<InventoryItem[]> => {
        const { data, error } = await supabase
            .from('inventory')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw new Error(error.message);
        return data || [];
    },

    getById: async (id: string): Promise<InventoryItem | undefined> => {
        const { data, error } = await supabase.from('inventory').select('*').eq('id', id).single();
        if (error && error.code !== 'PGRST116') throw new Error(error.message);
        return data || undefined;
    },

    create: async (item: Omit<InventoryItem, 'id' | 'created_at'>): Promise<InventoryItem> => {
        const { data, error } = await supabase.from('inventory').insert([item]).select().single();
        if (error) throw new Error(error.message);
        return data;
    },

    update: async (id: string, updates: Partial<InventoryItem>): Promise<InventoryItem | null> => {
        const { data, error } = await supabase.from('inventory').update(updates).eq('id', id).select().single();
        if (error) throw new Error(error.message);
        return data || null;
    },

    delete: async (id: string): Promise<boolean> => {
        const { error } = await supabase.from('inventory').delete().eq('id', id);
        if (error) throw new Error(error.message);
        return true; // Return true on success
    }
};

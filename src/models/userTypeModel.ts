import { supabase } from '../config/supabase';

export interface UserType {
    id: string; // uuid (Primary Key)
    name: string; // e.g., 'admin', 'hr', 'sales' (Unique)
    description?: string;
}

export const UserTypeModel = {
    // Fetch all user types
    getAll: async (): Promise<UserType[]> => {
        const { data, error } = await supabase
            .from('user_types')
            .select('*')
            .order('id', { ascending: false });
        if (error) throw new Error(error.message);
        return data || [];
    },

    // Fetch a specific user type by its name
    getByName: async (name: string): Promise<UserType | undefined> => {
        const { data, error } = await supabase.from('user_types').select('*').eq('name', name).single();
        if (error && error.code !== 'PGRST116') throw new Error(error.message);
        return data || undefined;
    },

    // Create a new user type
    create: async (userType: Omit<UserType, 'id'>): Promise<UserType> => {
        const { data, error } = await supabase.from('user_types').insert([userType]).select().single();
        if (error) throw new Error(error.message);
        return data;
    }
};

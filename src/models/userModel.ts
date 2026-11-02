import { supabase } from '../config/supabase';

export interface User {
    id: string; // uuid
    type: string; // UUID from user_types
    employee_code: string;
    name: string;
    designation?: string | null;
    username: string; // email used for login
    password?: string; // stored hashed passwords preferably
    address?: string | null;
    date_of_birth?: string | null;
    guarantor_name?: string | null;
    is_married?: boolean;
    phone?: string | null;
    aadhaar?: string | null;
    category_id?: string | null;
    basic_salary?: number;
    company_id?: string | null;
    is_deleted?: boolean;
    bank_account_no?: string | null;
    bank_ifsc?: string | null;
    bank_branch?: string | null;
    bank_account_type?: string | null;
    bank_name?: string | null;
    branch_id?: string | null;
    branch_ids?: string[] | null;
    is_all_branches?: boolean;
    date_of_joining?: string | null;
    relieving_date?: string | null;
    created_at?: string;
}

export const UserModel = {
    // Check the connection / get all users
    getAll: async (): Promise<User[]> => {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('is_deleted', false)
            .order('created_at', { ascending: false });
        if (error) throw new Error(error.message);
        return data || [];
    },

    // Get user by username (for login)
    getByUsername: async (username: string): Promise<User | undefined> => {
        const { data, error } = await supabase.from('users').select('*').eq('username', username).eq('is_deleted', false).single();
        if (error && error.code !== 'PGRST116') throw new Error(error.message); // PGRST116 means 0 rows returned
        return data || undefined;
    },

    // Create a new user
    create: async (user: Omit<User, 'id' | 'created_at'>): Promise<User> => {
        const { data, error } = await supabase.from('users').insert([user]).select().single();
        if (error) throw new Error(error.message);
        return data;
    }
};

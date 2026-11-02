import { supabase } from '../../../config/supabase';

export const AnnouncementModel = {
    getAll: async (tenant: 'maxtron' | 'keil') => {
        const { data, error } = await supabase
            .from('announcements')
            .select(`
                *,
                users(name, username)
            `)
            .eq('tenant', tenant)
            .eq('active', true)
            .order('created_at', { ascending: false });

        if (error) throw new Error(error.message);
        return data || [];
    },

    create: async (announcementData: any) => {
        const { data, error } = await supabase
            .from('announcements')
            .insert([announcementData])
            .select();

        if (error) throw new Error(error.message);
        return data ? data[0] : null;
    },

    delete: async (id: string) => {
        const { error } = await supabase
            .from('announcements')
            .update({ active: false })
            .eq('id', id);

        if (error) throw new Error(error.message);
        return true;
    }
};

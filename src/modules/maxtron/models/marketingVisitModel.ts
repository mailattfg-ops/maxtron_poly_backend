import { supabase } from '../../../config/supabase';

export const MarketingVisitModel = {
    getAll: async (companyId?: string) => {
        let query = supabase.from('marketing_visits').select(`
            *,
            users(name, employee_code, phone),
            customers(customer_name, customer_code, contact_person, mobile_no, email_id, addresses(*))
        `);
        if (companyId) {
            query = query.eq('company_id', companyId);
        }
        const { data, error } = await query
            .order('visit_date', { ascending: false })
            .order('created_at', { ascending: false });
        if (error) throw new Error(error.message);
        return data || [];
    },

    create: async (visitData: any) => {
        const { data, error } = await supabase
            .from('marketing_visits')
            .insert([visitData])
            .select();
        if (error) throw new Error(error.message);
        return data ? data[0] : null;
    },

    update: async (id: string, visitData: any) => {
        const { data, error } = await supabase
            .from('marketing_visits')
            .update(visitData)
            .eq('id', id)
            .select();
        if (error) throw new Error(error.message);
        return data ? data[0] : null;
    },

    delete: async (id: string) => {
        const { error } = await supabase
            .from('marketing_visits')
            .delete()
            .eq('id', id);
        if (error) throw new Error(error.message);
        return true;
    }
};

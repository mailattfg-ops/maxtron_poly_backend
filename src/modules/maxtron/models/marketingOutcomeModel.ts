import { supabase } from '../../../config/supabase';

export class MarketingOutcomeModel {
    static async getAll(company_id?: string) {
        let query = supabase
            .from('marketing_visit_outcomes')
            .select('*')
            .eq('is_active', true)
            .order('display_order', { ascending: true })
            .order('name', { ascending: true });

        if (company_id) {
            // Include company-specific outcomes and shared outcomes (company_id is null)
            query = query.or(`company_id.eq.${company_id},company_id.is.null`);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    }

    static async create(payload: { name: string; company_id?: string; color?: string; display_order?: number }) {
        const { data, error } = await supabase
            .from('marketing_visit_outcomes')
            .insert([{
                name: payload.name.trim(),
                company_id: payload.company_id || null,
                color: payload.color || null,
                display_order: payload.display_order ?? 0,
                is_active: true
            }])
            .select();

        if (error) throw error;
        return data ? data[0] : null;
    }

    static async update(id: string, payload: { name?: string; color?: string; display_order?: number; is_active?: boolean }) {
        const updateData: any = {
            updated_at: new Date().toISOString()
        };
        if (payload.name !== undefined) updateData.name = payload.name.trim();
        if (payload.color !== undefined) updateData.color = payload.color;
        if (payload.display_order !== undefined) updateData.display_order = payload.display_order;
        if (payload.is_active !== undefined) updateData.is_active = payload.is_active;

        const { data, error } = await supabase
            .from('marketing_visit_outcomes')
            .update(updateData)
            .eq('id', id)
            .select();

        if (error) throw error;
        return data ? data[0] : null;
    }

    static async delete(id: string) {
        // Hard delete or soft delete
        const { error } = await supabase
            .from('marketing_visit_outcomes')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    }
}

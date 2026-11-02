import { supabase } from '../../../config/supabase';

export class MarketingOfferModel {
    static async getAll(company_id?: string) {
        let query = supabase
            .from('marketing_offers')
            .select('*')
            .order('created_at', { ascending: false });

        if (company_id) {
            query = query.eq('company_id', company_id);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data;
    }

    static async getActive(company_id?: string) {
        let query = supabase
            .from('marketing_offers')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (company_id) {
            query = query.eq('company_id', company_id);
        }

        const { data, error } = await query;
        if (error) throw error;
        // Filter by date on client side or via query if needed
        const now = new Date();
        return data.filter((offer: any) => {
            const start = offer.start_date ? new Date(offer.start_date) : null;
            const end = offer.end_date ? new Date(offer.end_date) : null;
            return (!start || now >= start) && (!end || now <= end);
        });
    }

    static async create(offerData: any) {
        const { data, error } = await supabase
            .from('marketing_offers')
            .insert([offerData])
            .select();

        if (error) throw error;
        return data[0];
    }

    static async update(id: string, offerData: any) {
        const { data, error } = await supabase
            .from('marketing_offers')
            .update(offerData)
            .eq('id', id)
            .select();

        if (error) throw error;
        return data[0];
    }

    static async delete(id: string) {
        const { error } = await supabase
            .from('marketing_offers')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    }
}

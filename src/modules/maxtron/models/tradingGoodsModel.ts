import { supabase } from '../../../config/supabase';

export interface TradingGoodsInward {
    id?: string;
    company_id: string;
    inward_date: string;
    inward_number: string;
    reference_no?: string | null;
    supplier_id?: string | null;
    product_id: string;
    quantity: number;
    unit?: string;
    rate?: number;
    gst_percent?: number;
    gst_amount?: number;
    total_amount?: number;
    remarks?: string | null;
    created_by?: string | null;
    created_at?: string;
    updated_at?: string;
    finished_products?: any;
    supplier_master?: any;
}

export const TradingGoodsModel = {
    getAll: async (companyId?: string, filters?: any): Promise<TradingGoodsInward[]> => {
        let query = supabase.from('trading_goods_inward').select(`
            *,
            finished_products!product_id(id, product_name, product_code, size, color, hsn_code),
            supplier_master!supplier_id(id, supplier_name, supplier_code)
        `);

        if (companyId) {
            query = query.eq('company_id', companyId);
        }
        if (filters?.from_date) {
            query = query.gte('inward_date', filters.from_date);
        }
        if (filters?.to_date) {
            query = query.lte('inward_date', filters.to_date);
        }
        if (filters?.supplier_id) {
            query = query.eq('supplier_id', filters.supplier_id);
        }
        if (filters?.product_id) {
            query = query.eq('product_id', filters.product_id);
        }

        const { data, error } = await query.order('inward_date', { ascending: false }).order('created_at', { ascending: false });
        if (error) throw new Error(error.message);
        return data || [];
    },

    getById: async (id: string): Promise<TradingGoodsInward | null> => {
        const { data, error } = await supabase
            .from('trading_goods_inward')
            .select(`
                *,
                finished_products!product_id(id, product_name, product_code, size, color, hsn_code),
                supplier_master!supplier_id(id, supplier_name, supplier_code)
            `)
            .eq('id', id)
            .single();

        if (error && error.code !== 'PGRST116') throw new Error(error.message);
        return data || null;
    },

    create: async (inwardData: any): Promise<TradingGoodsInward> => {
        const sanitized = {
            ...inwardData,
            supplier_id: inwardData.supplier_id === '' ? null : inwardData.supplier_id,
            reference_no: inwardData.reference_no === '' ? null : inwardData.reference_no,
            remarks: inwardData.remarks === '' ? null : inwardData.remarks,
            quantity: Number(inwardData.quantity) || 0,
            rate: Number(inwardData.rate) || 0,
            gst_percent: Number(inwardData.gst_percent) || 0,
            gst_amount: Number(inwardData.gst_amount) || 0,
            total_amount: Number(inwardData.total_amount) || 0
        };

        const { data, error } = await supabase
            .from('trading_goods_inward')
            .insert([sanitized])
            .select(`
                *,
                finished_products!product_id(id, product_name, product_code, size, color, hsn_code),
                supplier_master!supplier_id(id, supplier_name, supplier_code)
            `)
            .single();

        if (error) throw new Error(error.message);
        return data;
    },

    update: async (id: string, updates: any): Promise<TradingGoodsInward> => {
        const sanitized = {
            ...updates,
            supplier_id: updates.supplier_id === '' ? null : updates.supplier_id,
            reference_no: updates.reference_no === '' ? null : updates.reference_no,
            remarks: updates.remarks === '' ? null : updates.remarks,
            updated_at: new Date().toISOString()
        };

        if (updates.quantity !== undefined) sanitized.quantity = Number(updates.quantity) || 0;
        if (updates.rate !== undefined) sanitized.rate = Number(updates.rate) || 0;
        if (updates.gst_percent !== undefined) sanitized.gst_percent = Number(updates.gst_percent) || 0;
        if (updates.gst_amount !== undefined) sanitized.gst_amount = Number(updates.gst_amount) || 0;
        if (updates.total_amount !== undefined) sanitized.total_amount = Number(updates.total_amount) || 0;

        const { data, error } = await supabase
            .from('trading_goods_inward')
            .update(sanitized)
            .eq('id', id)
            .select(`
                *,
                finished_products!product_id(id, product_name, product_code, size, color, hsn_code),
                supplier_master!supplier_id(id, supplier_name, supplier_code)
            `)
            .single();

        if (error) throw new Error(error.message);
        return data;
    },

    delete: async (id: string): Promise<boolean> => {
        const { error } = await supabase.from('trading_goods_inward').delete().eq('id', id);
        if (error) throw new Error(error.message);
        return true;
    },

    getNextInwardNumber: async (companyId?: string): Promise<string> => {
        const year = new Date().getFullYear();
        // Exact row count only (no rows sent): fetching the rows stopped counting at 1000.
        let query = supabase.from('trading_goods_inward').select('*', { count: 'exact', head: true });
        if (companyId) query = query.eq('company_id', companyId);

        const { count: rows, error } = await query;
        if (error) return `TRD-${year}-0001`;

        const count = (rows || 0) + 1;
        return `TRD-${year}-${String(count).padStart(4, '0')}`;
    }
};

import { supabase } from '../../../config/supabase';

/**
 * Per-item movement totals, summed in the database by stock_totals()
 * (migrations/perf_indexes_and_functions.sql). Summing every movement row here
 * was slow and stopped at Supabase's 1000-row cap, so balances went wrong.
 * No companyId = all companies, as before.
 */
const fetchTotals = async (companyId: string | undefined, kinds: string[]) => {
    const { data, error } = await supabase.rpc('stock_totals', { p_company: companyId || null, p_kinds: kinds });
    if (error) throw new Error(error.message);
    const totals = (data || {}) as Record<string, Record<string, number>>;
    return (kind: string, id: string) => Number(totals[kind]?.[id] || 0);
};

export const StockModel = {
    getRMStockSummary: async (companyId?: string) => {
        let matQuery = supabase.from('raw_materials').select('*');
        if (companyId) matQuery = matQuery.eq('company_id', companyId);

        const [{ data: materials, error: matErr }, total] = await Promise.all([
            matQuery,
            fetchTotals(companyId, ['rm_purchased', 'rm_consumed', 'rm_returned'])
        ]);
        if (matErr) throw new Error(matErr.message);

        // Returns: approved, dispatched or credited only (filtered in stock_totals).
        return (materials || []).map(m => {
            const purchased = total('rm_purchased', m.id) + Number(m.opening_stock || 0);
            const consumed = total('rm_consumed', m.id);
            const returned = total('rm_returned', m.id);
            return {
                ...m,
                purchased,
                consumed,
                returned,
                balance: purchased - consumed - returned
            };
        });
    },

    getFGStockSummary: async (companyId?: string) => {
        let prodQuery = supabase.from('finished_products').select('*').order('created_at', { ascending: false });
        if (companyId) prodQuery = prodQuery.eq('company_id', companyId);

        const [{ data: products, error: prodErr }, total] = await Promise.all([
            prodQuery,
            fetchTotals(companyId, ['fg_produced', 'fg_trading', 'fg_sold'])
        ]);
        if (prodErr) throw new Error(prodErr.message);

        return (products || []).map(p => {
            // Production ONLY from secondary stage (Cutting & Sealing)
            const produced = total('fg_produced', p.id);
            const tradingInward = total('fg_trading', p.id);
            const sold = total('fg_sold', p.id);
            const openingStock = Number(p.opening_stock || 0);
            return {
                ...p,
                produced,
                trading_inward: tradingInward,
                sold,
                balance: openingStock + produced + tradingInward - sold
            };
        });
    },

    getSFGStockSummary: async (companyId?: string) => {
        let prodQuery = supabase.from('finished_products').select('*').order('created_at', { ascending: false });
        if (companyId) prodQuery = prodQuery.eq('company_id', companyId);

        const [{ data: products, error: prodErr }, total] = await Promise.all([
            prodQuery,
            fetchTotals(companyId, ['sfg_produced', 'sfg_consumed'])
        ]);
        if (prodErr) throw new Error(prodErr.message);

        // Produced = extrusion output per roll; consumed = cutting input charged to
        // the roll that was cut (batch_item_id), not to the batch's first product.
        return (products || []).map(p => {
            const produced = total('sfg_produced', p.id);
            const consumed = total('sfg_consumed', p.id);
            return {
                ...p,
                produced,
                consumed,
                balance: produced - consumed
            };
        });
    }
};

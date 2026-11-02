import { supabase } from '../../../config/supabase';

export const CustomerCollectionModel = {
    getAll: async (companyId?: string) => {
        let query = supabase.from('customer_collections').select(`
            *,
            customers!customer_id(customer_name, customer_code)
        `);
        if (companyId) {
            query = query.eq('company_id', companyId);
        }
        const { data, error } = await query.order('collection_date', { ascending: false });
        if (error) throw new Error(error.message);
        return data || [];
    },

    getById: async (id: string) => {
        const { data, error } = await supabase
            .from('customer_collections')
            .select(`
                *,
                customers!customer_id(*)
            `)
            .eq('id', id)
            .single();
        if (error) throw new Error(error.message);
        return data;
    },

    create: async (collectionData: any) => {
        const { allocations, ...collectionInfo } = collectionData;

        // 1. Create the Collection record
        const { data: collection, error: collErr } = await supabase
            .from('customer_collections')
            .insert([collectionInfo])
            .select();

        if (collErr) throw new Error(collErr.message);

        const collectionId = collection[0].id;

        // 2. Create the Allocations if any
        if (allocations && allocations.length > 0) {
            const allocationsWithId = allocations.map((a: any) => ({
                ...a,
                collection_id: collectionId,
                company_id: collectionInfo.company_id
            }));

            const { error: allocErr } = await supabase
                .from('customer_collection_allocations')
                .insert(allocationsWithId);

            if (allocErr) throw new Error(allocErr.message);
        }

        return collection[0];
    },

    update: async (id: string, collectionData: any) => {
        const { allocations, ...collectionInfo } = collectionData;

        const { data: record, error: collErr } = await supabase
            .from('customer_collections')
            .update(collectionInfo)
            .eq('id', id)
            .select();

        if (collErr) throw new Error(collErr.message);

        // Update allocations (Delete old and insert new)
        await supabase.from('customer_collection_allocations').delete().eq('collection_id', id);

        if (allocations && allocations.length > 0) {
            const allocationsWithId = allocations.map((a: any) => ({
                ...a,
                collection_id: id,
                company_id: collectionInfo.company_id
            }));
            await supabase.from('customer_collection_allocations').insert(allocationsWithId);
        }

        return record[0];
    },

    delete: async (id: string) => {
        const { error } = await supabase.from('customer_collections').delete().eq('id', id);
        if (error) throw new Error(error.message);
        return true;
    }
};

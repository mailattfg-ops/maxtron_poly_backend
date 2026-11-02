import { supabase } from '../../../config/supabase';

export interface Company {
    id?: string;
    company_code: string;
    company_name: string;
    gst_no?: string;
    license_no?: string;
    license_details?: string;
    license_renewal_date?: string;
    pcb_authorization_no?: string;
    pcb_details?: string;
    pcb_renewal_date?: string;
    no_of_employees?: number;
    email?: string;
    phone?: string;
    website?: string;
    created_at?: string;
    addresses?: any[]; // For embedded nested relations
}

export const CompanyModel = {
    // Get all companies with their associated addresses
    getAll: async (): Promise<Company[]> => {
        const { data, error } = await supabase
            .from('companies')
            .select(`
                *,
                addresses(*)
            `)
            .order('created_at', { ascending: false });

        if (error) throw new Error(error.message);
        return data || [];
    },

    // Get single company by ID
    getById: async (id: string): Promise<Company | null> => {
        const { data, error } = await supabase
            .from('companies')
            .select(`
                *,
                addresses(*)
            `)
            .eq('id', id)
            .single();

        if (error && error.code !== 'PGRST116') throw new Error(error.message);
        return data || null;
    },

    // Create a new company
    create: async (companyData: Partial<Company>): Promise<Company> => {
        // Intercept addresses array mapping
        const { addresses, ...dataToInsert } = companyData;

        // 1. Insert Core Company
        const { data: company, error } = await supabase
            .from('companies')
            .insert([dataToInsert])
            .select()
            .single();

        if (error) throw new Error(error.message);

        // 2. Insert Nested Addresses
        if (addresses && addresses.length > 0) {
            const mappedAddresses = addresses.map((addr: any) => ({
                ...addr,
                company_id: company.id
            }));

            const { error: mapError } = await supabase.from('addresses').insert(mappedAddresses);
            if (mapError) {
                // Rollback if addresses insertion failed
                await supabase.from('companies').delete().eq('id', company.id);
                throw new Error("Failed to map company addresses: " + mapError.message);
            }
        }

        return company;
    },

    // Update existing company
    update: async (id: string, updates: Partial<Company>): Promise<Company | null> => {
        const { addresses, ...dataToUpdate } = updates;

        // Update core info
        const { data: company, error } = await supabase
            .from('companies')
            .update(dataToUpdate)
            .eq('id', id)
            .select()
            .single();

        if (error) throw new Error(error.message);

        // Sync Addresses (Replace strategy)
        if (addresses !== undefined) {
            // Wipe all polymorphic addresses that belong to this particular company securely
            await supabase.from('addresses').delete().eq('company_id', id);

            // Re-insert new
            if (addresses.length > 0) {
                const mappedAddresses = addresses.map((addr: any) => ({
                    ...addr,
                    company_id: id
                }));
                await supabase.from('addresses').insert(mappedAddresses);
            }
        }

        return company || null;
    },

    // Delete a company
    delete: async (id: string): Promise<boolean> => {
        // Dependencies clean up via cascade
        const { error } = await supabase.from('companies').delete().eq('id', id);
        if (error) throw new Error(error.message);
        return true;
    }
};

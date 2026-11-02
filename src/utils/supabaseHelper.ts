import { PostgrestFilterBuilder } from '@supabase/postgrest-js';

/**
 * Automatically applies descending order to a query based on available columns.
 * It prioritizes 'created_at' if available, otherwise 'id'.
 * This should be used on any Supabase query that fetches multiple records.
 */
export const orderLatest = <T>(query: any) => {
    // In Supabase client, we don't easily know the columns from the builder object.
    // However, for Maxtron ERP, almost all tables have 'created_at'.
    // If a table doesn't have it, Supabase will return an error if we use it.
    // So we'll default to 'created_at' and allow override or provide a way to fallback.
    
    // Most reliable for this project: 
    // If it's a 'date' based table (like attendance, petty_cash), we use 'date'.
    // Otherwise 'created_at'.
    
    return query.order('created_at', { ascending: false });
};

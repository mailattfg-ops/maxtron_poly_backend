import { supabase } from '../config/supabase';

/**
 * Script to prevent Supabase project from pausing due to inactivity.
 * It performs a simple query on the 'company' table.
 */
async function keepAlive() {
    console.log(`[${new Date().toISOString()}] Starting Supabase keep-alive check...`);

    try {
        // Query a small table to ensure database activity
        const { data, error } = await supabase.from('companies').select('id').limit(1);

        if (error) {
            console.error('❌ Error pinging Supabase:', error.message);
            process.exit(1);
        }

        console.log('✅ Supabase is active. Ping successful.');
        console.log('Data returned:', data);
        process.exit(0);
    } catch (err: any) {
        console.error('❌ Unexpected error during keep-alive:', err.message);
        process.exit(1);
    }
}

keepAlive();

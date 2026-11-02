import dns from "dns";
dns.setDefaultResultOrder("ipv4first");
import { supabase } from '../config/supabase';

async function run() {
    console.log("Verifying Supabase JS Client (PostgREST) access to 'users' table...");
    try {
        const { data, error } = await supabase
            .from('users')
            .select('id, name, username')
            .eq('username', 'admin@maxtron.com')
            .single();

        if (error) {
            console.error("❌ Error fetching user via client:", error);
        } else {
            console.log("✅ Success! Fetched user details via JS client:", data);
        }
    } catch (err: any) {
        console.error("❌ Exception caught:", err);
    }
}

run();

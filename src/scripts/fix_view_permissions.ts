import dns from "dns";
dns.setDefaultResultOrder("ipv4first");
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const DB_URL = process.env.SUPABASE_DB_URL;

async function run() {
    if (!DB_URL) {
        console.error("❌ No SUPABASE_DB_URL in .env!");
        return;
    }
    const pool = new Pool({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });
    const client = await pool.connect();
    try {
        console.log("🔍 Checking view v_sales_invoice_balances...");
        const viewCheck = await client.query(`
            SELECT table_name 
            FROM information_schema.views 
            WHERE table_schema = 'public' AND table_name = 'v_sales_invoice_balances';
        `);
        
        if (viewCheck.rows.length === 0) {
            console.log("⚠️ View v_sales_invoice_balances does not exist in information_schema.views! Let's check all views.");
            const allViews = await client.query(`
                SELECT table_name 
                FROM information_schema.views 
                WHERE table_schema = 'public';
            `);
            console.log("All views in public schema:", allViews.rows);
        } else {
            console.log("✅ View v_sales_invoice_balances found!");
        }

        console.log("⚙️ Granting SELECT on public.v_sales_invoice_balances and v_purchase_entry_balances to public roles...");
        await client.query(`
            GRANT SELECT ON public.v_sales_invoice_balances TO anon, authenticated, service_role;
            GRANT SELECT ON public.v_purchase_entry_balances TO anon, authenticated, service_role;
        `);
        console.log("✅ View permissions granted successfully!");

        console.log("🔄 Refreshing PostgREST schema cache...");
        await client.query("NOTIFY pgrst, 'reload schema';");
        console.log("🎉 Database view fix completed successfully!");
    } catch (err: any) {
        console.error("❌ Error running view fix script:", err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

run();

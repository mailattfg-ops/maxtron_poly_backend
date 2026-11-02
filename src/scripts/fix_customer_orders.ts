import dns from "dns";
dns.setDefaultResultOrder("ipv4first");
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const DB_URL = process.env.SUPABASE_DB_URL;

async function fixCustomerOrders() {
    if (!DB_URL) {
        console.error("❌ No SUPABASE_DB_URL in .env!");
        return;
    }

    console.log(`🔗 Connecting to database: ${DB_URL}`);
    const pool = new Pool({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });
    const client = await pool.connect();

    try {
        console.log("⚙️ Altering customer_orders table...");
        await client.query(`
            ALTER TABLE customer_orders 
                ADD COLUMN IF NOT EXISTS section_type VARCHAR(50) DEFAULT 'customer order',
                ADD COLUMN IF NOT EXISTS round_off NUMERIC(15, 2) DEFAULT 0,
                ADD COLUMN IF NOT EXISTS is_round_off BOOLEAN DEFAULT FALSE;
        `);
        console.log("✅ Column modifications successful!");

        console.log("🔄 Refreshing PostgREST schema cache...");
        await client.query("NOTIFY pgrst, 'reload schema';");
        
        console.log("🎉 Database fix completed successfully!");

    } catch (err: any) {
        console.error("❌ Error fixing database:", err);
    } finally {
        client.release();
        await pool.end();
    }
}

fixCustomerOrders();

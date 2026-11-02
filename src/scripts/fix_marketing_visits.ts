import dns from "dns";
dns.setDefaultResultOrder("ipv4first");
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const DB_URL = process.env.SUPABASE_DB_URL;

async function fixMarketingVisits() {
    if (!DB_URL) {
        console.error("❌ No SUPABASE_DB_URL in .env!");
        return;
    }

    console.log(`🔗 Connecting to database: ${DB_URL}`);
    const pool = new Pool({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });
    const client = await pool.connect();

    try {
        console.log("⚙️ Altering marketing_visits table...");
        await client.query(`
            ALTER TABLE marketing_visits 
                ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
                ADD COLUMN IF NOT EXISTS feedback TEXT,
                ADD COLUMN IF NOT EXISTS is_quotation BOOLEAN DEFAULT FALSE,
                ADD COLUMN IF NOT EXISTS quotation_items JSONB DEFAULT '[]'::jsonb,
                ADD COLUMN IF NOT EXISTS quotation_delivery_date DATE,
                ADD COLUMN IF NOT EXISTS quotation_status VARCHAR(50) DEFAULT 'Pending',
                ADD COLUMN IF NOT EXISTS probability VARCHAR(20) DEFAULT NULL;
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

fixMarketingVisits();

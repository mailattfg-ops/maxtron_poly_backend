import 'dotenv/config';
import dns from "dns";
dns.setDefaultResultOrder("ipv4first");
import { Pool } from 'pg';

const DB_URL = process.env.SUPABASE_DB_URL as string;
if (!process.env.SUPABASE_DB_URL) throw new Error('SUPABASE_DB_URL must be set in .env');

async function addExternalInvoiceFields() {
    console.log(`🔗 Connecting to Supabase pooler...`);
    const pool = new Pool({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });
    const client = await pool.connect();

    try {
        console.log("⚙️ Adding external invoice columns to sales_invoices table...");
        
        await client.query(`
            ALTER TABLE sales_invoices 
                ADD COLUMN IF NOT EXISTS is_external BOOLEAN DEFAULT false,
                ADD COLUMN IF NOT EXISTS billing_software VARCHAR(100) DEFAULT NULL,
                ADD COLUMN IF NOT EXISTS bill_document_url TEXT DEFAULT NULL,
                ADD COLUMN IF NOT EXISTS bill_document_name VARCHAR(255) DEFAULT NULL;
        `);
        console.log("✅ Added external invoice columns to sales_invoices!");

        console.log("🔄 Refreshing PostgREST schema cache...");
        await client.query("NOTIFY pgrst, 'reload schema';");
        
        console.log("🎉 Database schema update completed successfully!");

        const res = await client.query(`
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = 'sales_invoices'
          AND column_name IN ('is_external', 'billing_software', 'bill_document_url', 'bill_document_name');
        `);
        console.log('📋 Verified added columns:', res.rows);

    } catch (err: any) {
        console.error("❌ Error adding columns:", err);
    } finally {
        client.release();
        await pool.end();
    }
}

addExternalInvoiceFields();

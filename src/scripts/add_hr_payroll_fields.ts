import dns from "dns";
dns.setDefaultResultOrder("ipv4first");
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// In URL connection strings, '@' in password must be percent-encoded as %40
const rawUrl = process.env.SUPABASE_DB_URL || '';
const fixedUrl = rawUrl; // password in SUPABASE_DB_URL must already be URL-encoded
const POOLER_URL = process.env.SUPABASE_DB_URL as string;
if (!process.env.SUPABASE_DB_URL) throw new Error('SUPABASE_DB_URL must be set in .env');

async function tryConnect(connStr: string) {
    const pool = new Pool({ connectionString: connStr, ssl: { rejectUnauthorized: false } });
    const client = await pool.connect();
    return { pool, client };
}

async function addHrPayrollFields() {
    let client: any;
    let pool: any;

    try {
        console.log("🔗 Trying URL with encoded password...");
        const res = await tryConnect(fixedUrl);
        pool = res.pool;
        client = res.client;
    } catch (err: any) {
        console.log("⚠️ Direct URL failed:", err.message, "Trying pooler URL...");
        const res = await tryConnect(POOLER_URL);
        pool = res.pool;
        client = res.client;
    }

    try {
        console.log("⚙️ Adding date_of_joining and relieving_date columns to users table...");
        await client.query(`
            ALTER TABLE users 
                ADD COLUMN IF NOT EXISTS date_of_joining DATE DEFAULT NULL,
                ADD COLUMN IF NOT EXISTS relieving_date DATE DEFAULT NULL;
        `);
        console.log("✅ Added date_of_joining & relieving_date to users!");

        console.log("⚙️ Adding no_of_duties column to employee_payroll table...");
        await client.query(`
            ALTER TABLE employee_payroll 
                ADD COLUMN IF NOT EXISTS no_of_duties NUMERIC DEFAULT 0;
        `);
        console.log("✅ Added no_of_duties to employee_payroll!");

        console.log("🔄 Refreshing PostgREST schema cache...");
        await client.query("NOTIFY pgrst, 'reload schema';");
        
        console.log("🎉 Database schema update completed successfully!");

    } catch (err: any) {
        console.error("❌ Error adding columns:", err);
    } finally {
        if (client) client.release();
        if (pool) await pool.end();
    }
}

addHrPayrollFields();

import dns from "dns";
dns.setDefaultResultOrder("ipv4first");
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const DB_URL = process.env.SUPABASE_DB_URL;

async function run() {
    if (!DB_URL) {
        console.error("No SUPABASE_DB_URL!");
        return;
    }
    const pool = new Pool({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });
    const client = await pool.connect();
    try {
        const res = await client.query("SELECT * FROM v_sales_invoice_balances LIMIT 1;");
        console.log("Columns & data in v_sales_invoice_balances:", res.rows[0]);
    } catch (err: any) {
        console.error("Error:", err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

run();

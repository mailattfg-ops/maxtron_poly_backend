import dns from "dns";
dns.setDefaultResultOrder("ipv4first");
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const DB_URL = process.env.SUPABASE_DB_URL;

async function run() {
    if (!DB_URL) {
        console.error("No SUPABASE_DB_URL in .env!");
        return;
    }
    const pool = new Pool({ connectionString: DB_URL });
    const client = await pool.connect();
    try {
        const res = await client.query(`
            SELECT id, supplier_code, supplier_name
            FROM supplier_master
            ORDER BY supplier_code;
        `);
        console.log("Suppliers currently in DB:", res.rows);
    } catch (err: any) {
        console.error("Error:", err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

run();

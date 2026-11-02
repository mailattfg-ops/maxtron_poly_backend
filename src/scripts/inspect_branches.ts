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
        console.log("🔍 Checking keil_branches table...");
        const tableCheck = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = 'keil_branches'
            );
        `);
        
        if (tableCheck.rows[0].exists) {
            const res = await client.query("SELECT * FROM keil_branches;");
            console.log("Branches currently in DB:", res.rows);
        } else {
            console.log("❌ Table keil_branches does not exist!");
        }
    } catch (err: any) {
        console.error("Error:", err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

run();

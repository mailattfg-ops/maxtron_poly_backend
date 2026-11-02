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
        console.log("🔍 Checking FK constraints of keil_vehicle_logs...");
        const res = await client.query(`
            SELECT
                tc.constraint_name,
                kcu.column_name,
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name
            FROM
                information_schema.table_constraints AS tc
                JOIN information_schema.key_column_usage AS kcu
                  ON tc.constraint_name = kcu.constraint_name
                  AND tc.table_schema = kcu.table_schema
                JOIN information_schema.constraint_column_usage AS ccu
                  ON ccu.constraint_name = tc.constraint_name
                  AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY' 
                AND tc.table_name = 'keil_vehicle_logs'
                AND tc.table_schema = 'public';
        `);
        console.log("FK Constraints for keil_vehicle_logs:");
        res.rows.forEach(row => console.log(row));
    } catch (err: any) {
        console.error("Error:", err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

run();

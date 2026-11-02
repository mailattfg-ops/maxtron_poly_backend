import dns from "dns";
dns.setDefaultResultOrder("ipv4first");
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const DB_URL = process.env.SUPABASE_DB_URL as string;
if (!process.env.SUPABASE_DB_URL) throw new Error('SUPABASE_DB_URL must be set in .env');

async function addSheetNumberField() {
    console.log(`🔗 Connecting to database...`);
    const pool = new Pool({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });
    const client = await pool.connect();

    try {
        console.log("⚙️ Adding sheet_number column to keil_vehicle_logs table...");
        
        await client.query(`
            ALTER TABLE keil_vehicle_logs 
                ADD COLUMN IF NOT EXISTS sheet_number VARCHAR(100) DEFAULT NULL;
        `);
        console.log("✅ Added sheet_number column to keil_vehicle_logs!");

        console.log("🔄 Refreshing PostgREST schema cache...");
        await client.query("NOTIFY pgrst, 'reload schema';");
        
        console.log("🎉 Database schema update completed successfully!");

    } catch (err: any) {
        console.error("❌ Error adding column:", err);
    } finally {
        client.release();
        await pool.end();
    }
}

addSheetNumberField();

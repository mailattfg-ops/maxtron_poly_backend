import dns from "dns";
dns.setDefaultResultOrder("ipv4first");
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const DB_URL = process.env.SUPABASE_DB_URL;

async function addTelemetryFields() {
    if (!DB_URL) {
        console.error("❌ No SUPABASE_DB_URL in .env!");
        return;
    }

    console.log(`🔗 Connecting to database: ${DB_URL}`);
    const pool = new Pool({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });
    const client = await pool.connect();

    try {
        console.log("⚙️ Adding driver_name and supervisor_id columns to keil_vehicle_logs table...");
        
        await client.query(`
            ALTER TABLE keil_vehicle_logs 
                ADD COLUMN IF NOT EXISTS driver_name VARCHAR(255) DEFAULT NULL,
                ADD COLUMN IF NOT EXISTS supervisor_id UUID REFERENCES users(id) ON DELETE SET NULL;
        `);
        console.log("✅ Added driver_name and supervisor_id columns!");

        console.log("🔄 Refreshing PostgREST schema cache...");
        await client.query("NOTIFY pgrst, 'reload schema';");
        
        console.log("🎉 Database fix completed successfully!");

    } catch (err: any) {
        console.error("❌ Error adding columns:", err);
    } finally {
        client.release();
        await pool.end();
    }
}

addTelemetryFields();

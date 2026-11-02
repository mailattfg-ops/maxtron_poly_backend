import 'dotenv/config';
import dns from "dns";
dns.setDefaultResultOrder("ipv4first");
import { Pool } from 'pg';

const connectionString = process.env.SUPABASE_DB_URL as string;
if (!process.env.SUPABASE_DB_URL) throw new Error('SUPABASE_DB_URL must be set in .env');

async function main() {
  const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
  try {
    console.log("⚙️ Adding spare_picker_name column to keil_vehicle_logs...");
    await pool.query(`
      ALTER TABLE keil_vehicle_logs 
        ADD COLUMN IF NOT EXISTS spare_picker_name VARCHAR(255) DEFAULT NULL;
    `);
    console.log("✅ Added spare_picker_name to keil_vehicle_logs!");

    console.log("⚙️ Adding spare_picker_name column to keil_collection_headers...");
    await pool.query(`
      ALTER TABLE keil_collection_headers 
        ADD COLUMN IF NOT EXISTS spare_picker_name VARCHAR(255) DEFAULT NULL;
    `);
    console.log("✅ Added spare_picker_name to keil_collection_headers!");

    console.log("🔄 Reloading PostgREST schema cache...");
    await pool.query("NOTIFY pgrst, 'reload schema';");
    console.log("🎉 Migration completed successfully!");
  } catch (err: any) {
    console.error("❌ Migration error:", err.message);
  } finally {
    await pool.end();
  }
}

main();

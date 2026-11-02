import dns from "dns";
dns.setDefaultResultOrder("ipv4first");
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const connectionString = process.env.SUPABASE_DB_URL;

if (!connectionString) {
  console.error('❌ Error: SUPABASE_DB_URL is missing in your .env file.');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function runAlteration() {
  console.log('🔄 Connecting to database to apply safe ALTER TABLE migration for collection entries...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('🛠️ Adding columns to keil_collection_entries table...');
    await client.query(`
      ALTER TABLE keil_collection_entries ADD COLUMN IF NOT EXISTS collection_amount DECIMAL(12, 2) DEFAULT 0;
      ALTER TABLE keil_collection_entries ADD COLUMN IF NOT EXISTS note TEXT;
      ALTER TABLE keil_collection_entries ADD COLUMN IF NOT EXISTS remark TEXT;
      ALTER TABLE keil_collection_entries ADD COLUMN IF NOT EXISTS visit_status VARCHAR(50) DEFAULT 'Not Visited';
    `);

    console.log('🔟 Refreshing PostgREST schema cache...');
    await client.query("NOTIFY pgrst, 'reload schema';");

    await client.query('COMMIT');
    console.log('✅ Alteration successful! columns added to keil_collection_entries table.');

  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('❌ Alteration failed:', err.message);
  } finally {
    client.release();
    pool.end();
  }
}

runAlteration();

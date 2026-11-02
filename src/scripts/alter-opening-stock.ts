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
  console.log('🔄 Connecting to database to apply safe ALTER TABLE migration for opening_stock...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('🛠️ Adding column opening_stock to raw_materials table...');
    await client.query(`
      ALTER TABLE raw_materials ADD COLUMN IF NOT EXISTS opening_stock NUMERIC(15, 2) DEFAULT 0;
    `);

    console.log('🛠️ Adding column opening_stock to finished_products table...');
    await client.query(`
      ALTER TABLE finished_products ADD COLUMN IF NOT EXISTS opening_stock NUMERIC(15, 2) DEFAULT 0;
    `);

    console.log('🔟 Refreshing PostgREST schema cache...');
    await client.query("NOTIFY pgrst, 'reload schema';");

    await client.query('COMMIT');
    console.log('✅ Alteration successful! opening_stock column added to raw_materials and finished_products tables.');

  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('❌ Alteration failed:', err.message);
  } finally {
    client.release();
    pool.end();
  }
}

runAlteration();

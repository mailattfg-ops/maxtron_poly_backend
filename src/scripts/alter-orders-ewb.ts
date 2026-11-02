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
  console.log('🔄 Connecting to database to apply ALTER TABLE migration for customer_orders E-Way Bill fields...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('🛠️ Adding columns to customer_orders table...');
    await client.query(`
      ALTER TABLE customer_orders 
      ADD COLUMN IF NOT EXISTS transporter_id VARCHAR(100) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS transporter_name VARCHAR(255) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS trans_distance NUMERIC(10, 2) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS trans_mode VARCHAR(50) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS vehicle_no VARCHAR(50) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS vehicle_type VARCHAR(50) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS trans_doc_no VARCHAR(100) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS trans_doc_date DATE DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS ewb_status VARCHAR(50) DEFAULT 'PENDING',
      ADD COLUMN IF NOT EXISTS ewb_no VARCHAR(50) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS ewb_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS ewb_valid_till TIMESTAMP WITH TIME ZONE DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS ewb_error TEXT DEFAULT NULL;
    `);

    console.log('🔟 Refreshing PostgREST schema cache...');
    await client.query("NOTIFY pgrst, 'reload schema';");

    await client.query('COMMIT');
    console.log('✅ Alteration successful! E-Way Bill fields added to customer_orders table.');

  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('❌ Alteration failed:', err.message);
  } finally {
    client.release();
    pool.end();
  }
}

runAlteration();

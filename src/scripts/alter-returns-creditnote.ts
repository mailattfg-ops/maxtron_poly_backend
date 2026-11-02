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
  console.log('🔄 Connecting to database to add Credit Note columns to sales_returns...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('🛠️ Adding Credit Note columns to sales_returns table...');
    await client.query(`
      ALTER TABLE sales_returns 
      ADD COLUMN IF NOT EXISTS credit_note_irn VARCHAR(100) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS credit_note_ack_no VARCHAR(50) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS credit_note_ack_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS credit_note_signed_qr_code TEXT DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS credit_note_status VARCHAR(50) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS credit_note_error TEXT DEFAULT NULL;
    `);

    console.log('🔟 Refreshing PostgREST schema cache...');
    await client.query("NOTIFY pgrst, 'reload schema';");

    await client.query('COMMIT');
    console.log('✅ Success! Credit Note columns added to sales_returns table.');

  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('❌ Alteration failed:', err.message);
  } finally {
    client.release();
    pool.end();
  }
}

runAlteration();

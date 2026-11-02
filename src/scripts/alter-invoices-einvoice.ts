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
  console.log('🔄 Connecting to database to apply ALTER TABLE migration for sales_invoices E-Invoice fields...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('🛠️ Adding E-Invoice columns to sales_invoices table...');
    await client.query(`
      ALTER TABLE sales_invoices 
      ADD COLUMN IF NOT EXISTS einvoice_status VARCHAR(50) DEFAULT 'PENDING',
      ADD COLUMN IF NOT EXISTS einvoice_irn VARCHAR(100) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS einvoice_ack_no VARCHAR(50) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS einvoice_ack_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS einvoice_signed_invoice TEXT DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS einvoice_signed_qr_code TEXT DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS einvoice_error TEXT DEFAULT NULL;
    `);

    console.log('🔟 Refreshing PostgREST schema cache...');
    await client.query("NOTIFY pgrst, 'reload schema';");

    await client.query('COMMIT');
    console.log('✅ Alteration successful! E-Invoice columns added to sales_invoices table.');

  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('❌ Alteration failed:', err.message);
  } finally {
    client.release();
    pool.end();
  }
}

runAlteration();

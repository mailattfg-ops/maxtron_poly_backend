import dns from "dns";

dns.setDefaultResultOrder("ipv4first");
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Read from backend root .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const connectionString = process.env.SUPABASE_DB_URL;

if (!connectionString) {
  console.error('❌ Error: SUPABASE_DB_URL is missing in your .env file.');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false } // Required for Supabase connections
});

async function addBankColumns() {
  console.log('🔄 Starting target migration for employee bank columns...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('1️⃣ Adding bank columns to "users" table if they do not exist...');
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_account_no VARCHAR(100);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_ifsc VARCHAR(50);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_branch VARCHAR(150);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_account_type VARCHAR(50);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_name VARCHAR(150);
    `);

    console.log('2️⃣ Refreshing PostgREST schema cache to make new columns visible to Supabase API...');
    await client.query("NOTIFY pgrst, 'reload schema';");

    await client.query('COMMIT');
    console.log('✅ Migration successful! Bank details columns added to "users" table, and PostgREST schema reloaded.');
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err.message);
  } finally {
    client.release();
    pool.end();
  }
}

addBankColumns();

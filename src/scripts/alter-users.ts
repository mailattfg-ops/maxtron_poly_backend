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
  console.log('🔄 Connecting to database to apply safe ALTER TABLE migration...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('🛠️ Adding bank detail columns to users table...');
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_account_no VARCHAR(100);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_ifsc VARCHAR(50);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_branch VARCHAR(150);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_account_type VARCHAR(50);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_name VARCHAR(150);
    `);

    console.log('🔟 Refreshing PostgREST schema cache...');
    await client.query("NOTIFY pgrst, 'reload schema';");

    await client.query('COMMIT');
    console.log('✅ Alteration successful! Bank columns added to users table without data loss.');

  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('❌ Alteration failed:', err.message);
  } finally {
    client.release();
    pool.end();
  }
}

runAlteration();

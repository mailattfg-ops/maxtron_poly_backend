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
  console.log('🔄 Connecting to database to apply ALTER TABLE migration for employee_licenses table...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('🛠️ Adding license_number and class_of_vehicle columns to employee_licenses table...');
    await client.query(`
      ALTER TABLE employee_licenses 
      ADD COLUMN IF NOT EXISTS license_number VARCHAR(100) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS class_of_vehicle VARCHAR(100) DEFAULT NULL;
    `);

    console.log('📦 Migrating existing license_no values to license_number...');
    await client.query(`
      UPDATE employee_licenses 
      SET license_number = license_no 
      WHERE license_number IS NULL AND license_no IS NOT NULL;
    `);

    console.log('🔟 Refreshing PostgREST schema cache...');
    await client.query("NOTIFY pgrst, 'reload schema';");

    await client.query('COMMIT');
    console.log('✅ Alteration successful! columns added and PostgREST schema refreshed.');

  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('❌ Alteration failed:', err.message);
  } finally {
    client.release();
    pool.end();
  }
}

runAlteration();

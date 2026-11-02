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

async function runCheck() {
  const client = await pool.connect();

  try {
    console.log('--- COMPANIES ---');
    const compRes = await client.query("SELECT id, company_name FROM companies;");
    console.log(compRes.rows);

    console.log('--- USERS (EMPLOYEES) ---');
    const userRes = await client.query(`
      SELECT u.id, u.name, u.employee_code, u.company_id, c.company_name 
      FROM users u 
      LEFT JOIN companies c ON u.company_id = c.id
      WHERE u.is_deleted = false;
    `);
    console.log(userRes.rows);

  } catch (err: any) {
    console.error('❌ Error running check:', err.message);
  } finally {
    client.release();
    pool.end();
  }
}

runCheck();

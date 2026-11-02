import dns from "dns";
dns.setDefaultResultOrder("ipv4first");
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false }
});

async function check() {
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT 
        conname AS constraint_name, 
        contype AS constraint_type,
        pg_get_constraintdef(c.oid) AS constraint_definition
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE conrelid = 'user_types'::regclass;
    `);
    console.log("CONSTRAINTS ON user_types:");
    console.log(res.rows);

    const rows = await client.query("SELECT * FROM user_types;");
    console.log("\nROWS IN user_types:");
    console.log(rows.rows);

  } catch (err: any) {
    console.error("Error checking table:", err.message);
  } finally {
    client.release();
    pool.end();
  }
}

check();

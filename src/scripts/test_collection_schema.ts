import 'dotenv/config';
import dns from "dns";
dns.setDefaultResultOrder("ipv4first");
import { Pool } from 'pg';

const connectionString = process.env.SUPABASE_DB_URL as string;
if (!process.env.SUPABASE_DB_URL) throw new Error('SUPABASE_DB_URL must be set in .env');

async function main() {
  const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
  try {
    const res = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'keil_collection_headers' ORDER BY ordinal_position;");
    console.log("COLLECTION_COLUMNS:", JSON.stringify(res.rows));
  } catch (err: any) {
    console.error("DB_ERROR:", err.message);
  } finally {
    await pool.end();
  }
}

main();

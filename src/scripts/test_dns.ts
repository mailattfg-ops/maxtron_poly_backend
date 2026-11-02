import dns from 'dns';
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

dns.resolve4(new URL(process.env.SUPABASE_DB_URL as string).hostname, (err, addresses) => {
  console.log('IPv4 addresses:', err ? err.message : addresses);
});

dns.resolve6(new URL(process.env.SUPABASE_DB_URL as string).hostname, (err, addresses) => {
  console.log('IPv6 addresses:', err ? err.message : addresses);
});

async function run() {
  const connStr = process.env.SUPABASE_DB_URL || '';
  console.log('Connecting with SUPABASE_DB_URL...');
  const pool = new Pool({ connectionString: connStr, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 10000 });
  try {
    const client = await pool.connect();
    console.log('CONNECTED TO DB!');
    await client.query(`
      ALTER TABLE sales_invoices 
      ADD COLUMN IF NOT EXISTS is_external BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS billing_software VARCHAR(100) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS bill_document_url TEXT DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS bill_document_name VARCHAR(255) DEFAULT NULL;
    `);
    console.log('ALTER TABLE SUCCESSFUL!');
    await client.query("NOTIFY pgrst, 'reload schema';");
    client.release();
    await pool.end();
  } catch (e: any) {
    console.error('DB ERROR:', e.message);
  }
}

run();

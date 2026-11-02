import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const regions = [
  'ap-south-1',
  'ap-southeast-1',
  'ap-southeast-2',
  'ap-northeast-1',
  'eu-central-1',
  'eu-west-1',
  'eu-west-2',
  'us-east-1',
  'us-west-1',
  'us-west-2',
  'sa-east-1'
];

async function testPoolers() {
  if (!process.env.SUPABASE_DB_URL) throw new Error('SUPABASE_DB_URL must be set in .env');
  const dbUrl = new URL(process.env.SUPABASE_DB_URL);
  const dbPass = decodeURIComponent(dbUrl.password);
  
  for (const region of regions) {
    const host = `aws-0-${region}.pooler.supabase.com`;
    const user = decodeURIComponent(dbUrl.username);
    console.log(`Checking ${host}...`);
    try {
      const pool = new Pool({
        user,
        password: dbPass,
        host,
        port: 6543,
        database: 'postgres',
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 3000
      });
      const client = await pool.connect();
      console.log(`🎉 SUCCESS! Region is ${region} on host ${host}!`);
      await client.query(`
        ALTER TABLE sales_invoices 
        ADD COLUMN IF NOT EXISTS is_external BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS billing_software VARCHAR(100) DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS bill_document_url TEXT DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS bill_document_name VARCHAR(255) DEFAULT NULL;
      `);
      console.log(`✅ ALTER TABLE SUCCESSFUL!`);
      await client.query("NOTIFY pgrst, 'reload schema';");
      client.release();
      await pool.end();
      return;
    } catch (e: any) {
      if (!e.message.includes('ENOTFOUND') && !e.message.includes('timeout')) {
        console.log(`Response from ${region}: ${e.message}`);
      }
    }
  }
}

testPoolers();

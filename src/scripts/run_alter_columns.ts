import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function run() {
  const originalUrl = process.env.SUPABASE_DB_URL || '';
  const parsed = new URL(originalUrl);
  
  const poolers = [
    { host: parsed.hostname, port: Number(parsed.port) || 5432, user: decodeURIComponent(parsed.username) }
  ];

  for (const p of poolers) {
    console.log(`Testing ${p.host}:${p.port} with user ${p.user}...`);
    try {
      const pool = new Pool({
        user: p.user,
        password: parsed.password,
        host: p.host,
        port: p.port,
        database: parsed.pathname.substring(1) || 'postgres',
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 7000
      });
      const client = await pool.connect();
      console.log(`🎉 SUCCESS! Connected to ${p.host}:${p.port}`);
      await client.query(`
        ALTER TABLE sales_invoices 
        ADD COLUMN IF NOT EXISTS is_external BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS billing_software VARCHAR(100) DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS bill_document_url TEXT DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS bill_document_name VARCHAR(255) DEFAULT NULL;
      `);
      console.log(`✅ ALTER TABLE completed!`);
      await client.query("NOTIFY pgrst, 'reload schema';");
      console.log(`✅ Schema cache reloaded!`);

      // Verify columns
      const res = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'sales_invoices'
        AND column_name IN ('is_external', 'billing_software', 'bill_document_url', 'bill_document_name');
      `);
      console.log('📋 Verified added columns:', res.rows);

      client.release();
      await pool.end();
      return;
    } catch (e: any) {
      console.log(`Failed ${p.host}:${p.port} -> ${e.message}`);
    }
  }
}

run();

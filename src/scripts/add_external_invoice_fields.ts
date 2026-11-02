import dns from "dns";
dns.setDefaultResultOrder("ipv4first");
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function runMigration() {
  console.log('🔄 Applying migration for external invoice fields in sales_invoices...');
  
  const originalUrl = process.env.SUPABASE_DB_URL;
  if (!originalUrl) {
    console.error('❌ Error: SUPABASE_DB_URL is missing in your .env file.');
    process.exit(1);
  }

  // Potential hosts to try (pooler and direct)
  const candidateHosts = [
    new URL(originalUrl).hostname
  ];

  const parsedUrl = new URL(originalUrl);
  const user = parsedUrl.username;
  const password = parsedUrl.password;
  const database = parsedUrl.pathname.substring(1) || 'postgres';

  let pool: Pool | null = null;
  let connected = false;

  for (const host of candidateHosts) {
    try {
      console.log(`📡 Trying host ${host}...`);
      const testPool = new Pool({
        user,
        password: user === 'postgres' ? password : password,
        host,
        port: 5432,
        database,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 5000
      });
      const client = await testPool.connect();
      console.log(`✅ Connected successfully to ${host}!`);
      client.release();
      pool = testPool;
      connected = true;
      break;
    } catch (err: any) {
      console.log(`⚠️ Connection to ${host} failed: ${err.message}`);
    }
  }

  if (!connected || !pool) {
    // Fallback to original connectionString with fallback
    pool = new Pool({
      connectionString: originalUrl,
      ssl: { rejectUnauthorized: false }
    });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query(`
      ALTER TABLE sales_invoices 
      ADD COLUMN IF NOT EXISTS is_external BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS billing_software VARCHAR(100) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS bill_document_url TEXT DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS bill_document_name VARCHAR(255) DEFAULT NULL;
    `);

    console.log('🔟 Refreshing PostgREST schema cache...');
    await client.query("NOTIFY pgrst, 'reload schema';");

    await client.query('COMMIT');
    console.log('✅ Migration successful! External invoice columns added.');

    const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'sales_invoices'
      ORDER BY ordinal_position;
    `);
    console.log('📋 Current sales_invoices columns:', res.rows.map(r => r.column_name));

  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(err => console.error('Migration error:', err));

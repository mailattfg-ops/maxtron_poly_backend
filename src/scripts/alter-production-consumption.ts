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
  console.log('🔄 Connecting to database to apply ALTER TABLE migration for production-consumption relationship...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('🛠️ Adding batch_id column to material_consumptions table...');
    await client.query(`
      ALTER TABLE material_consumptions 
      ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES production_batches(id) ON DELETE SET NULL;
    `);

    console.log('📦 Migrating existing batch-consumption linkages...');
    const migrationResult = await client.query(`
      UPDATE material_consumptions mc
      SET batch_id = pb.id
      FROM production_batches pb
      WHERE pb.consumption_id = mc.id AND mc.batch_id IS NULL;
    `);
    console.log(`✅ Migrated ${migrationResult.rowCount} existing linkages.`);

    console.log('🔟 Refreshing PostgREST schema cache...');
    await client.query("NOTIFY pgrst, 'reload schema';");

    await client.query('COMMIT');
    console.log('✅ Alteration successful! batch_id added and existing linkages migrated.');

  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('❌ Alteration failed:', err.message);
  } finally {
    client.release();
    pool.end();
  }
}

runAlteration();

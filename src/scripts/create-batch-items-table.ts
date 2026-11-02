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
  console.log('🔄 Connecting to database to create production_batch_items table...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('🛠️ Creating production_batch_items table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS production_batch_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        batch_id UUID REFERENCES production_batches(id) ON DELETE CASCADE,
        product_id UUID REFERENCES finished_products(id) ON DELETE SET NULL,
        output_qty NUMERIC(15, 3) DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query('ALTER TABLE production_batch_items ENABLE ROW LEVEL SECURITY;');
    await client.query('DROP POLICY IF EXISTS "allow_all_batch_items" ON production_batch_items;');
    await client.query('CREATE POLICY "allow_all_batch_items" ON production_batch_items FOR ALL USING (true) WITH CHECK (true);');

    console.log('📦 Migrating existing production_batches single product_id into production_batch_items...');
    await client.query(`
      INSERT INTO production_batch_items (batch_id, product_id, output_qty)
      SELECT id, product_id, COALESCE(extrusion_output_qty, 0)
      FROM production_batches
      WHERE product_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM production_batch_items pbi WHERE pbi.batch_id = production_batches.id
      );
    `);

    console.log('🔟 Refreshing PostgREST schema cache...');
    await client.query("NOTIFY pgrst, 'reload schema';");

    await client.query('COMMIT');
    console.log('✅ Success! production_batch_items table created and existing records migrated.');

  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err.message);
  } finally {
    client.release();
    pool.end();
  }
}

runAlteration();

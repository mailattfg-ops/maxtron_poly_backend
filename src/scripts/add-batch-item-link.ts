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

/**
 * Cutting and printing consume ONE roll (a production_batch_items row), not a
 * whole batch. Until now both tables only stored batch_id, so a batch that
 * extruded two products could not say which roll was cut, and the balance
 * of each roll could not be tracked. This adds the link and backfills the
 * existing rows to the roll carrying the batch's legacy single product_id.
 */
async function runAlteration() {
  console.log('🔄 Connecting to database to link conversions/printing to batch items...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    for (const table of ['production_conversions', 'production_printing']) {
      console.log(`🛠️ Adding batch_item_id to ${table}...`);
      await client.query(`
        ALTER TABLE ${table}
          ADD COLUMN IF NOT EXISTS batch_item_id UUID REFERENCES production_batch_items(id) ON DELETE SET NULL;
      `);

      console.log(`📦 Backfilling ${table}.batch_item_id from the batch's legacy product_id...`);
      await client.query(`
        UPDATE ${table} t
        SET batch_item_id = i.id
        FROM production_batch_items i
        JOIN production_batches b ON b.id = i.batch_id
        WHERE t.batch_item_id IS NULL
          AND t.batch_id = b.id
          AND i.product_id = b.product_id;
      `);
    }

    console.log('🔟 Refreshing PostgREST schema cache...');
    await client.query("NOTIFY pgrst, 'reload schema';");

    await client.query('COMMIT');
    console.log('✅ Success! batch_item_id added and backfilled on production_conversions and production_printing.');

  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err.message);
  } finally {
    client.release();
    pool.end();
  }
}

runAlteration();

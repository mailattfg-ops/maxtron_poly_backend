import 'dotenv/config';
import { Client } from 'pg';

const poolUrl = process.env.SUPABASE_DB_URL as string;
if (!process.env.SUPABASE_DB_URL) throw new Error('SUPABASE_DB_URL must be set in .env');
const client = new Client({ connectionString: poolUrl });

async function migrate() {
  try {
    await client.connect();
    console.log("Adding wastage_qty column to production_batches...");
    await client.query("ALTER TABLE production_batches ADD COLUMN IF NOT EXISTS wastage_qty NUMERIC(10, 2) DEFAULT 0;");
    console.log("Column added successfully!");

    // Reload PostgREST schema cache
    await client.query("NOTIFY pgrst, 'reload schema';");
    console.log("PostgREST schema cache reloaded!");

    // Verify
    const res = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'production_batches' AND column_name = 'wastage_qty';");
    console.log("Verification result:", res.rows);
  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    await client.end();
  }
}

migrate();

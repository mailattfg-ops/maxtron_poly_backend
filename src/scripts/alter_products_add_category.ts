import 'dotenv/config';
import dns from "dns";
dns.setDefaultResultOrder("ipv4first");
import { Pool } from 'pg';

const connectionString = process.env.SUPABASE_DB_URL as string;
if (!process.env.SUPABASE_DB_URL) throw new Error('SUPABASE_DB_URL must be set in .env');

async function main() {
  const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
  try {
    console.log("Adding category column to finished_products...");
    await pool.query("ALTER TABLE finished_products ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'PRODUCT';");

    console.log("Updating trading products category...");
    await pool.query(`
      UPDATE finished_products 
      SET category = 'TRADING' 
      WHERE product_name ILIKE '%bin%' 
         OR product_name ILIKE '%pedal%' 
         OR product_name ILIKE '%bucket%' 
         OR product_code ILIKE '%TRD%'
         OR product_code IN ('FP-000008', 'FP-000009');
    `);

    console.log("Setting default PRODUCT category for remaining products...");
    await pool.query("UPDATE finished_products SET category = 'PRODUCT' WHERE category IS NULL;");

    console.log("Querying updated categories...");
    const counts = await pool.query("SELECT category, COUNT(*) FROM finished_products GROUP BY category;");
    console.log("PRODUCT_COUNTS_BY_CATEGORY:", counts.rows);

    const tradingItems = await pool.query("SELECT product_code, product_name, category FROM finished_products WHERE category = 'TRADING';");
    console.log("TRADING_ITEMS:", tradingItems.rows);

    console.log("Migration completed successfully!");
  } catch (err: any) {
    console.error("MIGRATION_ERROR:", err.message);
  } finally {
    await pool.end();
  }
}

main();

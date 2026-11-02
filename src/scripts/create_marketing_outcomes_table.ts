import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const connectionString = process.env.SUPABASE_DB_URL as string;
if (!process.env.SUPABASE_DB_URL) throw new Error('SUPABASE_DB_URL must be set in .env');

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  console.log('🔄 Connecting to database to setup marketing_visit_outcomes table...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS marketing_visit_outcomes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID,
        name VARCHAR(150) NOT NULL,
        color VARCHAR(50),
        display_order INT DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Add unique constraint on (company_id, name) or name if company_id is null
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_marketing_outcomes_name_company 
      ON marketing_visit_outcomes (COALESCE(company_id, '00000000-0000-0000-0000-000000000000'::uuid), name);
    `);

    // Seed default outcomes if table is empty
    const countRes = await client.query('SELECT count(*) FROM marketing_visit_outcomes;');
    if (parseInt(countRes.rows[0].count, 10) === 0) {
      console.log('🌱 Seeding initial default visit outcomes...');
      const defaults = [
        { name: 'Initial Contact', display_order: 1 },
        { name: 'Product Demo', display_order: 2 },
        { name: 'Proposal Sent', display_order: 3 },
        { name: 'Negotiation', display_order: 4 },
        { name: 'Order Received', display_order: 5 },
        { name: 'Follow-up Scheduled', display_order: 6 },
        { name: 'Payment Collected', display_order: 7 },
        { name: 'Not Interested', display_order: 8 }
      ];

      for (const item of defaults) {
        await client.query(
          `INSERT INTO marketing_visit_outcomes (name, display_order, is_active) VALUES ($1, $2, TRUE);`,
          [item.name, item.display_order]
        );
      }
    }

    await client.query("NOTIFY pgrst, 'reload schema';");
    await client.query('COMMIT');
    console.log('✅ marketing_visit_outcomes table ready!');
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err.message);
  } finally {
    client.release();
    pool.end();
  }
}

run();

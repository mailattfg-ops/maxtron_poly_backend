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

const REQUIRED_OUTCOMES = [
  'New visit',
  'Proposal sent',
  'Negotiation',
  'Order Received',
  'Revisit',
  'Payment follow-up',
  'Next follow-up scheduled',
  'Not Interested'
];

async function run() {
  console.log('🔄 Checking & updating marketing_visits table and outcomes...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Ensure marketing_visits has job_role and contact_number
    await client.query(`
      ALTER TABLE marketing_visits ADD COLUMN IF NOT EXISTS job_role VARCHAR(100);
      ALTER TABLE marketing_visits ADD COLUMN IF NOT EXISTS contact_number VARCHAR(50);
      ALTER TABLE marketing_visits ADD COLUMN IF NOT EXISTS quotation_type VARCHAR(20) DEFAULT 'BAGS';
      ALTER TABLE marketing_visits ADD COLUMN IF NOT EXISTS quotation_ref VARCHAR(100);
      ALTER TABLE marketing_visits ADD COLUMN IF NOT EXISTS quotation_subject TEXT;
    `);
    console.log('✅ marketing_visits columns ensured.');

    // 2. Ensure marketing_visit_outcomes table
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

    // Truncate or replace global outcomes so they match exactly what user asked
    await client.query('DELETE FROM marketing_visit_outcomes WHERE company_id IS NULL;');
    for (let i = 0; i < REQUIRED_OUTCOMES.length; i++) {
      await client.query(
        `INSERT INTO marketing_visit_outcomes (name, display_order, is_active) VALUES ($1, $2, TRUE);`,
        [REQUIRED_OUTCOMES[i], i + 1]
      );
    }
    console.log('✅ marketing_visit_outcomes updated with required 8 outcomes.');

    // Reload Supabase schema cache
    await client.query('NOTIFY pgrst, \'reload schema\';');
    await client.query('COMMIT');
    console.log('🚀 All DB updates completed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error updating DB:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

run();

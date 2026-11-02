import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * Applies migrations/add_quotation_format_fields.sql.
 *
 * The direct host in SUPABASE_DB_URL (db.<ref>.supabase.co) is IPv6-only and
 * unreachable from most office networks, so after trying it this falls back
 * to the session poolers, using the same password — the route that worked
 * for the earlier alter scripts.
 */
const sql = fs.readFileSync(path.resolve(__dirname, '../../migrations/add_quotation_format_fields.sql'), 'utf8');

async function run() {
  const url = process.env.SUPABASE_DB_URL;
  if (!url) {
    console.error('❌ SUPABASE_DB_URL is missing in .env');
    process.exit(1);
  }
  const parsed = new URL(url);
  const ref = parsed.hostname.split('.')[1];
  const database = parsed.pathname.substring(1) || 'postgres';
  // The password may or may not be percent-encoded in the URL; try both readings.
  const passwords = [...new Set([decodeURIComponent(parsed.password), parsed.password])];

  const hosts = [
    { host: parsed.hostname, port: Number(parsed.port) || 5432, user: decodeURIComponent(parsed.username) },
    ...[
      'ap-southeast-2', // where this project's pooler answered
      'ap-south-1', 'ap-southeast-1', 'ap-northeast-1', 'ap-northeast-2',
      'eu-central-1', 'eu-central-2', 'eu-west-1', 'eu-west-2', 'eu-west-3', 'eu-north-1',
      'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2', 'ca-central-1', 'sa-east-1',
    ].flatMap(region => [
      { host: `aws-0-${region}.pooler.supabase.com`, port: 5432, user: `postgres.${ref}` },
      { host: `aws-1-${region}.pooler.supabase.com`, port: 5432, user: `postgres.${ref}` },
    ]),
  ];
  const targets = hosts.flatMap(h => passwords.map(password => ({ ...h, password })));

  for (const t of targets) {
    const pool = new Pool({ ...t, database, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 7000 });
    try {
      const client = await pool.connect();
      try {
        console.log(`🔌 Connected via ${t.host}:${t.port}`);
        await client.query(sql);
        console.log('✅ quotation_type, quotation_ref, quotation_subject added to marketing_visits (schema cache reloaded).');
        return;
      } finally {
        client.release();
      }
    } catch (err: any) {
      console.log(`   ${t.host}:${t.port} — ${String(err.message).split('\n')[0]}`);
    } finally {
      await pool.end().catch(() => {});
    }
  }
  console.error('❌ Could not reach the database. Paste migrations/add_quotation_format_fields.sql into the Supabase SQL Editor instead.');
  process.exit(1);
}

run();

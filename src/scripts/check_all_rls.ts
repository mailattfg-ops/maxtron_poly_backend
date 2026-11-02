import dns from "dns";
dns.setDefaultResultOrder("ipv4first");
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const DB_URL = process.env.SUPABASE_DB_URL;

async function run() {
    if (!DB_URL) {
        console.error("No SUPABASE_DB_URL in .env!");
        return;
    }
    const pool = new Pool({ connectionString: DB_URL });
    const client = await pool.connect();
    try {
        const tablesRes = await client.query(`
            SELECT tablename, rowsecurity 
            FROM pg_tables 
            WHERE schemaname = 'public'
            ORDER BY tablename;
        `);
        
        console.log(`Found ${tablesRes.rows.length} tables in public schema.`);
        
        const rlsEnabledTables = tablesRes.rows.filter(r => r.rowsecurity);
        console.log(`RLS is enabled on ${rlsEnabledTables.length} tables.`);
        
        const policiesRes = await client.query(`
            SELECT tablename, policyname, roles, cmd
            FROM pg_policies 
            WHERE schemaname = 'public'
            ORDER BY tablename, policyname;
        `);
        
        console.log(`Found ${policiesRes.rows.length} policies total.`);
        
        // Group policies by table
        const policiesByTable: Record<string, string[]> = {};
        for (const policy of policiesRes.rows) {
            if (!policiesByTable[policy.tablename]) {
                policiesByTable[policy.tablename] = [];
            }
            const rolesStr = Array.isArray(policy.roles) ? policy.roles.join(', ') : String(policy.roles);
            policiesByTable[policy.tablename].push(`${policy.policyname} (${policy.cmd} for ${rolesStr})`);
        }

        // Print tables with RLS but NO policies
        const rlsNoPolicies = [];
        for (const t of tablesRes.rows) {
            if (t.rowsecurity && !policiesByTable[t.tablename]) {
                rlsNoPolicies.push(t.tablename);
            }
        }
        
        console.log("Tables with RLS enabled but NO policies:", rlsNoPolicies);
        
        if (rlsNoPolicies.length > 0) {
            console.log("\n⚠️ WARNING: The above tables will reject all PostgREST (client) requests!");
        }

    } catch (err: any) {
        console.error("Error:", err);
    } finally {
        client.release();
        await pool.end();
    }
}

run();

import dns from "dns";
dns.setDefaultResultOrder("ipv4first");
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const DB_URL = process.env.SUPABASE_DB_URL;

async function fixBranchFkey() {
    if (!DB_URL) {
        console.error("❌ No SUPABASE_DB_URL in .env!");
        return;
    }

    console.log(`🔗 Connecting to database: ${DB_URL}`);
    const pool = new Pool({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });
    const client = await pool.connect();

    try {
        console.log("⚙️ Dropping wrong users_branch_id_fkey constraint...");
        await client.query("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_branch_id_fkey;");
        
        console.log("⚙️ Creating correct users_branch_id_fkey constraint pointing to keil_branches...");
        await client.query(`
            ALTER TABLE users 
                ADD CONSTRAINT users_branch_id_fkey 
                FOREIGN KEY (branch_id) REFERENCES keil_branches(id) ON DELETE SET NULL;
        `);
        console.log("✅ Branch FKEY constraint successfully updated!");

        console.log("🔄 Refreshing PostgREST schema cache...");
        await client.query("NOTIFY pgrst, 'reload schema';");
        
        console.log("🎉 Database fix completed successfully!");

    } catch (err: any) {
        console.error("❌ Error fixing database branch fkey:", err);
    } finally {
        client.release();
        await pool.end();
    }
}

fixBranchFkey();

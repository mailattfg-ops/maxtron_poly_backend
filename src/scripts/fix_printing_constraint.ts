import dns from "dns";
dns.setDefaultResultOrder("ipv4first");
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const DB_URL = process.env.SUPABASE_DB_URL;

async function fixPrintingConstraint() {
    if (!DB_URL) {
        console.error("❌ No SUPABASE_DB_URL in .env!");
        return;
    }

    console.log(`🔗 Connecting to database: ${DB_URL}`);
    const pool = new Pool({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });
    const client = await pool.connect();

    try {
        console.log("⚙️ Dropping global unique printing_number constraint...");
        await client.query("ALTER TABLE production_printing DROP CONSTRAINT IF EXISTS production_printing_printing_number_key;");
        
        console.log("⚙️ Creating company-scoped unique constraint...");
        await client.query(`
            ALTER TABLE production_printing 
                ADD CONSTRAINT production_printing_number_company_key UNIQUE (company_id, printing_number);
        `);
        console.log("✅ Unique constraint successfully updated to company scope!");

        console.log("🔄 Refreshing PostgREST schema cache...");
        await client.query("NOTIFY pgrst, 'reload schema';");
        
        console.log("🎉 Database fix completed successfully!");

    } catch (err: any) {
        console.error("❌ Error fixing printing constraint:", err);
    } finally {
        client.release();
        await pool.end();
    }
}

fixPrintingConstraint();

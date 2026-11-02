import dns from "dns";
dns.setDefaultResultOrder("ipv4first");
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const DB_URL = process.env.SUPABASE_DB_URL;

async function fixPrintingFK() {
    if (!DB_URL) {
        console.error("❌ No SUPABASE_DB_URL in .env!");
        return;
    }

    console.log(`🔗 Connecting to database: ${DB_URL}`);
    const pool = new Pool({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });
    const client = await pool.connect();

    try {
        console.log("⚙️ Adding missing foreign keys to production_printing table...");
        
        await client.query(`
            ALTER TABLE production_printing 
                ADD CONSTRAINT fk_production_printing_batch 
                FOREIGN KEY (batch_id) REFERENCES production_batches(id) ON DELETE CASCADE;
        `);
        console.log("✅ Added batch_id foreign key constraint!");

        await client.query(`
            ALTER TABLE production_printing 
                ADD CONSTRAINT fk_production_printing_operator 
                FOREIGN KEY (operator_id) REFERENCES users(id) ON DELETE SET NULL;
        `);
        console.log("✅ Added operator_id foreign key constraint!");

        console.log("🔄 Refreshing PostgREST schema cache...");
        await client.query("NOTIFY pgrst, 'reload schema';");
        
        console.log("🎉 Database fix completed successfully!");

    } catch (err: any) {
        console.error("❌ Error adding foreign keys:", err);
    } finally {
        client.release();
        await pool.end();
    }
}

fixPrintingFK();

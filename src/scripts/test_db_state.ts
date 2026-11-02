import dns from "dns";
dns.setDefaultResultOrder("ipv4first");
import { Pool } from 'pg';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

const DB_URL = process.env.SUPABASE_DB_URL;

async function run() {
    console.log("Connecting to:", DB_URL);
    if (!DB_URL) {
        console.error("No SUPABASE_DB_URL in .env!");
        return;
    }
    const pool = new Pool({ connectionString: DB_URL });
    const client = await pool.connect();
    try {
        // 1. Check if users table exists and what users are in there
        const res = await client.query(`
            SELECT id, name, username, password, type, is_deleted, company_id, category_id
            FROM users;
        `);
        console.log("Users in DB:", res.rows.map(r => ({
            id: r.id,
            name: r.name,
            username: r.username,
            has_password: !!r.password,
            password_prefix: r.password ? r.password.substring(0, 10) : null,
            type: r.type,
            is_deleted: r.is_deleted,
            company_id: r.company_id,
            category_id: r.category_id
        })));

        // Let's check user_types
        const roles = await client.query(`SELECT id, name FROM user_types;`);
        console.log("User Roles:", roles.rows);

        // Check if admin user exists and try to bcrypt compare if they have a hash
        const adminUser = res.rows.find(r => r.username === 'admin@maxtron.com');
        if (adminUser) {
            console.log("Found admin user!");
            if (adminUser.password) {
                const isMatch = await bcrypt.compare('password@123', adminUser.password);
                console.log("Does password@123 match hash?", isMatch);
                
                // Let's also check if they have unhashed password
                console.log("Is password exactly 'password@123'?", adminUser.password === 'password@123');
            } else {
                console.log("Admin has NO password!");
            }
        } else {
            console.log("No admin user found with username 'admin@maxtron.com'!");
        }

        // 2. Check RLS on users table
        const rlsRes = await client.query(`
            SELECT tablename, rowsecurity 
            FROM pg_tables 
            WHERE schemaname = 'public' AND tablename = 'users';
        `);
        console.log("RLS Status on 'users':", rlsRes.rows);

        // 3. Check policies on users table
        const polRes = await client.query(`
            SELECT policyname, roles, cmd, qual, with_check 
            FROM pg_policies 
            WHERE schemaname = 'public' AND tablename = 'users';
        `);
        console.log("Policies on 'users':", polRes.rows);

    } catch (err: any) {
        console.error("Error checking DB state:", err);
    } finally {
        client.release();
        await pool.end();
    }
}

run();

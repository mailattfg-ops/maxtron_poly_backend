/**
 * One-time: bcrypt any password still stored as plain text, so login can stop
 * accepting plain-text matches. Safe to run again: hashed rows are skipped.
 * Run: npx ts-node src/scripts/hash-plaintext-passwords.ts   (uses .env)
 */
import bcrypt from 'bcryptjs';
import { supabase } from '../config/supabase';

const isHashed = (p: string) => p.startsWith('$2a$') || p.startsWith('$2b$') || p.startsWith('$2y$');

async function run() {
    const PAGE = 1000; // Supabase returns at most 1000 rows per request
    let checked = 0, hashed = 0;
    for (let from = 0; ; from += PAGE) {
        const { data, error } = await supabase
            .from('users')
            .select('id, password')
            .not('password', 'is', null)
            .order('id')
            .range(from, from + PAGE - 1);
        if (error) throw new Error(error.message);
        for (const u of data || []) {
            checked++;
            if (!u.password || isHashed(u.password)) continue;
            // Hash exactly what is stored: login compares the typed password as-is.
            const hash = await bcrypt.hash(u.password, 10);
            const { error: upErr } = await supabase.from('users').update({ password: hash }).eq('id', u.id);
            if (upErr) throw new Error(`user ${u.id}: ${upErr.message}`);
            hashed++;
        }
        if (!data || data.length < PAGE) break;
    }
    console.log(`Checked ${checked} users, hashed ${hashed} plain-text passwords.`);
}

run().catch((e) => { console.error(e.message); process.exit(1); });

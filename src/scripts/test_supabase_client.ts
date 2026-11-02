import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const url = process.env.SUPABASE_URL || '';
const key = process.env.SUPABASE_KEY || '';

console.log("Testing Supabase JS Client connection...");
console.log("URL:", url);
console.log("Key defined:", !!key);

const supabase = createClient(url, key);

async function test() {
  try {
    const { data, error } = await supabase.from('companies').select('*').limit(5);
    if (error) {
      console.error("Supabase Query Error:", error);
    } else {
      console.log("✅ Supabase Query Success! Returned", data.length, "companies.");
      if (data.length > 0) {
        console.log("First company:", data[0]);
      }
    }
  } catch (err: any) {
    console.error("Fetch Exception:", err.message);
  }
}

test();

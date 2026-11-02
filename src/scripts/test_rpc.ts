import { supabase } from '../config/supabase';

async function testRpc() {
  const { data, error } = await supabase.rpc('pg_backend_pid');
  console.log('rpc test:', { data, error });
}

testRpc();

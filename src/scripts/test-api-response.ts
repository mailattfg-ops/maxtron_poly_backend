import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { supabase } from '../config/supabase';

async function checkCompanies() {
  const { data, error } = await supabase.from('companies').select('*');
  console.log('Companies in DB:', JSON.stringify(data, null, 2));
  if (error) console.error('Error fetching companies:', error);
}

checkCompanies();

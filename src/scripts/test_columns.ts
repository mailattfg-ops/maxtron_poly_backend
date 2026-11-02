import { supabase } from '../config/supabase';

async function checkColumns() {
    const { data, error } = await supabase
        .from('sales_invoices')
        .select('id, invoice_number, is_external, billing_software, bill_document_url, bill_document_name')
        .limit(1);

    if (error) {
        console.error('❌ Error selecting columns:', error.message);
    } else {
        console.log('✅ Columns exist in sales_invoices table! Sample data:', data);
    }
}

checkColumns();

import dns from "dns";
dns.setDefaultResultOrder("ipv4first");
import dotenv from 'dotenv';
import path from 'path';
import { supabase } from '../config/supabase';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function run() {
    console.log("Updating Marketing role permissions in DB...");
    const marketingRoleIds = [
        'd333b1ee-338f-4c72-9cbc-d041aa1154cf', // MARKETING
        'f891d217-d456-435c-b75d-14240d4a3f2d'  // MARKETING DEPARTMENT
    ];

    const allowedKeys = [
        'marketing_view',
        'marketing_visit_view',
        'marketing_offer_view',
        'marketing_report_view',
        'inv_trading_view',
        'prod_product_view',
        'inv_rm_view',
        'inv_view',
        'prod_view'
    ];

    const { data: allPerms, error: permErr } = await supabase.from('permissions').select('permission_key');
    if (permErr) {
        console.error("Error fetching permissions:", permErr);
        return;
    }

    for (const roleId of marketingRoleIds) {
        // First delete existing permissions for this role to make a clean state
        await supabase.from('role_permissions').delete().eq('role_id', roleId);

        const rowsToInsert = (allPerms || []).map((p: any) => {
            const isAllowed = allowedKeys.includes(p.permission_key);
            const isMarketingCRUD = p.permission_key.startsWith('marketing_');
            return {
                role_id: roleId,
                permission_key: p.permission_key,
                can_view: isAllowed,
                can_create: isMarketingCRUD,
                can_edit: isMarketingCRUD,
                can_delete: isMarketingCRUD
            };
        });

        const { error: insertErr } = await supabase.from('role_permissions').insert(rowsToInsert);
        if (insertErr) {
            console.error(`Error inserting permissions for role ${roleId}:`, insertErr);
        } else {
            console.log(`✅ Role ${roleId} permissions successfully set.`);
        }
    }

    console.log("🎉 All marketing permissions updated!");
    process.exit(0);
}

run();

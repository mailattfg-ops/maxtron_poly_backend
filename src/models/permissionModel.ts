import { supabase } from '../config/supabase';

export const PermissionModel = {
    getAllPermissions: async () => {
        const { data, error } = await supabase
            .from('permissions')
            .select('*')
            .order('id', { ascending: false });
        if (error) throw new Error(error.message);
        return data || [];
    },

    getRolePermissions: async (roleId: string) => {
        const { data, error } = await supabase
            .from('role_permissions')
            .select(`
                *,
                permissions (
                    module_name,
                    sub_module,
                    description
                )
            `)
            .eq('role_id', roleId);
        if (error) throw new Error(error.message);
        return data || [];
    },

    updateRolePermission: async (roleId: string, permissionKey: string, updates: any) => {
        const { data, error } = await supabase
            .from('role_permissions')
            .upsert({
                role_id: roleId,
                permission_key: permissionKey,
                ...updates
            }, { onConflict: 'role_id,permission_key' })
            .select();
        if (error) throw new Error(error.message);
        return data ? data[0] : null;
    }
};

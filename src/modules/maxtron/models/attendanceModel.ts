import { supabase } from '../../../config/supabase';

export const AttendanceModel = {
    getAll: async (companyId?: string) => {
        let query = supabase.from('attendance').select(`
            *,
            users(
                name, 
                employee_code,
                category_id,
                user_types(name)
            )
        `);
        if (companyId) {
            query = query.eq('company_id', companyId);
        }
        const { data, error } = await query.order('date', { ascending: false });
        if (error) throw new Error(error.message);
        return data || [];
    },

    create: async (attendanceData: any) => {
        const { data, error } = await supabase
            .from('attendance')
            .insert([attendanceData])
            .select();
        if (error) throw new Error(error.message);
        return data ? data[0] : null;
    },

    createBulk: async (attendanceList: any[]) => {
        const { data, error } = await supabase
            .from('attendance')
            .insert(attendanceList)
            .select();
        if (error) throw new Error(error.message);
        return data;
    },

    update: async (id: string, attendanceData: any) => {
        const { data, error } = await supabase
            .from('attendance')
            .update(attendanceData)
            .eq('id', id)
            .select();
        if (error) throw new Error(error.message);
        return data ? data[0] : null;
    },

    delete: async (id: string) => {
        const { error } = await supabase
            .from('attendance')
            .delete()
            .eq('id', id);
        if (error) throw new Error(error.message);
        return true;
    },

    getByDate: async (date: string, companyId?: string) => {
        let query = supabase.from('attendance').select(`
            *,
            users(
                name, 
                employee_code,
                category_id,
                user_types(name)
            )
        `).eq('date', date);
        if (companyId) {
            query = query.eq('company_id', companyId);
        }
        const { data, error } = await query;
        if (error) throw new Error(error.message);
        return data || [];
    },

    getByDateRange: async (startDate: string, endDate: string, companyId?: string) => {
        let query = supabase.from('attendance').select(`
            *,
            users(
                name, 
                employee_code,
                category_id,
                user_types(name)
            )
        `).gte('date', startDate).lte('date', endDate);

        if (companyId) {
            query = query.eq('company_id', companyId);
        }
        const { data, error } = await query.order('date', { ascending: false });
        if (error) throw new Error(error.message);
        return data || [];
    },

    isDuplicate: async (employeeId: string, date: string, companyId?: string) => {
        if (!employeeId || !date) return false;
        const cleanDate = date.split('T')[0];
        let query = supabase
            .from('attendance')
            .select('id')
            .eq('employee_id', employeeId)
            .eq('date', cleanDate);

        if (companyId && companyId.trim() !== '') {
            query = query.eq('company_id', companyId);
        }

        const { data, error } = await query.limit(1);
        if (error) throw new Error(error.message);
        return data && data.length > 0;
    },

    /**
     * isDuplicate for many entries at once: the `${employee_id}_${date}` pairs that
     * already exist. A few queries in total instead of one per entry.
     */
    existingKeys: async (employeeIds: string[], dates: string[]): Promise<Set<string>> => {
        const keys = new Set<string>();
        const ids = [...new Set(employeeIds)];
        const days = [...new Set(dates)];
        if (days.length === 0) return keys;
        // At most 200 ids per request (URL length) and at most 1000 possible matches,
        // Supabase's row cap, so no existing row can be cut off and then duplicated.
        const step = Math.max(1, Math.min(200, Math.floor(1000 / days.length)));
        for (let i = 0; i < ids.length; i += step) {
            const { data, error } = await supabase
                .from('attendance')
                .select('employee_id, date')
                .in('employee_id', ids.slice(i, i + step))
                .in('date', days);
            if (error) throw new Error(error.message);
            for (const r of data || []) keys.add(`${r.employee_id}_${String(r.date).slice(0, 10)}`);
        }
        return keys;
    }
};


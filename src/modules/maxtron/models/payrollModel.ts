import { supabase } from '../../../config/supabase';

export const PayrollModel = {
    getAll: async (companyId?: string, month?: number, year?: number) => {
        let query = supabase.from('employee_payroll').select(`
            *,
            users:employee_id(name, employee_code, category_id, employee_categories(category_name))
        `);
        
        if (companyId) query = query.eq('company_id', companyId);
        if (month) query = query.eq('month', month);
        if (year) query = query.eq('year', year);

        const { data, error } = await query.order('year', { ascending: false }).order('month', { ascending: false });
        if (error) throw new Error(error.message);
        return data || [];
    },

    getById: async (id: string) => {
        const { data, error } = await supabase
            .from('employee_payroll')
            .select(`
                *,
                users:employee_id(name, employee_code)
            `)
            .eq('id', id)
            .single();
        if (error) throw new Error(error.message);
        return data;
    },

    create: async (payrollData: any) => {
        const { data, error } = await supabase
            .from('employee_payroll')
            .upsert(payrollData, { onConflict: 'employee_id,month,year' })
            .select();
        if (error) throw new Error(error.message);
        return data[0];
    },

    /**
     * Bulk import. Employees' rows replace that employee's month (one row per
     * employee and month). Spare drivers have no employee, only a name, so
     * theirs replace the row with the same name, company and month.
     */
    bulkCreate: async (payrollList: any[]) => {
        const employeeRows = payrollList.filter(r => r.employee_id);
        const spareRows = payrollList.filter(r => !r.employee_id);
        const saved: any[] = [];

        if (employeeRows.length > 0) {
            const { data, error } = await supabase
                .from('employee_payroll')
                .upsert(employeeRows, { onConflict: 'employee_id,month,year' })
                .select();
            if (error) throw new Error(error.message);
            saved.push(...(data || []));
        }

        if (spareRows.length > 0) {
            // ponytail: delete then insert, not one transaction; if the insert
            // fails the spare rows of that month are gone until the file is
            // uploaded again. A database function would make it atomic.
            for (const r of spareRows) {
                const { error } = await supabase
                    .from('employee_payroll')
                    .delete()
                    .is('employee_id', null)
                    .eq('company_id', r.company_id)
                    .eq('month', r.month)
                    .eq('year', r.year)
                    .ilike('worker_name', String(r.worker_name).trim());
                if (error) throw new Error(error.message);
            }
            const { data, error } = await supabase.from('employee_payroll').insert(spareRows).select();
            if (error) throw new Error(error.message);
            saved.push(...(data || []));
        }
        return saved;
    },

    update: async (id: string, payrollData: any) => {
        const { data, error } = await supabase
            .from('employee_payroll')
            .update(payrollData)
            .eq('id', id)
            .select();
        if (error) throw new Error(error.message);
        return data[0];
    },

    delete: async (id: string) => {
        const { error } = await supabase.from('employee_payroll').delete().eq('id', id);
        if (error) throw new Error(error.message);
        return true;
    }
};

import { Request, Response } from 'express';
import { supabase } from '../../../config/supabase';

export const getDepartments = async (req: Request, res: Response): Promise<void> => {
    try {
        const { company_id } = req.query;
        let query = supabase.from('departments').select('*').order('department_name', { ascending: true });
        
        if (company_id) {
            query = query.or(`company_id.eq.${company_id},company_id.is.null`);
        } else {
            query = query.is('company_id', null);
        }

        const { data, error } = await query;
        if (error) throw new Error(error.message);
        res.status(200).json({ success: true, count: data?.length || 0, data });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to fetch departments', error: error.message });
    }
};

export const createDepartment = async (req: Request, res: Response) => {
    try {
        const { department_name, company_id } = req.body;
        if (!department_name) {
            return res.status(400).json({ success: false, message: 'Department name is required' });
        }

        const { data, error } = await supabase
            .from('departments')
            .insert([{ department_name, company_id }])
            .select()
            .single();

        if (error) return res.status(400).json({ success: false, message: error.message });
        return res.status(201).json({ success: true, data });
    } catch (error: any) {
        return res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

export const updateDepartment = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { department_name, company_id } = req.body;

        const { data, error } = await supabase
            .from('departments')
            .update({ department_name, company_id })
            .eq('id', id)
            .select()
            .single();

        if (error) return res.status(400).json({ success: false, message: error.message });
        return res.status(200).json({ success: true, data });
    } catch (error: any) {
        return res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

export const deleteDepartment = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('departments')
            .delete()
            .eq('id', id);

        if (error) return res.status(400).json({ success: false, message: error.message });
        return res.status(200).json({ success: true, message: 'Department deleted successfully' });
    } catch (error: any) {
        return res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

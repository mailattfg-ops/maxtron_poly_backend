import { Request, Response } from 'express';
import { supabase } from '../../../config/supabase';

// Get all employee categories
export const getCategories = async (req: Request, res: Response) => {
    try {
        const { company_id } = req.query;
        let query = supabase.from('employee_categories').select('*').order('category_name', { ascending: true });
        if (company_id) {
            query = query.or(`company_id.eq.${company_id},company_id.is.null`);
        } else {
            query = query.is('company_id', null);
        }

        const { data, error } = await query;

        if (error) {
            return res.status(400).json({ success: false, message: error.message });
        }

        return res.status(200).json({ success: true, data });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// Create a new employee category
export const createCategory = async (req: Request, res: Response) => {
    try {
        const { category_name, company_id } = req.body;
        if (!category_name) {
            return res.status(400).json({ success: false, message: 'Category name is required' });
        }

        const { data, error } = await supabase
            .from('employee_categories')
            .insert([{ category_name, company_id }])
            .select()
            .single();

        if (error) {
            return res.status(400).json({ success: false, message: error.message });
        }

        return res.status(201).json({ success: true, data });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// Update an employee category
export const updateCategory = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { category_name, company_id } = req.body;

        // Ensure category is not a global standard category
        const { data: existingData } = await supabase.from('employee_categories').select('*').eq('id', id).single();
        if (existingData && !existingData.company_id) {
            return res.status(403).json({ success: false, message: 'Cannot modify standard shared categories' });
        }

        const { data, error } = await supabase
            .from('employee_categories')
            .update({ category_name, company_id })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return res.status(400).json({ success: false, message: error.message });
        }

        return res.status(200).json({ success: true, data });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// Delete an employee category
export const deleteCategory = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // Ensure category is not a global standard category
        const { data: existingData } = await supabase.from('employee_categories').select('*').eq('id', id).single();
        if (existingData && !existingData.company_id) {
            return res.status(403).json({ success: false, message: 'Cannot delete standard shared categories' });
        }

        // Check if category is used by any users
        const { count, error: checkError } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('category_id', id);

        if (checkError) {
            return res.status(400).json({ success: false, message: checkError.message });
        }

        if (count && count > 0) {
            return res.status(400).json({ success: false, message: 'Cannot delete category as it is assigned to employees' });
        }

        const { error } = await supabase
            .from('employee_categories')
            .delete()
            .eq('id', id);

        if (error) {
            return res.status(400).json({ success: false, message: error.message });
        }

        return res.status(200).json({ success: true, message: 'Category deleted successfully' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Server Error' });
    }
};

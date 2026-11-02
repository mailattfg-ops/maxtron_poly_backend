import { Request, Response } from 'express';
import { supabase } from '../../../config/supabase';

export const getUserTypes = async (req: Request, res: Response): Promise<void> => {
    try {
        const { company_id } = req.query;
        let query = supabase.from('user_types').select('*').order('name');
        if (company_id) {
            query = query.or(`company_id.eq.${company_id},company_id.is.null`);
        } else {
            query = query.is('company_id', null);
        }

        const { data, error } = await query;
        if (error) throw new Error(error.message);
        res.status(200).json({ success: true, count: data.length, data });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to fetch user types', error: error.message });
    }
};

export const createUserType = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, description, company_id } = req.body;
        const { data, error } = await supabase.from('user_types').insert([{ name, description, company_id }]).select();
        if (error) throw new Error(error.message);
        res.status(201).json({ success: true, data: data[0] });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to create user type', error: error.message });
    }
};

export const updateUserType = async (req: Request, res: Response): Promise<any> => {
    try {
        const { id } = req.params;
        const { name, description, company_id } = req.body;

        const { data: existingData } = await supabase.from('user_types').select('*').eq('id', id).single();
        if (existingData && !existingData.company_id) {
            return res.status(403).json({ success: false, message: 'Cannot modify global standard user types' });
        }

        const { data, error } = await supabase.from('user_types').update({ name, description, company_id }).eq('id', id).select();
        if (error) throw new Error(error.message);
        res.status(200).json({ success: true, data: data[0] });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to update user type', error: error.message });
    }
};

export const deleteUserType = async (req: Request, res: Response): Promise<any> => {
    try {
        const { id } = req.params;

        const { data: existingData } = await supabase.from('user_types').select('*').eq('id', id).single();
        if (existingData && !existingData.company_id) {
            return res.status(403).json({ success: false, message: 'Cannot delete global standard user types' });
        }

        const { error } = await supabase.from('user_types').delete().eq('id', id);
        if (error) throw new Error(error.message);
        res.status(200).json({ success: true, message: 'User type deleted' });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to delete user type', error: error.message });
    }
};

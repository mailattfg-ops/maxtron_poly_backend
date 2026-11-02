import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { UserModel } from '../models/userModel';
import { supabase } from '../config/supabase';
import { JWT_SECRET } from '../middleware/authMiddleware';

// Authenticate user and get token
export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;

        // Query Supabase for the user
        const user = await UserModel.getByUsername(email);

        if (!user || !user.password) {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
            return;
        }

        // Compare hashed password (assuming hashes are stored in the DB)
        // For development, if the hash starts with $2a$ or $2b$, we use bcrypt.
        // Otherwise we can fallback to simple comparison.
        let isMatch = false;
        if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
            isMatch = await bcrypt.compare(password, user.password);
        } else {
            isMatch = password === user.password; // fallback for unhashed test users
        }

        if (isMatch) {
            // Fetch User Role Name
            const { data: roleData } = await supabase
                .from('user_types')
                .select('name')
                .eq('id', user.type)
                .single();

            // Fetch User Permissions
            const { data: permissions } = await supabase
                .from('role_permissions')
                .select('permission_key, can_view, can_create, can_edit, can_delete')
                .eq('role_id', user.type);

            // Fetch User Company Details
            let company = null;
            if (user.company_id) {
                const { data: companyData } = await supabase
                    .from('companies')
                    .select('id, company_name, company_code')
                    .eq('id', user.company_id)
                    .single();
                company = companyData;
            }

            // Fetch User Category Details
            let category = null;
            if (user.category_id) {
                const { data: categoryData } = await supabase
                    .from('employee_categories')
                    .select('id, category_name')
                    .eq('id', user.category_id)
                    .single();
                category = categoryData;
            }

            const token = jwt.sign(
                {
                    id: user.id,
                    role: user.type,
                    role_name: roleData?.name || '',
                    email: user.username,
                    company_id: user.company_id,
                    company_name: company?.company_name || '',
                    company_code: company?.company_code || '',
                    category_id: user.category_id,
                    category_name: category?.category_name || '',
                    branch_id: user.branch_id || null,
                    branch_ids: user.branch_ids || (user.branch_id ? [user.branch_id] : []),
                    is_all_branches: !!user.is_all_branches,
                    permissions: permissions || []
                },
                JWT_SECRET,
                { expiresIn: '30d' }
            );

            res.status(200).json({
                success: true,
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.username,
                    type: user.type,
                    role_name: roleData?.name || '',
                    company_id: user.company_id,
                    category_id: user.category_id,
                    branch_id: user.branch_id || null,
                    branch_ids: user.branch_ids || (user.branch_id ? [user.branch_id] : []),
                    is_all_branches: !!user.is_all_branches,
                    company: company,
                    category: category,
                    permissions: permissions || []
                }
            });
        } else {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
    } catch (error: any) {
        console.error('Login Error:', error);
        res.status(500).json({ success: false, message: 'Server error during login', error: error.message });
    }
};

export const verifyAdminPassword = async (req: Request, res: Response): Promise<void> => {
    try {
        const { password } = req.body;
        const userId = (req as any).user.id;

        const user = await UserModel.getByUsername((req as any).user.email);

        if (!user || !user.password) {
            res.status(401).json({ success: false, message: 'Invalid user' });
            return;
        }

        // Verify if user is admin (you might want to check the role specifically here)
        // For now we just verify the password of the current user
        let isMatch = false;
        if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
            isMatch = await bcrypt.compare(password, user.password);
        } else {
            isMatch = password === user.password;
        }

        if (isMatch) {
            res.status(200).json({ success: true, message: 'Password verified' });
        } else {
            res.status(401).json({ success: false, message: 'Incorrect password' });
        }
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Verification failed', error: error.message });
    }
};


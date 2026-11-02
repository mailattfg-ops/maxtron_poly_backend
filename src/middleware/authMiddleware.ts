import 'dotenv/config';
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';

if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET must be set in .env');
}
export const JWT_SECRET: string = process.env.JWT_SECRET;

export interface AuthRequest extends Request {
    user?: any;
}

export const protect = (req: AuthRequest, res: Response, next: NextFunction) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({ success: false, message: 'Not authorized to access this route' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Not authorized to access this route' });
    }
};

// Logins treated as admin regardless of role (same list as before).
const ADMIN_EMAILS = ['admin@maxtron.com', 'admin@keil.com', 'admin'];

const isAdminUser = (user: any) =>
    (user?.role_name || '').toLowerCase() === 'admin' ||
    ADMIN_EMAILS.includes((user?.email || '').toLowerCase());

export const adminOnly = (req: AuthRequest, res: Response, next: NextFunction) => {
    if (req.user && isAdminUser(req.user)) {
        next();
    } else {
        return res.status(403).json({ success: false, message: 'Forbidden: Admin access only' });
    }
};

const forbid = (res: Response, message: string) => res.status(403).json({ success: false, message });

/**
 * Server-side check of the same role_permissions rows the frontend uses to show menus.
 * Read live, so a revoked permission applies at once (the token copy lasts 30 days).
 * Non-admins with the permission still cannot touch admin accounts or create admins.
 */
export const requirePermission = (permissionKey: string, action: 'create' | 'edit' | 'delete') =>
    async (req: AuthRequest, res: Response, next: NextFunction) => {
        if (isAdminUser(req.user)) return next();
        try {
            const field = `can_${action}`;
            const { data: perm, error } = await supabase
                .from('role_permissions')
                .select(field)
                .eq('role_id', req.user?.role)
                .eq('permission_key', permissionKey)
                .maybeSingle();
            if (error) throw error;
            if (!(perm as any)?.[field]) return forbid(res, `Forbidden: no ${action} permission`);

            if (ADMIN_EMAILS.includes(String(req.body?.username || '').trim().toLowerCase())) {
                return forbid(res, 'Forbidden: only admins can use this username');
            }
            if (req.body?.type) {
                const { data: role, error: roleErr } = await supabase
                    .from('user_types').select('name').eq('id', req.body.type).maybeSingle();
                if (roleErr) throw roleErr;
                if ((role?.name || '').toLowerCase() === 'admin') return forbid(res, 'Forbidden: only admins can assign the admin role');
            }
            if (req.params.id) {
                const { data: target, error: targetErr } = await supabase
                    .from('users').select('username, user_types(name)').eq('id', req.params.id).maybeSingle();
                if (targetErr) throw targetErr;
                if (target && isAdminUser({ role_name: (target as any).user_types?.name, email: target.username })) {
                    return forbid(res, 'Forbidden: only admins can change an admin account');
                }
            }
            next();
        } catch (error: any) {
            return res.status(500).json({ success: false, message: 'Permission check failed', error: error.message });
        }
    };

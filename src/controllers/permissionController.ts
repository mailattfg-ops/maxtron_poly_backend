import { Request, Response } from 'express';
import { PermissionModel } from '../models/permissionModel';

export const getAllPermissions = async (req: Request, res: Response): Promise<void> => {
    try {
        const data = await PermissionModel.getAllPermissions();
        res.status(200).json({ success: true, data });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getRolePermissions = async (req: Request, res: Response): Promise<void> => {
    try {
        const { roleId } = req.params;
        const data = await PermissionModel.getRolePermissions(roleId as string);
        res.status(200).json({ success: true, data });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const updatePermission = async (req: Request, res: Response): Promise<void> => {
    try {
        const { roleId, permissionKey } = req.body;
        const updates = req.body.updates;
        const data = await PermissionModel.updateRolePermission(roleId, permissionKey, updates);
        res.status(200).json({ success: true, data });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

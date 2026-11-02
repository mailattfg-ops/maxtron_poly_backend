import { Request, Response } from 'express';
import { RawMaterialModel } from '../models/rawMaterialModel';

export const getRawMaterials = async (req: Request, res: Response): Promise<void> => {
    try {
        const { company_id } = req.query;
        const materials = await RawMaterialModel.getAll(company_id as string);
        res.status(200).json({ success: true, count: materials.length, data: materials });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to fetch raw materials', error: error.message });
    }
};

export const getRawMaterial = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const material = await RawMaterialModel.getById(id as string);
        if (!material) {
            res.status(404).json({ success: false, message: 'Raw material not found' });
            return;
        }
        res.status(200).json({ success: true, data: material });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to fetch raw material', error: error.message });
    }
};

export const createRawMaterial = async (req: Request, res: Response): Promise<void> => {
    try {
        const newMaterial = await RawMaterialModel.create(req.body);
        res.status(201).json({ success: true, data: newMaterial });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to create raw material', error: error.message });
    }
};

export const updateRawMaterial = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const updatedMaterial = await RawMaterialModel.update(id as string, req.body);
        if (!updatedMaterial) {
            res.status(404).json({ success: false, message: 'Raw material not found' });
            return;
        }
        res.status(200).json({ success: true, data: updatedMaterial });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to update raw material', error: error.message });
    }
};

export const deleteRawMaterial = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const deleted = await RawMaterialModel.delete(id as string);
        if (!deleted) {
            res.status(404).json({ success: false, message: 'Raw material not found' });
            return;
        }
        res.status(200).json({ success: true, message: 'Raw material deleted' });
    } catch (error: any) {
        let message = 'Failed to delete raw material';
        if (error.message?.includes('foreign key') || error.message?.includes('violates') || error.message?.includes('constraint') || error.message?.includes('linked')) {
            message = 'Cannot delete raw material: It is currently linked to purchase orders, receipts, or production.';
        }
        res.status(400).json({ success: false, message, error: error.message });
    }
};

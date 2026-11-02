import { Request, Response } from 'express';
import { SupplierModel } from '../models/supplierModel';

export const getSuppliers = async (req: Request, res: Response): Promise<void> => {
    try {
        const { company_id } = req.query;
        const suppliers = await SupplierModel.getAll(company_id as string);
        res.status(200).json({ success: true, count: suppliers.length, data: suppliers });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to fetch suppliers', error: error.message });
    }
};

export const getSupplier = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const supplier = await SupplierModel.getById(id as string);
        if (!supplier) {
            res.status(404).json({ success: false, message: 'Supplier not found' });
            return;
        }
        res.status(200).json({ success: true, data: supplier });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to fetch supplier', error: error.message });
    }
};

export const createSupplier = async (req: Request, res: Response): Promise<void> => {
    try {
        console.log("Creating Supplier with body:", JSON.stringify(req.body, null, 2));
        const newSupplier = await SupplierModel.create(req.body);
        res.status(201).json({ success: true, data: newSupplier });
    } catch (error: any) {
        let message = 'Failed to create supplier';
        if (error.message?.includes('duplicate key') || error.message?.includes('unique constraint')) {
            if (error.message?.includes('gst_no')) {
                message = 'GST Number already exists for another supplier.';
            } else if (error.message?.includes('supplier_code') || error.message?.includes('code')) {
                message = 'Vendor Identity / Supplier Code already exists for another supplier.';
            } else {
                message = 'A supplier with this identity or identifier already exists.';
            }
        }
        res.status(400).json({ success: false, message, error: error.message });
    }
};

export const updateSupplier = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        console.log(`Updating Supplier ${id} with body:`, JSON.stringify(req.body, null, 2));
        const updatedSupplier = await SupplierModel.update(id as string, req.body);
        if (!updatedSupplier) {
            res.status(404).json({ success: false, message: 'Supplier not found' });
            return;
        }
        res.status(200).json({ success: true, data: updatedSupplier });
    } catch (error: any) {
        let message = 'Failed to update supplier';
        if (error.message?.includes('duplicate key') || error.message?.includes('unique constraint')) {
            if (error.message?.includes('gst_no')) {
                message = 'GST Number already exists for another supplier.';
            } else if (error.message?.includes('supplier_code') || error.message?.includes('code')) {
                message = 'Vendor Identity / Supplier Code already exists for another supplier.';
            } else {
                message = 'A supplier with this identity or identifier already exists.';
            }
        }
        res.status(400).json({ success: false, message, error: error.message });
    }
};

export const deleteSupplier = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const deleted = await SupplierModel.delete(id as string);
        if (!deleted) {
            res.status(404).json({ success: false, message: 'Supplier not found' });
            return;
        }
        res.status(200).json({ success: true, message: 'Supplier deleted' });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to delete supplier', error: error.message });
    }
};

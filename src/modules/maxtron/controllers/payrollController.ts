import { Request, Response } from 'express';
import { PayrollModel } from '../models/payrollModel';

export const getPayrolls = async (req: Request, res: Response): Promise<void> => {
    try {
        const { company_id, month, year } = req.query;
        const items = await PayrollModel.getAll(
            company_id as string,
            month ? parseInt(month as string) : undefined,
            year ? parseInt(year as string) : undefined
        );
        res.status(200).json({ success: true, count: items.length, data: items });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to fetch payroll records', error: error.message });
    }
};

export const getPayroll = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const item = await PayrollModel.getById(id as string);
        if (!item) {
            res.status(404).json({ success: false, message: 'Payroll record not found' });
            return;
        }
        res.status(200).json({ success: true, data: item });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to fetch payroll', error: error.message });
    }
};

export const createPayroll = async (req: Request, res: Response): Promise<void> => {
    try {
        if (Array.isArray(req.body)) {
            const items = await PayrollModel.bulkCreate(req.body);
            res.status(201).json({ success: true, count: items.length, data: items });
            return;
        }
        const item = await PayrollModel.create(req.body);
        res.status(201).json({ success: true, data: item });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to process payroll record', error: error.message });
    }
};

export const updatePayroll = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const updated = await PayrollModel.update(id as string, req.body);
        if (!updated) {
            res.status(404).json({ success: false, message: 'Payroll record not found' });
            return;
        }
        res.status(200).json({ success: true, data: updated });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to update payroll record', error: error.message });
    }
};

export const deletePayroll = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const deleted = await PayrollModel.delete(id as string);
        if (!deleted) {
            res.status(404).json({ success: false, message: 'Payroll record not found' });
            return;
        }
        res.status(200).json({ success: true, message: 'Payroll record deleted' });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to delete payroll record', error: error.message });
    }
};

import { Request, Response } from 'express';
import { EmployeeModel } from '../models/employeeModel';

export const getEmployees = async (req: Request, res: Response): Promise<void> => {
    try {
        const { company_name, company_id, category_id, is_deleted } = req.query;
        const employees = await EmployeeModel.getAll(
            company_name as string, 
            company_id as string, 
            category_id as string, 
            is_deleted === 'true'
        );
        res.status(200).json({ success: true, count: employees.length, data: employees });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to fetch employees', error: error.message });
    }
};


export const getEmployee = async (req: Request, res: Response): Promise<void> => {
    try {
        const employee = await EmployeeModel.getById(req.params.id as string);
        if (!employee) {
            res.status(404).json({ success: false, message: 'Employee not found' });
            return;
        }
        res.status(200).json({ success: true, data: employee });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to fetch employee', error: error.message });
    }
};

export const createEmployee = async (req: Request, res: Response): Promise<void> => {
    try {
        const newEmployee = await EmployeeModel.create(req.body);
        res.status(201).json({ success: true, data: newEmployee });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to create employee', error: error.message });
    }
};

export const updateEmployee = async (req: Request, res: Response): Promise<void> => {
    try {
        const updatedEmployee = await EmployeeModel.update(req.params.id as string, req.body);
        if (!updatedEmployee) {
            res.status(404).json({ success: false, message: 'Employee not found' });
            return;
        }
        res.status(200).json({ success: true, data: updatedEmployee });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to update employee', error: error.message });
    }
};

export const deleteEmployee = async (req: Request, res: Response): Promise<void> => {
    try {
        const deleted = await EmployeeModel.delete(req.params.id as string);
        if (!deleted) {
            res.status(404).json({ success: false, message: 'Employee not found' });
            return;
        }
        res.status(200).json({ success: true, data: {} });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to delete employee', error: error.message });
    }
};

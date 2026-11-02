import { Request, Response } from 'express';
import { CustomerModel } from '../models/customerModel';
import { customerSchema } from '../validators/customerValidator';

export const getCustomers = async (req: Request, res: Response): Promise<void> => {
    try {
        const { company_id } = req.query;
        const customers = await CustomerModel.getAll(company_id as string);
        res.status(200).json({ success: true, count: customers.length, data: customers });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to fetch customers', error: error.message });
    }
};

export const getNextCustomerCode = async (req: Request, res: Response): Promise<void> => {
    try {
        const code = await CustomerModel.getNextCode(req.query.company_id as string);
        res.status(200).json({ success: true, data: code });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to work out the next customer code', error: error.message });
    }
};

export const getCustomer = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const customer = await CustomerModel.getById(id as string);
        if (!customer) {
            res.status(404).json({ success: false, message: 'Customer not found' });
            return;
        }
        res.status(200).json({ success: true, data: customer });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to fetch customer', error: error.message });
    }
};

export const createCustomer = async (req: Request, res: Response): Promise<void> => {
    try {
        const validatedData = customerSchema.parse(req.body);
        const newCustomer = await CustomerModel.create(validatedData);
        res.status(201).json({ success: true, data: newCustomer });
    } catch (error: any) {
        if (error.name === 'ZodError') {
            const formattedErrors = error.errors?.map((err: any) => err.message).join(', ') || 'Validation error';
            res.status(400).json({ success: false, message: `Validation failed: ${formattedErrors}`, errors: error.errors });
            return;
        }
        res.status(500).json({ success: false, message: 'Failed to create customer', error: error.message });
    }
};

export const updateCustomer = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const validatedData = customerSchema.parse(req.body);
        const updatedCustomer = await CustomerModel.update(id as string, validatedData);
        if (!updatedCustomer) {
            res.status(404).json({ success: false, message: 'Customer not found' });
            return;
        }
        res.status(200).json({ success: true, data: updatedCustomer });
    } catch (error: any) {
        if (error.name === 'ZodError') {
            const formattedErrors = error.errors?.map((err: any) => err.message).join(', ') || 'Validation error';
            res.status(400).json({ success: false, message: `Validation failed: ${formattedErrors}`, errors: error.errors });
            return;
        }
        res.status(500).json({ success: false, message: 'Failed to update customer', error: error.message });
    }
};

export const deleteCustomer = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const deleted = await CustomerModel.delete(id as string);
        if (!deleted) {
            res.status(404).json({ success: false, message: 'Customer not found' });
            return;
        }
        res.status(200).json({ success: true, message: 'Customer deleted' });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to delete customer', error: error.message });
    }
};

import { Request, Response } from 'express';
import { CompanyModel } from '../models/companyModel';

export const CompanyController = {
    // Get all companies
    getCompanies: async (req: Request, res: Response): Promise<void> => {
        try {
            const companies = await CompanyModel.getAll();
            res.json({ success: true, count: companies.length, data: companies });
        } catch (err: any) {
            res.status(500).json({ success: false, message: 'Failed to fetch companies', error: err.message });
        }
    },

    // Get single company by ID
    getCompanyById: async (req: Request, res: Response): Promise<void> => {
        try {
            const company = await CompanyModel.getById(req.params.id as string);
            if (!company) {
                res.status(404).json({ success: false, message: 'Company not found' });
                return;
            }
            res.json({ success: true, data: company });
        } catch (err: any) {
            res.status(500).json({ success: false, message: 'Failed to fetch company', error: err.message });
        }
    },

    // Create new company
    createCompany: async (req: Request, res: Response): Promise<void> => {
        try {
            const companyData = req.body;
            const newCompany = await CompanyModel.create(companyData);
            res.status(201).json({ success: true, message: 'Company created successfully', data: newCompany });
        } catch (err: any) {
            res.status(500).json({ success: false, message: 'Failed to create company', error: err.message });
        }
    },

    // Update company
    updateCompany: async (req: Request, res: Response): Promise<void> => {
        try {
            const updatedCompany = await CompanyModel.update(req.params.id as string, req.body);
            if (!updatedCompany) {
                res.status(404).json({ success: false, message: 'Company not found' });
                return;
            }
            res.json({ success: true, message: 'Company updated successfully', data: updatedCompany });
        } catch (err: any) {
            res.status(500).json({ success: false, message: 'Failed to update company', error: err.message });
        }
    },

    // Delete company
    deleteCompany: async (req: Request, res: Response): Promise<void> => {
        try {
            await CompanyModel.delete(req.params.id as string);
            res.json({ success: true, message: 'Company deleted successfully' });
        } catch (err: any) {
            res.status(500).json({ success: false, message: 'Failed to delete company', error: err.message });
        }
    }
};

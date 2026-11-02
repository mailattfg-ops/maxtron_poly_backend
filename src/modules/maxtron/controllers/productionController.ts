import { Request, Response } from 'express';
import { ProductionModel } from '../models/productionModel';

export const productionController = {
    // Extrusion Batches
    getBatches: async (req: Request, res: Response) => {
        try {
            const { company_id } = req.query;
            const data = await ProductionModel.getBatches(company_id as string);
            res.json({ success: true, data });
        } catch (error: any) {
            res.status(error.status || 500).json({ success: false, message: error.message });
        }
    },
    createBatch: async (req: Request, res: Response) => {
        try {
            const data = await ProductionModel.createBatch(req.body);
            res.status(201).json({ success: true, data });
        } catch (error: any) {
            res.status(error.status || 500).json({ success: false, message: error.message });
        }
    },
    updateBatch: async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const data = await ProductionModel.updateBatch(id, req.body);
            res.json({ success: true, data });
        } catch (error: any) {
            res.status(error.status || 500).json({ success: false, message: error.message });
        }
    },
    deleteBatch: async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            await ProductionModel.deleteBatch(id);
            res.json({ success: true, message: 'Batch deleted' });
        } catch (error: any) {
            res.status(error.status || 500).json({ success: false, message: error.message });
        }
    },

    // Conversion
    getConversions: async (req: Request, res: Response) => {
        try {
            const { company_id } = req.query;
            const data = await ProductionModel.getConversions(company_id as string);
            res.json({ success: true, data });
        } catch (error: any) {
            res.status(error.status || 500).json({ success: false, message: error.message });
        }
    },
    createConversion: async (req: Request, res: Response) => {
        try {
            const data = await ProductionModel.createConversion(req.body);
            res.status(201).json({ success: true, data });
        } catch (error: any) {
            res.status(error.status || 500).json({ success: false, message: error.message });
        }
    },
    updateConversion: async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const data = await ProductionModel.updateConversion(id, req.body);
            res.json({ success: true, data });
        } catch (error: any) {
            res.status(error.status || 500).json({ success: false, message: error.message });
        }
    },
    deleteConversion: async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            await ProductionModel.deleteConversion(id);
            res.json({ success: true, message: 'Conversion record deleted' });
        } catch (error: any) {
            res.status(error.status || 500).json({ success: false, message: error.message });
        }
    },
    
    // Printing
    getPrinting: async (req: Request, res: Response) => {
        try {
            const { company_id } = req.query;
            const data = await ProductionModel.getPrinting(company_id as string);
            res.json({ success: true, data });
        } catch (error: any) {
            res.status(error.status || 500).json({ success: false, message: error.message });
        }
    },
    createPrinting: async (req: Request, res: Response) => {
        try {
            const data = await ProductionModel.createPrinting(req.body);
            res.status(201).json({ success: true, data });
        } catch (error: any) {
            res.status(error.status || 500).json({ success: false, message: error.message });
        }
    },
    updatePrinting: async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const data = await ProductionModel.updatePrinting(id, req.body);
            res.json({ success: true, data });
        } catch (error: any) {
            res.status(error.status || 500).json({ success: false, message: error.message });
        }
    },
    deletePrinting: async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            await ProductionModel.deletePrinting(id);
            res.json({ success: true, message: 'Printing record deleted' });
        } catch (error: any) {
            res.status(error.status || 500).json({ success: false, message: error.message });
        }
    },

    // Packing
    getPacking: async (req: Request, res: Response) => {
        try {
            const { company_id } = req.query;
            const data = await ProductionModel.getPacking(company_id as string);
            res.json({ success: true, data });
        } catch (error: any) {
            res.status(error.status || 500).json({ success: false, message: error.message });
        }
    },
    createPacking: async (req: Request, res: Response) => {
        try {
            const data = await ProductionModel.createPacking(req.body);
            res.status(201).json({ success: true, data });
        } catch (error: any) {
            res.status(error.status || 500).json({ success: false, message: error.message });
        }
    },
    updatePacking: async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const data = await ProductionModel.updatePacking(id, req.body);
            res.json({ success: true, data });
        } catch (error: any) {
            res.status(error.status || 500).json({ success: false, message: error.message });
        }
    },
    deletePacking: async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            await ProductionModel.deletePacking(id);
            res.json({ success: true, message: 'Packing record deleted' });
        } catch (error: any) {
            res.status(error.status || 500).json({ success: false, message: error.message });
        }
    },

    // Wastage
    getWastage: async (req: Request, res: Response) => {
        try {
            const { company_id } = req.query;
            const data = await ProductionModel.getWastage(company_id as string);
            res.json({ success: true, data });
        } catch (error: any) {
            res.status(error.status || 500).json({ success: false, message: error.message });
        }
    },
    createWastage: async (req: Request, res: Response) => {
        try {
            const data = await ProductionModel.createWastage(req.body);
            res.status(201).json({ success: true, data });
        } catch (error: any) {
            res.status(error.status || 500).json({ success: false, message: error.message });
        }
    },
    updateWastage: async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const data = await ProductionModel.updateWastage(id, req.body);
            res.json({ success: true, data });
        } catch (error: any) {
            res.status(error.status || 500).json({ success: false, message: error.message });
        }
    },
    deleteWastage: async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            await ProductionModel.deleteWastage(id);
            res.json({ success: true, message: 'Wastage record deleted' });
        } catch (error: any) {
            res.status(error.status || 500).json({ success: false, message: error.message });
        }
    },

    // Expenses
    getExpenses: async (req: Request, res: Response) => {
        try {
            const { company_id } = req.query;
            const data = await ProductionModel.getExpenses(company_id as string);
            res.json({ success: true, data });
        } catch (error: any) {
            res.status(error.status || 500).json({ success: false, message: error.message });
        }
    },
    createExpense: async (req: Request, res: Response) => {
        try {
            const data = await ProductionModel.createExpense(req.body);
            res.status(201).json({ success: true, data });
        } catch (error: any) {
            res.status(error.status || 500).json({ success: false, message: error.message });
        }
    },
    updateExpense: async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const data = await ProductionModel.updateExpense(id, req.body);
            res.json({ success: true, data });
        } catch (error: any) {
            res.status(error.status || 500).json({ success: false, message: error.message });
        }
    },
    deleteExpense: async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            await ProductionModel.deleteExpense(id);
            res.json({ success: true, message: 'Expense record deleted' });
        } catch (error: any) {
            res.status(error.status || 500).json({ success: false, message: error.message });
        }
    }
};

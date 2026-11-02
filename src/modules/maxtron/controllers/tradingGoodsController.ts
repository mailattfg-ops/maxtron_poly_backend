import { Request, Response } from 'express';
import { TradingGoodsModel } from '../models/tradingGoodsModel';

export const getTradingGoods = async (req: Request, res: Response) => {
    try {
        const companyId = req.query.company_id as string;
        const filters = {
            from_date: req.query.from_date as string,
            to_date: req.query.to_date as string,
            supplier_id: req.query.supplier_id as string,
            product_id: req.query.product_id as string
        };
        const data = await TradingGoodsModel.getAll(companyId, filters);
        res.status(200).json({ success: true, count: data.length, data });
    } catch (error: any) {
        console.error('Error fetching trading goods inward:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to fetch trading goods inward' });
    }
};

export const getTradingGood = async (req: Request, res: Response) => {
    try {
        const data = await TradingGoodsModel.getById(req.params.id as string);
        if (!data) {
            return res.status(404).json({ success: false, message: 'Trading goods inward record not found' });
        }
        res.status(200).json({ success: true, data });
    } catch (error: any) {
        console.error('Error fetching trading good inward record:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to fetch record' });
    }
};

export const createTradingGood = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const body = {
            ...req.body,
            created_by: user?.id || null
        };

        if (!body.company_id) {
            return res.status(400).json({ success: false, message: 'company_id is required' });
        }
        if (!body.product_id) {
            return res.status(400).json({ success: false, message: 'Finished product is required' });
        }
        if (!body.quantity || Number(body.quantity) <= 0) {
            return res.status(400).json({ success: false, message: 'Valid quantity greater than 0 is required' });
        }

        // If inward_number is not provided, generate one
        if (!body.inward_number || body.inward_number.trim() === '') {
            body.inward_number = await TradingGoodsModel.getNextInwardNumber(body.company_id);
        }

        const data = await TradingGoodsModel.create(body);
        res.status(201).json({ success: true, message: 'Trading finished goods stock added successfully', data });
    } catch (error: any) {
        console.error('Error creating trading goods inward:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to add trading goods stock' });
    }
};

export const updateTradingGood = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const data = await TradingGoodsModel.update(id, req.body);
        res.status(200).json({ success: true, message: 'Trading goods inward record updated', data });
    } catch (error: any) {
        console.error('Error updating trading goods inward:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to update record' });
    }
};

export const deleteTradingGood = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        await TradingGoodsModel.delete(id);
        res.status(200).json({ success: true, message: 'Trading goods inward record deleted successfully' });
    } catch (error: any) {
        console.error('Error deleting trading goods inward:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to delete record' });
    }
};

export const getNextInwardNumber = async (req: Request, res: Response) => {
    try {
        const companyId = req.query.company_id as string;
        const nextNumber = await TradingGoodsModel.getNextInwardNumber(companyId);
        res.status(200).json({ success: true, nextNumber });
    } catch (error: any) {
        console.error('Error generating next inward number:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to generate inward number' });
    }
};

import { Request, Response } from 'express';
import { MarketingOfferModel } from '../models/marketingOfferModel';

export const getAllOffers = async (req: Request, res: Response): Promise<void> => {
    try {
        const { company_id, active_only } = req.query;
        let offers;
        if (active_only === 'true') {
            offers = await MarketingOfferModel.getActive(company_id as string);
        } else {
            offers = await MarketingOfferModel.getAll(company_id as string);
        }
        res.status(200).json({ success: true, count: offers.length, data: offers });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to fetch offers', error: error.message });
    }
};

export const createOffer = async (req: Request, res: Response): Promise<void> => {
    try {
        const newOffer = await MarketingOfferModel.create(req.body);
        res.status(201).json({ success: true, data: newOffer });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to create offer', error: error.message });
    }
};

export const updateOffer = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const updated = await MarketingOfferModel.update(id, req.body);
        if (!updated) {
            res.status(404).json({ success: false, message: 'Offer not found' });
            return;
        }
        res.status(200).json({ success: true, data: updated });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to update offer', error: error.message });
    }
};

export const deleteOffer = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const deleted = await MarketingOfferModel.delete(id);
        if (!deleted) {
            res.status(404).json({ success: false, message: 'Offer not found' });
            return;
        }
        res.status(200).json({ success: true, message: 'Offer deleted' });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to delete offer', error: error.message });
    }
};

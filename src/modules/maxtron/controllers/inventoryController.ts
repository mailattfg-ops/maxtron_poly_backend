import { Request, Response } from 'express';
import { InventoryModel } from '../models/inventoryModel';

// Get all inventory items
export const getInventory = async (req: Request, res: Response) => {
    try {
        const items = await InventoryModel.getAll();
        res.status(200).json({ success: true, count: items.length, data: items });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to fetch inventory' });
    }
};

// Get single inventory item
export const getInventoryItem = async (req: Request, res: Response) => {
    try {
        const item = await InventoryModel.getById(req.params.id as string);
        if (!item) {
            return res.status(404).json({ success: false, message: 'Item not found' });
        }
        res.status(200).json({ success: true, data: item });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to fetch the item' });
    }
};

// Create a new inventory item
export const createInventoryItem = async (req: Request, res: Response) => {
    try {
        const { name, sku, quantity, category, price } = req.body;

        if (!name || !sku || quantity == null || !category || price == null) {
            return res.status(400).json({ success: false, message: 'Please provide all required fields' });
        }

        const newItem = await InventoryModel.create({ name, sku, quantity, category, price });
        res.status(201).json({ success: true, data: newItem });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to create item' });
    }
};

// Update an inventory item
export const updateInventoryItem = async (req: Request, res: Response) => {
    try {
        const updatedItem = await InventoryModel.update(req.params.id as string, req.body);
        if (!updatedItem) {
            return res.status(404).json({ success: false, message: 'Item not found' });
        }
        res.status(200).json({ success: true, data: updatedItem });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to update item' });
    }
};

// Delete an inventory item
export const deleteInventoryItem = async (req: Request, res: Response) => {
    try {
        const isDeleted = await InventoryModel.delete(req.params.id as string);
        if (!isDeleted) {
            return res.status(404).json({ success: false, message: 'Item not found' });
        }
        res.status(200).json({ success: true, data: {} });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to delete item' });
    }
};

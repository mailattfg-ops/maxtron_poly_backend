import { Request, Response } from 'express';
import { VehicleModel } from '../models/vehicleModel';

export const getVehicles = async (req: Request, res: Response): Promise<void> => {
    try {
        const { company_id } = req.query;
        const vehicles = await VehicleModel.getAll(company_id as string);
        res.status(200).json({ success: true, count: vehicles.length, data: vehicles });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to fetch vehicles', error: error.message });
    }
};

export const getVehicle = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const vehicle = await VehicleModel.getById(id as string);
        if (!vehicle) {
            res.status(404).json({ success: false, message: 'Vehicle not found' });
            return;
        }
        res.status(200).json({ success: true, data: vehicle });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to fetch vehicle', error: error.message });
    }
};

export const createVehicle = async (req: Request, res: Response): Promise<void> => {
    try {
        const newVehicle = await VehicleModel.create(req.body);
        res.status(201).json({ success: true, data: newVehicle });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to create vehicle', error: error.message });
    }
};

export const updateVehicle = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const updatedVehicle = await VehicleModel.update(id as string, req.body);
        if (!updatedVehicle) {
            res.status(404).json({ success: false, message: 'Vehicle not found' });
            return;
        }
        res.status(200).json({ success: true, data: updatedVehicle });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to update vehicle', error: error.message });
    }
};

export const deleteVehicle = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const deleted = await VehicleModel.delete(id as string);
        if (!deleted) {
            res.status(404).json({ success: false, message: 'Vehicle not found' });
            return;
        }
        res.status(200).json({ success: true, message: 'Vehicle deleted' });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to delete vehicle', error: error.message });
    }
};

import { Response } from 'express';
import { AuthRequest } from '../../../middleware/authMiddleware';
import { AnnouncementModel } from '../models/announcementModel';

export const getAnnouncements = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { tenant } = req.query;
        if (!tenant || (tenant !== 'maxtron' && tenant !== 'keil')) {
            res.status(400).json({ success: false, message: 'Valid tenant (maxtron or keil) is required' });
            return;
        }
        const data = await AnnouncementModel.getAll(tenant);
        res.status(200).json({ success: true, count: data.length, data });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to fetch announcements', error: error.message });
    }
};

export const createAnnouncement = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { title, content, type, tenant } = req.body;
        if (!title || !content || !type || !tenant) {
            res.status(400).json({ success: false, message: 'All fields (title, content, type, tenant) are required' });
            return;
        }

        const announcementData = {
            title,
            content,
            type,
            tenant,
            created_by: req.user?.id
        };

        const data = await AnnouncementModel.create(announcementData);
        res.status(201).json({ success: true, data });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to create announcement', error: error.message });
    }
};

export const deleteAnnouncement = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        await AnnouncementModel.delete(id);
        res.status(200).json({ success: true, message: 'Announcement deleted/deactivated' });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to delete announcement', error: error.message });
    }
};

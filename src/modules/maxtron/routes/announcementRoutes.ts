import { Router } from 'express';
import { getAnnouncements, createAnnouncement, deleteAnnouncement } from '../controllers/announcementController';
import { protect, adminOnly } from '../../../middleware/authMiddleware';

const router = Router();

// All logged in users can see announcements
router.get('/', protect, getAnnouncements);

// Only admins can create or delete
router.post('/', protect, adminOnly, createAnnouncement);
router.delete('/:id', protect, adminOnly, deleteAnnouncement);

export default router;

import { Router } from 'express';
import { productController } from '../controllers/productController';
import { protect } from '../../../middleware/authMiddleware';

const router = Router();

router.get('/', protect, productController.getAll);
router.post('/', protect, productController.create);
router.put('/:id', protect, productController.update);
router.delete('/:id', protect, productController.delete);

export default router;

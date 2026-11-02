import { Router } from 'express';
import {
    getRawMaterials,
    getRawMaterial,
    createRawMaterial,
    updateRawMaterial,
    deleteRawMaterial
} from '../controllers/rawMaterialController';
import { protect } from '../../../middleware/authMiddleware';

const router = Router();

router.use(protect);

router.get('/', getRawMaterials);
router.get('/:id', getRawMaterial);
router.post('/', createRawMaterial);
router.put('/:id', updateRawMaterial);
router.delete('/:id', deleteRawMaterial);

export default router;

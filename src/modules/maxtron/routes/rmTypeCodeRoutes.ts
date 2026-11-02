import { Router } from 'express';
import { getRMTypeCodes, createRMTypeCode, updateRMTypeCode, deleteRMTypeCode } from '../controllers/rmTypeCodeController';

const router = Router();

router.get('/', getRMTypeCodes);
router.post('/', createRMTypeCode);
router.put('/:id', updateRMTypeCode);
router.delete('/:id', deleteRMTypeCode);

export default router;

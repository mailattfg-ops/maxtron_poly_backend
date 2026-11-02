import { Router } from 'express';
import { 
    getAllOffers, 
    createOffer, 
    updateOffer, 
    deleteOffer 
} from '../controllers/marketingOfferController';

const router = Router();

router.get('/', getAllOffers);
router.post('/', createOffer);
router.put('/:id', updateOffer);
router.delete('/:id', deleteOffer);

export default router;

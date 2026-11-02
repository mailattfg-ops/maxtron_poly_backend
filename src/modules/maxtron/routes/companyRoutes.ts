import express from 'express';
import { CompanyController } from '../controllers/companyController';
import { protect } from '../../../middleware/authMiddleware';

const router = express.Router();

// Get all companies
router.get('/', protect, CompanyController.getCompanies);

// Get single company
router.get('/:id', protect, CompanyController.getCompanyById);

// Create new company
router.post('/', protect, CompanyController.createCompany);

// Update existing company
router.put('/:id', protect, CompanyController.updateCompany);

// Delete company
router.delete('/:id', protect, CompanyController.deleteCompany);

export default router;

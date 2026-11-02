import { Router } from 'express';
import {
    getEmployees,
    getEmployee,
    createEmployee,
    updateEmployee,
    deleteEmployee
} from '../controllers/employeeController';
import { protect, requirePermission } from '../../../middleware/authMiddleware';

const router = Router();

// Apply auth middleware to all employee routes
router.use(protect);

router.route('/')
    .get(getEmployees)
    .post(requirePermission('hr_employee_view', 'create'), createEmployee);

router.route('/:id')
    .get(getEmployee)
    .put(requirePermission('hr_employee_view', 'edit'), updateEmployee)
    .delete(requirePermission('hr_employee_view', 'delete'), deleteEmployee);

export default router;

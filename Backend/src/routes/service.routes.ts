import { Router } from 'express';
import { requireAdmin } from '../middlewares/auth.middleware';
import { ServiceController } from '../controllers/service.controller';

const router = Router();

// Públicas
router.get('/',    ServiceController.list);
router.get('/:id', ServiceController.getById);

// Admin
router.post('/',      requireAdmin, ServiceController.create);
router.put('/:id',    requireAdmin, ServiceController.update);
router.delete('/:id', requireAdmin, ServiceController.remove);

export default router;

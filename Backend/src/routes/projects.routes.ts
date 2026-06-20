import { Router } from 'express';
import { requireAdmin } from '../middlewares/auth.middleware';
import * as ctrl from '../controllers/project.controller';

const router = Router();

// Pública (portfólio)
router.get('/stats',      ctrl.stats);
router.get('/slug/:slug', ctrl.getBySlug);
router.get('/',           ctrl.list);
router.get('/:id',        ctrl.getById);

// Protegidas (admin)
router.post('/',    requireAdmin, ctrl.create);
router.put('/:id',  requireAdmin, ctrl.update);
router.delete('/:id', requireAdmin, ctrl.remove);

export default router;
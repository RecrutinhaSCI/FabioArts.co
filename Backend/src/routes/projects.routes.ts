import { Router } from 'express';
import { requireAdmin, optionalAuth } from '../middlewares/auth.middleware';
import * as ctrl from '../controllers/project.controller';

const router = Router();

// Pública (portfólio) — sem token só retorna projetos publicados
router.get('/stats',      ctrl.stats);
router.get('/slug/:slug', optionalAuth, ctrl.getBySlug);
router.get('/',           optionalAuth, ctrl.list);
router.get('/:id',        optionalAuth, ctrl.getById);

// Protegidas (admin)
router.post('/',    requireAdmin, ctrl.create);
router.put('/:id',  requireAdmin, ctrl.update);
router.delete('/:id', requireAdmin, ctrl.remove);

export default router;
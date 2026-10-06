import { Router } from 'express';
import { requireAdmin, optionalAuth } from '../middlewares/auth.middleware';
import * as ctrl from '../controllers/client.controller';

const router = Router();

router.get('/stats', ctrl.stats);
// Público recebe só nome + feedback de clientes ativos; admin recebe a ficha completa.
router.get('/',      optionalAuth, ctrl.list);
router.get('/:id',   requireAdmin, ctrl.getById);

router.post('/',      requireAdmin, ctrl.create);
router.put('/:id',    requireAdmin, ctrl.update);
router.delete('/:id', requireAdmin, ctrl.remove);

export default router;
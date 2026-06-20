import { Router } from 'express';
import { requireAdmin } from '../middlewares/auth.middleware';
import * as ctrl from '../controllers/client.controller';

const router = Router();

router.get('/stats', ctrl.stats);
router.get('/',      ctrl.list);
router.get('/:id',   ctrl.getById);

router.post('/',      requireAdmin, ctrl.create);
router.put('/:id',    requireAdmin, ctrl.update);
router.delete('/:id', requireAdmin, ctrl.remove);

export default router;
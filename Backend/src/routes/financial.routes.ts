import { Router } from 'express';
import { requireAdmin } from '../middlewares/auth.middleware';
import { FinancialController } from '../controllers/financial.controller';

const router = Router();

// Tudo do financeiro é restrito a admin.
router.use(requireAdmin);

router.get('/stats',     FinancialController.stats);
router.get('/',          FinancialController.list);
router.get('/:id',       FinancialController.getById);
router.post('/',         FinancialController.create);
router.put('/:id',       FinancialController.update);
router.delete('/:id',    FinancialController.remove);

export default router;

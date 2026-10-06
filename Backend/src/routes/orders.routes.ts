import { Router } from 'express';
import { requireAdmin } from '../middlewares/auth.middleware';
import { OrdersController } from '../controllers/orders.controller';

const router = Router();

// Pedidos: camada agregadora Cliente → Projeto → Orçamento → Financeiro (só admin)
router.use(requireAdmin);

router.get('/client-lookup', OrdersController.lookupClient);
router.get('/',              OrdersController.list);
router.get('/:id',           OrdersController.getById);
router.post('/',             OrdersController.create);

export default router;

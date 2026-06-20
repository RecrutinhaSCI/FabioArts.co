import { Router }               from 'express';
import { DashboardController }  from '../controllers/dashboard.controller';
import { requireAdmin }         from '../middlewares/auth.middleware';

const router = Router();

// Todas as rotas do dashboard exigem admin autenticado
router.use(requireAdmin);

/**
 * @route  GET /api/dashboard/stats
 * @desc   Estatísticas gerais: totais, pendentes, por categoria, faturamento
 * @access Admin
 */
router.get('/stats', DashboardController.getStats);

/**
 * @route  GET /api/dashboard/recent
 * @desc   Dados recentes: últimos orçamentos, clientes e projetos
 * @access Admin
 */
router.get('/recent', DashboardController.getRecent);

export default router;
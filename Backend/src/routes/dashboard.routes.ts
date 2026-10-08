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

/**
 * @route  GET /api/dashboard/revenue?period=6m|12m|year
 * @desc   Faturamento mensal real (receitas não canceladas por mês) — somente leitura
 * @access Admin
 */
router.get('/revenue', DashboardController.getRevenue);

/**
 * @route  GET /api/dashboard/deliveries
 * @desc   Próximas entregas: trabalhos em aberto até hoje + 14 dias (atrasados primeiro)
 * @access Admin
 */
router.get('/deliveries', DashboardController.getDeliveries);

export default router;
import { Request, Response, NextFunction } from 'express';
import { DashboardService }                from '../services/dashboard.service';
import { ApiResponse }                     from '../utils/ApiResponse';
import { OrdersService }                   from '../services/orders.service';
import { RevenueService }                  from '../services/revenue.service';

export const DashboardController = {

  // GET /api/dashboard/stats
  async getStats(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await DashboardService.getStats();
      ApiResponse.success(res, stats, 'Estatísticas carregadas');
    } catch (err) {
      next(err);
    }
  },

  // GET /api/dashboard/recent
  async getRecent(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const recent = await DashboardService.getRecent();
      ApiResponse.success(res, recent, 'Dados recentes carregados');
    } catch (err) {
      next(err);
    }
  },

  // GET /api/dashboard/revenue?period=6m|12m|year (somente leitura)
  async getRevenue(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await RevenueService.monthly(req.query.period as string | undefined);
      ApiResponse.success(res, data, 'Faturamento mensal');
    } catch (err) {
      next(err);
    }
  },

  // GET /api/dashboard/deliveries
  async getDeliveries(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await OrdersService.deliveries();
      ApiResponse.success(res, data, 'Próximas entregas');
    } catch (err) {
      next(err);
    }
  },
};

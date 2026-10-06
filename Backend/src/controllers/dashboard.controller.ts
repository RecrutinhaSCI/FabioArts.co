import { Request, Response, NextFunction } from 'express';
import { DashboardService }                from '../services/dashboard.service';
import { ApiResponse }                     from '../utils/ApiResponse';
import { OrdersService }                   from '../services/orders.service';

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

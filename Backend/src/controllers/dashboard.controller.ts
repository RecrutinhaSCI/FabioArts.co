import { Request, Response, NextFunction } from 'express';
import { DashboardService }                from '../services/dashboard.service';
import { ApiResponse }                     from '../utils/ApiResponse';

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
};
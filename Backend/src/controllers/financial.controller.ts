import { Request, Response, NextFunction } from 'express';
import { FinancialService } from '../services/financial.service';
import { ApiResponse }      from '../utils/ApiResponse';

export const FinancialController = {

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await FinancialService.list(req.query as Record<string, string>);
      ApiResponse.success(res, result, 'Lançamentos');
    } catch (err) { next(err); }
  },

  async stats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await FinancialService.stats({ month: req.query.month as string });
      ApiResponse.success(res, data, 'Stats financeiras');
    } catch (err) { next(err); }
  },

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await FinancialService.getById(req.params.id);
      ApiResponse.success(res, data, 'Lançamento');
    } catch (err) { next(err); }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await FinancialService.create(req.body);
      ApiResponse.success(res, data, 'Lançamento criado', 201);
    } catch (err) { next(err); }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await FinancialService.update(req.params.id, req.body);
      ApiResponse.success(res, data, 'Lançamento atualizado');
    } catch (err) { next(err); }
  },

  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await FinancialService.remove(req.params.id);
      ApiResponse.success(res, data, 'Lançamento removido');
    } catch (err) { next(err); }
  },
};

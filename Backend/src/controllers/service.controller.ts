import { Request, Response, NextFunction } from 'express';
import { ServicesService } from '../services/services.service';
import { ApiResponse }     from '../utils/ApiResponse';

export const ServiceController = {

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { isActive, search, page, limit } = req.query as Record<string, string>;
      const result = await ServicesService.list({ isActive, search, page, limit });
      ApiResponse.success(res, result, 'Serviços listados');
    } catch (err) { next(err); }
  },

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await ServicesService.getById(req.params.id);
      ApiResponse.success(res, data, 'Serviço obtido');
    } catch (err) { next(err); }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await ServicesService.create(req.body);
      ApiResponse.success(res, data, 'Serviço criado', 201);
    } catch (err) { next(err); }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await ServicesService.update(req.params.id, req.body);
      ApiResponse.success(res, data, 'Serviço atualizado');
    } catch (err) { next(err); }
  },

  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await ServicesService.remove(req.params.id);
      ApiResponse.success(res, data, 'Serviço removido');
    } catch (err) { next(err); }
  },
};

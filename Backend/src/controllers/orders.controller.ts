import { Request, Response, NextFunction } from 'express';
import { OrdersService } from '../services/orders.service';
import { ApiResponse }   from '../utils/ApiResponse';

export const OrdersController = {

  // GET /api/orders
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { search, workStatus, financialStatus, page, limit } = req.query as Record<string, string>;
      const result = await OrdersService.list({ search, workStatus, financialStatus, page, limit });
      ApiResponse.success(res, result, 'Pedidos');
    } catch (err) { next(err); }
  },

  // GET /api/orders/client-lookup?phone=
  async lookupClient(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await OrdersService.lookupClientByPhone(String(req.query.phone ?? ''));
      ApiResponse.success(res, data, data.found ? 'Cliente encontrado' : 'Cliente não encontrado');
    } catch (err) { next(err); }
  },

  // GET /api/orders/:id  (id = projeto)
  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await OrdersService.getById(req.params.id);
      ApiResponse.success(res, data, 'Pedido');
    } catch (err) { next(err); }
  },

  // POST /api/orders
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await OrdersService.create(req.body ?? {});
      ApiResponse.success(res, data, 'Pedido cadastrado com sucesso.', 201);
    } catch (err) { next(err); }
  },
};

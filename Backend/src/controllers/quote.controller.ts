import { Request, Response, NextFunction } from 'express';
import { QuotesService } from '../services/quotes.service';
import { ApiResponse }   from '../utils/ApiResponse';

export const QuoteController = {

  // POST /api/quotes — PÚBLICO (formulário do site)
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await QuotesService.create(req.body);
      ApiResponse.success(res, data, 'Orçamento enviado com sucesso', 201);
    } catch (err) { next(err); }
  },

  // GET /api/quotes — admin
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status, search, page, limit } = req.query as Record<string, string>;
      const result = await QuotesService.list({ status, search, page, limit });
      ApiResponse.success(res, result, 'Orçamentos listados');
    } catch (err) { next(err); }
  },

  // GET /api/quotes/stats — admin
  async stats(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await QuotesService.stats();
      ApiResponse.success(res, data, 'Stats de orçamentos');
    } catch (err) { next(err); }
  },

  // GET /api/quotes/:id — admin
  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await QuotesService.getById(req.params.id);
      ApiResponse.success(res, data, 'Orçamento obtido');
    } catch (err) { next(err); }
  },

  // PATCH /api/quotes/:id/status — admin
  async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status, adminNotes } = req.body as { status: string; adminNotes?: string };
      const data = await QuotesService.updateStatus(req.params.id, status, adminNotes);
      ApiResponse.success(res, data, 'Status atualizado');
    } catch (err) { next(err); }
  },

  // DELETE /api/quotes/:id — admin
  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await QuotesService.remove(req.params.id);
      ApiResponse.success(res, data, 'Orçamento removido');
    } catch (err) { next(err); }
  },
};

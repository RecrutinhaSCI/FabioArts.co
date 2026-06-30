import { Request, Response, NextFunction } from 'express';
import { GoogleReviewsService } from '../services/google-reviews.service';
import { ApiResponse }          from '../utils/ApiResponse';

export const ReviewsController = {

  async getGoogle(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Service nunca lança em condições normais — sempre devolve shape estável
      const data = await GoogleReviewsService.get();
      ApiResponse.success(res, data, 'Avaliações do Google');
    } catch (err) { next(err); }
  },

  async refreshGoogle(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      GoogleReviewsService.clearCache();
      const data = await GoogleReviewsService.get();
      ApiResponse.success(res, data, 'Cache de avaliações limpo');
    } catch (err) { next(err); }
  },
};

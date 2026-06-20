import { Request, Response, NextFunction } from 'express';
import { SettingsService } from '../services/settings.service';
import { ApiResponse }     from '../utils/ApiResponse';

export const SettingsController = {

  async get(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await SettingsService.get();
      ApiResponse.success(res, data, 'Configurações do site');
    } catch (err) { next(err); }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await SettingsService.update(req.body);
      ApiResponse.success(res, data, 'Configurações atualizadas');
    } catch (err) { next(err); }
  },
};

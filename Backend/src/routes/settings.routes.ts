import { Router } from 'express';
import { requireAdmin } from '../middlewares/auth.middleware';
import { SettingsController } from '../controllers/settings.controller';

const router = Router();

// Público (site público lê)
router.get('/', SettingsController.get);

// Admin
router.put('/', requireAdmin, SettingsController.update);

export default router;

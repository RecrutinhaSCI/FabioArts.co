import { Router } from 'express';

import authRoutes      from './auth.routes';
import projectRoutes   from './projects.routes';
import clientRoutes    from './client.routes';
import serviceRoutes   from './service.routes';
import quoteRoutes     from './quote.routes';
import settingsRoutes  from './settings.routes';
import dashboardRoutes from './dashboard.routes';
import contentRoutes   from './content.routes';
import financialRoutes from './financial.routes';
import reviewsRoutes   from './reviews.routes';

const router = Router();

// ─── API v1 ──────────────────────────────────────────────────────────────────

router.use('/auth',      authRoutes);
router.use('/projects',  projectRoutes);
router.use('/clients',   clientRoutes);
router.use('/services',  serviceRoutes);
router.use('/quotes',    quoteRoutes);
router.use('/settings',  settingsRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/',          contentRoutes);   // about-stats, courses, footer-*, etc
router.use('/financial', financialRoutes);
router.use('/reviews',   reviewsRoutes);

// ─── API info ─────────────────────────────────────────────────────────────────

router.get('/', (_req, res) => {
  res.json({
    success: true,
    message: 'FabioArts API',
    version: '1.0.0',
    endpoints: [
      'POST   /api/auth/login',
      'POST   /api/auth/refresh',
      'POST   /api/auth/logout',
      'GET    /api/auth/me',
      'PUT    /api/auth/me',
      'PUT    /api/auth/change-password',
      'GET    /api/projects',
      'POST   /api/projects',
      'GET    /api/projects/:id',
      'GET    /api/projects/slug/:slug',
      'PUT    /api/projects/:id',
      'DELETE /api/projects/:id',
      'GET    /api/clients',
      'POST   /api/clients',
      'GET    /api/clients/:id',
      'PUT    /api/clients/:id',
      'DELETE /api/clients/:id',
      'GET    /api/services',
      'GET    /api/services/:id',
      'POST   /api/services',
      'PUT    /api/services/:id',
      'DELETE /api/services/:id',
      'POST   /api/quotes',
      'GET    /api/quotes',
      'GET    /api/quotes/stats',
      'GET    /api/quotes/:id',
      'PATCH  /api/quotes/:id/status',
      'DELETE /api/quotes/:id',
      'GET    /api/settings',
      'PUT    /api/settings',
      'GET    /api/dashboard/stats',
      'GET    /api/dashboard/recent',
    ],
  });
});

export default router;
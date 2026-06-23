import { Router } from 'express';
import { requireAdmin } from '../middlewares/auth.middleware';
import {
  AboutStatController,
  MentorshipFeatureController,
  ProcessStepController,
  CourseController,
  FooterColumnController,
  FooterLinkController,
  CTAButtonController,
} from '../controllers/content.controller';

/* ============================================================
   Rotas de conteúdo do site público (Fase E).
   Padrão:
     - GET público (site público consome sem auth)
     - POST/PUT/DELETE admin
   ============================================================ */

const router = Router();

/* ── About stats ── */
router.get('/about-stats',          AboutStatController.list);
router.get('/about-stats/:id',      AboutStatController.getById);
router.post('/about-stats',         requireAdmin, AboutStatController.create);
router.put('/about-stats/:id',      requireAdmin, AboutStatController.update);
router.delete('/about-stats/:id',   requireAdmin, AboutStatController.remove);

/* ── Mentorship features ── */
router.get('/mentorship-features',        MentorshipFeatureController.list);
router.get('/mentorship-features/:id',    MentorshipFeatureController.getById);
router.post('/mentorship-features',       requireAdmin, MentorshipFeatureController.create);
router.put('/mentorship-features/:id',    requireAdmin, MentorshipFeatureController.update);
router.delete('/mentorship-features/:id', requireAdmin, MentorshipFeatureController.remove);

/* ── Process steps ── */
router.get('/process-steps',        ProcessStepController.list);
router.get('/process-steps/:id',    ProcessStepController.getById);
router.post('/process-steps',       requireAdmin, ProcessStepController.create);
router.put('/process-steps/:id',    requireAdmin, ProcessStepController.update);
router.delete('/process-steps/:id', requireAdmin, ProcessStepController.remove);

/* ── Courses ── */
router.get('/courses',        CourseController.list);
router.get('/courses/:id',    CourseController.getById);
router.post('/courses',       requireAdmin, CourseController.create);
router.put('/courses/:id',    requireAdmin, CourseController.update);
router.delete('/courses/:id', requireAdmin, CourseController.remove);

/* ── Footer columns (com links inline na listagem) ── */
router.get('/footer-columns',        FooterColumnController.list);
router.get('/footer-columns/:id',    FooterColumnController.getById);
router.post('/footer-columns',       requireAdmin, FooterColumnController.create);
router.put('/footer-columns/:id',    requireAdmin, FooterColumnController.update);
router.delete('/footer-columns/:id', requireAdmin, FooterColumnController.remove);

/* ── Footer links (gerenciados via admin; site usa colunas com include) ── */
router.get('/footer-links',        FooterLinkController.list);
router.get('/footer-links/:id',    FooterLinkController.getById);
router.post('/footer-links',       requireAdmin, FooterLinkController.create);
router.put('/footer-links/:id',    requireAdmin, FooterLinkController.update);
router.delete('/footer-links/:id', requireAdmin, FooterLinkController.remove);

/* ── CTA buttons (upsert por key) ── */
router.get('/cta-buttons',         CTAButtonController.list);
router.get('/cta-buttons/:key',    CTAButtonController.getByKey);
router.put('/cta-buttons',         requireAdmin, CTAButtonController.upsert);
router.delete('/cta-buttons/:key', requireAdmin, CTAButtonController.remove);

export default router;

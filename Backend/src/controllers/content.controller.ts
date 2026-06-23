import { Request, Response, NextFunction } from 'express';
import {
  AboutStatService,
  MentorshipFeatureService,
  ProcessStepService,
  CourseService,
  FooterColumnService,
  FooterLinkService,
  CTAButtonService,
} from '../services/content.service';
import { ApiResponse } from '../utils/ApiResponse';

/* Padrão genérico de controller para os 5 CRUDs simples
   (about-stats, mentorship-features, process-steps, footer-columns,
   footer-links) — segue padrão dos outros controllers do projeto. */

function wrap<T>(
  fn: (req: Request) => Promise<T>,
  successMsg: string,
  statusCode = 200,
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await fn(req);
      ApiResponse.success(res, data, successMsg, statusCode);
    } catch (err) { next(err); }
  };
}

/* ───── AboutStat ───── */
export const AboutStatController = {
  list:    wrap(req => AboutStatService.list({ isActive: req.query.isActive as string }), 'Estatísticas'),
  getById: wrap(req => AboutStatService.getById(req.params.id),                       'Estatística'),
  create:  wrap(req => AboutStatService.create(req.body),                             'Estatística criada', 201),
  update:  wrap(req => AboutStatService.update(req.params.id, req.body),              'Estatística atualizada'),
  remove:  wrap(req => AboutStatService.remove(req.params.id),                        'Estatística removida'),
};

/* ───── MentorshipFeature ───── */
export const MentorshipFeatureController = {
  list:    wrap(req => MentorshipFeatureService.list({ isActive: req.query.isActive as string }), 'Features'),
  getById: wrap(req => MentorshipFeatureService.getById(req.params.id),                'Feature'),
  create:  wrap(req => MentorshipFeatureService.create(req.body),                      'Feature criada', 201),
  update:  wrap(req => MentorshipFeatureService.update(req.params.id, req.body),       'Feature atualizada'),
  remove:  wrap(req => MentorshipFeatureService.remove(req.params.id),                 'Feature removida'),
};

/* ───── ProcessStep ───── */
export const ProcessStepController = {
  list:    wrap(req => ProcessStepService.list({ isActive: req.query.isActive as string }), 'Passos'),
  getById: wrap(req => ProcessStepService.getById(req.params.id),                       'Passo'),
  create:  wrap(req => ProcessStepService.create(req.body),                             'Passo criado', 201),
  update:  wrap(req => ProcessStepService.update(req.params.id, req.body),              'Passo atualizado'),
  remove:  wrap(req => ProcessStepService.remove(req.params.id),                        'Passo removido'),
};

/* ───── Course ───── */
export const CourseController = {
  list: wrap(req => CourseService.list({
    isActive:   req.query.isActive   as string,
    isFeatured: req.query.isFeatured as string,
    level:      req.query.level      as string,
    search:     req.query.search     as string,
  }), 'Cursos'),
  getById: wrap(req => CourseService.getById(req.params.id),               'Curso'),
  create:  wrap(req => CourseService.create(req.body),                     'Curso criado', 201),
  update:  wrap(req => CourseService.update(req.params.id, req.body),      'Curso atualizado'),
  remove:  wrap(req => CourseService.remove(req.params.id),                'Curso removido'),
};

/* ───── FooterColumn ───── */
export const FooterColumnController = {
  list:    wrap(req => FooterColumnService.list({ isActive: req.query.isActive as string }), 'Colunas do footer'),
  getById: wrap(req => FooterColumnService.getById(req.params.id),                'Coluna'),
  create:  wrap(req => FooterColumnService.create(req.body),                      'Coluna criada', 201),
  update:  wrap(req => FooterColumnService.update(req.params.id, req.body),       'Coluna atualizada'),
  remove:  wrap(req => FooterColumnService.remove(req.params.id),                 'Coluna removida'),
};

/* ───── FooterLink ───── */
export const FooterLinkController = {
  list: wrap(req => FooterLinkService.list({
    columnId: req.query.columnId as string,
    isActive: req.query.isActive as string,
  }), 'Links do footer'),
  getById: wrap(req => FooterLinkService.getById(req.params.id),               'Link'),
  create:  wrap(req => FooterLinkService.create(req.body),                     'Link criado', 201),
  update:  wrap(req => FooterLinkService.update(req.params.id, req.body),      'Link atualizado'),
  remove:  wrap(req => FooterLinkService.remove(req.params.id),                'Link removido'),
};

/* ───── CTAButton (upsert por key) ───── */
export const CTAButtonController = {
  list:     wrap(req => CTAButtonService.list({ isActive: req.query.isActive as string }), 'CTAs'),
  getByKey: wrap(req => CTAButtonService.getByKey(req.params.key),  'CTA'),
  upsert:   wrap(req => CTAButtonService.upsert(req.body),          'CTA salvo'),
  remove:   wrap(req => CTAButtonService.remove(req.params.key),    'CTA removido'),
};

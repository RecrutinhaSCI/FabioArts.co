import prisma from '../prisma/client';
import { ApiError } from '../utils/ApiError';

/* ============================================================
   Helpers genéricos para coleções de conteúdo do site público.
   Todos os models seguem o mesmo shape: id, order, isActive,
   createdAt/updatedAt — listas ordenadas por `order`.
   ============================================================ */

type Repo<TCreate, TUpdate> = {
  list: (opts: { isActive?: string; search?: string }) => Promise<unknown[]>;
  getById: (id: string) => Promise<unknown>;
  create: (dto: TCreate) => Promise<unknown>;
  update: (id: string, dto: TUpdate) => Promise<unknown>;
  remove: (id: string) => Promise<{ id: string }>;
};

function activeFilter(isActive?: string) {
  if (isActive === 'true')  return { isActive: true };
  if (isActive === 'false') return { isActive: false };
  return {};
}

/* ────────── AboutStat ────────── */
export interface CreateAboutStatDTO {
  number: string; suffix?: string | null; label: string;
  order?: number; isActive?: boolean;
}
export type UpdateAboutStatDTO = Partial<CreateAboutStatDTO>;

export const AboutStatService = {
  async list(opts: { isActive?: string }) {
    return prisma.aboutStat.findMany({
      where: activeFilter(opts.isActive),
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });
  },
  async getById(id: string) {
    const r = await prisma.aboutStat.findUnique({ where: { id } });
    if (!r) throw ApiError.notFound('Estatística não encontrada');
    return r;
  },
  async create(dto: CreateAboutStatDTO) {
    if (!dto.number?.trim()) throw ApiError.badRequest('number é obrigatório');
    if (!dto.label?.trim())  throw ApiError.badRequest('label é obrigatório');
    return prisma.aboutStat.create({
      data: {
        number: dto.number.trim(),
        suffix: dto.suffix ?? null,
        label:  dto.label.trim(),
        order:  dto.order ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
  },
  async update(id: string, dto: UpdateAboutStatDTO) {
    await this.getById(id);
    return prisma.aboutStat.update({
      where: { id },
      data: {
        ...(dto.number   !== undefined && { number: dto.number }),
        ...(dto.suffix   !== undefined && { suffix: dto.suffix }),
        ...(dto.label    !== undefined && { label:  dto.label }),
        ...(dto.order    !== undefined && { order:  dto.order }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  },
  async remove(id: string) {
    await this.getById(id);
    await prisma.aboutStat.delete({ where: { id } });
    return { id };
  },
};

/* ────────── MentorshipFeature ────────── */
export interface CreateMentorshipFeatureDTO {
  icon?: string | null; text: string; order?: number; isActive?: boolean;
}
export type UpdateMentorshipFeatureDTO = Partial<CreateMentorshipFeatureDTO>;

export const MentorshipFeatureService = {
  async list(opts: { isActive?: string }) {
    return prisma.mentorshipFeature.findMany({
      where: activeFilter(opts.isActive),
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });
  },
  async getById(id: string) {
    const r = await prisma.mentorshipFeature.findUnique({ where: { id } });
    if (!r) throw ApiError.notFound('Feature não encontrada');
    return r;
  },
  async create(dto: CreateMentorshipFeatureDTO) {
    if (!dto.text?.trim()) throw ApiError.badRequest('text é obrigatório');
    return prisma.mentorshipFeature.create({
      data: {
        icon:  dto.icon ?? null,
        text:  dto.text.trim(),
        order: dto.order ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
  },
  async update(id: string, dto: UpdateMentorshipFeatureDTO) {
    await this.getById(id);
    return prisma.mentorshipFeature.update({
      where: { id },
      data: {
        ...(dto.icon     !== undefined && { icon: dto.icon }),
        ...(dto.text     !== undefined && { text: dto.text }),
        ...(dto.order    !== undefined && { order: dto.order }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  },
  async remove(id: string) {
    await this.getById(id);
    await prisma.mentorshipFeature.delete({ where: { id } });
    return { id };
  },
};

/* ────────── ProcessStep ────────── */
export interface CreateProcessStepDTO {
  stepNumber: string; title: string; description: string;
  icon?: string | null; order?: number; isActive?: boolean;
}
export type UpdateProcessStepDTO = Partial<CreateProcessStepDTO>;

export const ProcessStepService = {
  async list(opts: { isActive?: string }) {
    return prisma.processStep.findMany({
      where: activeFilter(opts.isActive),
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });
  },
  async getById(id: string) {
    const r = await prisma.processStep.findUnique({ where: { id } });
    if (!r) throw ApiError.notFound('Passo não encontrado');
    return r;
  },
  async create(dto: CreateProcessStepDTO) {
    if (!dto.stepNumber?.trim())  throw ApiError.badRequest('stepNumber é obrigatório');
    if (!dto.title?.trim())       throw ApiError.badRequest('title é obrigatório');
    if (!dto.description?.trim()) throw ApiError.badRequest('description é obrigatória');
    return prisma.processStep.create({
      data: {
        stepNumber:  dto.stepNumber.trim(),
        title:       dto.title.trim(),
        description: dto.description.trim(),
        icon:        dto.icon ?? null,
        order:       dto.order ?? 0,
        isActive:    dto.isActive ?? true,
      },
    });
  },
  async update(id: string, dto: UpdateProcessStepDTO) {
    await this.getById(id);
    return prisma.processStep.update({
      where: { id },
      data: {
        ...(dto.stepNumber  !== undefined && { stepNumber: dto.stepNumber }),
        ...(dto.title       !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.icon        !== undefined && { icon: dto.icon }),
        ...(dto.order       !== undefined && { order: dto.order }),
        ...(dto.isActive    !== undefined && { isActive: dto.isActive }),
      },
    });
  },
  async remove(id: string) {
    await this.getById(id);
    await prisma.processStep.delete({ where: { id } });
    return { id };
  },
};

/* ────────── Course ────────── */
import { CourseLevel } from '@prisma/client';

const COURSE_LEVELS: CourseLevel[] = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];

export interface CreateCourseDTO {
  title: string; category: string; description: string;
  level?: CourseLevel; duration?: string | null; price?: string | null;
  image?: string | null; externalUrl?: string | null; label?: string | null;
  isActive?: boolean; isFeatured?: boolean; order?: number;
}
export type UpdateCourseDTO = Partial<CreateCourseDTO>;

export interface ListCoursesOptions {
  isActive?: string; isFeatured?: string; level?: string; search?: string;
}

export const CourseService = {
  async list(opts: ListCoursesOptions) {
    const where: Record<string, unknown> = {};
    if (opts.isActive   !== undefined) where.isActive   = opts.isActive   === 'true';
    if (opts.isFeatured !== undefined) where.isFeatured = opts.isFeatured === 'true';
    if (opts.level && COURSE_LEVELS.includes(opts.level as CourseLevel)) {
      where.level = opts.level;
    }
    if (opts.search) {
      where.OR = [
        { title:       { contains: opts.search, mode: 'insensitive' } },
        { description: { contains: opts.search, mode: 'insensitive' } },
      ];
    }
    return prisma.course.findMany({
      where,
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });
  },
  async getById(id: string) {
    const r = await prisma.course.findUnique({ where: { id } });
    if (!r) throw ApiError.notFound('Curso não encontrado');
    return r;
  },
  async create(dto: CreateCourseDTO) {
    if (!dto.title?.trim())       throw ApiError.badRequest('title é obrigatório');
    if (!dto.category?.trim())    throw ApiError.badRequest('category é obrigatória');
    if (!dto.description?.trim()) throw ApiError.badRequest('description é obrigatória');
    if (dto.level && !COURSE_LEVELS.includes(dto.level)) {
      throw ApiError.badRequest(`level inválido. Valores: ${COURSE_LEVELS.join(', ')}`);
    }
    return prisma.course.create({
      data: {
        title:       dto.title.trim(),
        category:    dto.category.trim(),
        description: dto.description.trim(),
        level:       dto.level ?? 'BEGINNER',
        duration:    dto.duration    ?? null,
        price:       dto.price       ?? null,
        image:       dto.image       ?? null,
        externalUrl: dto.externalUrl ?? null,
        label:       dto.label       ?? null,
        isActive:    dto.isActive    ?? true,
        isFeatured:  dto.isFeatured  ?? false,
        order:       dto.order       ?? 0,
      },
    });
  },
  async update(id: string, dto: UpdateCourseDTO) {
    await this.getById(id);
    if (dto.level && !COURSE_LEVELS.includes(dto.level)) {
      throw ApiError.badRequest(`level inválido. Valores: ${COURSE_LEVELS.join(', ')}`);
    }
    return prisma.course.update({
      where: { id },
      data: {
        ...(dto.title       !== undefined && { title: dto.title }),
        ...(dto.category    !== undefined && { category: dto.category }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.level       !== undefined && { level: dto.level }),
        ...(dto.duration    !== undefined && { duration: dto.duration }),
        ...(dto.price       !== undefined && { price: dto.price }),
        ...(dto.image       !== undefined && { image: dto.image }),
        ...(dto.externalUrl !== undefined && { externalUrl: dto.externalUrl }),
        ...(dto.label       !== undefined && { label: dto.label }),
        ...(dto.isActive    !== undefined && { isActive: dto.isActive }),
        ...(dto.isFeatured  !== undefined && { isFeatured: dto.isFeatured }),
        ...(dto.order       !== undefined && { order: dto.order }),
      },
    });
  },
  async remove(id: string) {
    await this.getById(id);
    await prisma.course.delete({ where: { id } });
    return { id };
  },
};

/* ────────── FooterColumn + FooterLink ────────── */
export interface CreateFooterColumnDTO {
  title: string; order?: number; isActive?: boolean;
}
export type UpdateFooterColumnDTO = Partial<CreateFooterColumnDTO>;

export const FooterColumnService = {
  /** GET público inclui links ativos para reduzir round-trips. */
  async list(opts: { isActive?: string }) {
    return prisma.footerColumn.findMany({
      where: activeFilter(opts.isActive),
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      include: {
        links: {
          where: opts.isActive === 'true' ? { isActive: true } : {},
          orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
        },
      },
    });
  },
  async getById(id: string) {
    const r = await prisma.footerColumn.findUnique({
      where: { id },
      include: { links: { orderBy: [{ order: 'asc' }] } },
    });
    if (!r) throw ApiError.notFound('Coluna não encontrada');
    return r;
  },
  async create(dto: CreateFooterColumnDTO) {
    if (!dto.title?.trim()) throw ApiError.badRequest('title é obrigatório');
    return prisma.footerColumn.create({
      data: {
        title: dto.title.trim(),
        order: dto.order ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
  },
  async update(id: string, dto: UpdateFooterColumnDTO) {
    await this.getById(id);
    return prisma.footerColumn.update({
      where: { id },
      data: {
        ...(dto.title    !== undefined && { title: dto.title }),
        ...(dto.order    !== undefined && { order: dto.order }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  },
  async remove(id: string) {
    await this.getById(id);
    await prisma.footerColumn.delete({ where: { id } });
    return { id };
  },
};

export interface CreateFooterLinkDTO {
  columnId: string; label: string; url: string;
  isExternal?: boolean; order?: number; isActive?: boolean;
}
export type UpdateFooterLinkDTO = Partial<Omit<CreateFooterLinkDTO, 'columnId'>> & { columnId?: string };

export const FooterLinkService = {
  async list(opts: { columnId?: string; isActive?: string }) {
    const where: Record<string, unknown> = {};
    if (opts.columnId) where.columnId = opts.columnId;
    if (opts.isActive !== undefined) where.isActive = opts.isActive === 'true';
    return prisma.footerLink.findMany({
      where,
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });
  },
  async getById(id: string) {
    const r = await prisma.footerLink.findUnique({ where: { id } });
    if (!r) throw ApiError.notFound('Link não encontrado');
    return r;
  },
  async create(dto: CreateFooterLinkDTO) {
    if (!dto.columnId?.trim()) throw ApiError.badRequest('columnId é obrigatório');
    if (!dto.label?.trim())    throw ApiError.badRequest('label é obrigatório');
    if (!dto.url?.trim())      throw ApiError.badRequest('url é obrigatória');
    const column = await prisma.footerColumn.findUnique({ where: { id: dto.columnId } });
    if (!column) throw ApiError.badRequest('columnId não encontrado');
    return prisma.footerLink.create({
      data: {
        columnId:   dto.columnId,
        label:      dto.label.trim(),
        url:        dto.url.trim(),
        isExternal: dto.isExternal ?? false,
        order:      dto.order ?? 0,
        isActive:   dto.isActive ?? true,
      },
    });
  },
  async update(id: string, dto: UpdateFooterLinkDTO) {
    await this.getById(id);
    if (dto.columnId) {
      const column = await prisma.footerColumn.findUnique({ where: { id: dto.columnId } });
      if (!column) throw ApiError.badRequest('columnId não encontrado');
    }
    return prisma.footerLink.update({
      where: { id },
      data: {
        ...(dto.columnId   !== undefined && { columnId: dto.columnId }),
        ...(dto.label      !== undefined && { label: dto.label }),
        ...(dto.url        !== undefined && { url: dto.url }),
        ...(dto.isExternal !== undefined && { isExternal: dto.isExternal }),
        ...(dto.order      !== undefined && { order: dto.order }),
        ...(dto.isActive   !== undefined && { isActive: dto.isActive }),
      },
    });
  },
  async remove(id: string) {
    await this.getById(id);
    await prisma.footerLink.delete({ where: { id } });
    return { id };
  },
};

/* ────────── CTAButton ────────── */
export interface UpsertCTAButtonDTO {
  key: string; label: string; url: string;
  isExternal?: boolean; isActive?: boolean;
}

export const CTAButtonService = {
  async list(opts: { isActive?: string }) {
    return prisma.cTAButton.findMany({
      where: activeFilter(opts.isActive),
      orderBy: [{ key: 'asc' }],
    });
  },
  async getByKey(key: string) {
    const r = await prisma.cTAButton.findUnique({ where: { key } });
    if (!r) throw ApiError.notFound(`CTA "${key}" não encontrado`);
    return r;
  },
  /** Upsert por `key` — simplifica o admin (não precisa diferenciar create/update). */
  async upsert(dto: UpsertCTAButtonDTO) {
    if (!dto.key?.trim())   throw ApiError.badRequest('key é obrigatório');
    if (!dto.label?.trim()) throw ApiError.badRequest('label é obrigatório');
    if (!dto.url?.trim())   throw ApiError.badRequest('url é obrigatória');
    return prisma.cTAButton.upsert({
      where: { key: dto.key },
      create: {
        key:        dto.key.trim(),
        label:      dto.label.trim(),
        url:        dto.url.trim(),
        isExternal: dto.isExternal ?? false,
        isActive:   dto.isActive   ?? true,
      },
      update: {
        label:      dto.label.trim(),
        url:        dto.url.trim(),
        isExternal: dto.isExternal ?? false,
        isActive:   dto.isActive   ?? true,
      },
    });
  },
  async remove(key: string) {
    await this.getByKey(key);
    await prisma.cTAButton.delete({ where: { key } });
    return { key };
  },
};

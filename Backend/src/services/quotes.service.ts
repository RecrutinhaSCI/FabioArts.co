import prisma from '../prisma/client';
import { QuoteStatus } from '@prisma/client';
import { ApiError }    from '../utils/ApiError';

export interface CreateQuoteDTO {
  name:             string;
  email:            string;
  whatsapp:         string;
  company?:         string | null;
  projectType:      string;
  description:      string;
  estimatedBudget?: string | null;
}

export interface ListQuotesOptions {
  status?: string;
  search?: string;
  page?:   string;
  limit?:  string;
}

const VALID_STATUS: QuoteStatus[] = ['PENDING', 'REPLIED', 'CLOSED', 'CANCELLED'];

export const QuotesService = {

  async create(dto: CreateQuoteDTO) {
    if (!dto.name?.trim())        throw ApiError.badRequest('name é obrigatório');
    if (!dto.email?.trim())       throw ApiError.badRequest('email é obrigatório');
    if (!dto.whatsapp?.trim())    throw ApiError.badRequest('whatsapp é obrigatório');
    if (!dto.projectType?.trim()) throw ApiError.badRequest('projectType é obrigatório');
    if (!dto.description?.trim()) throw ApiError.badRequest('description é obrigatória');

    // Limites de tamanho (anti-abuse)
    const MAX = { name: 120, email: 160, whatsapp: 40, company: 160, projectType: 80, description: 5000, estimatedBudget: 60 };
    if (dto.name.length            > MAX.name)            throw ApiError.badRequest(`name muito longo (máx ${MAX.name})`);
    if (dto.email.length           > MAX.email)           throw ApiError.badRequest(`email muito longo (máx ${MAX.email})`);
    if (dto.whatsapp.length        > MAX.whatsapp)        throw ApiError.badRequest(`whatsapp muito longo (máx ${MAX.whatsapp})`);
    if ((dto.company       || '').length > MAX.company)       throw ApiError.badRequest(`company muito longo (máx ${MAX.company})`);
    if (dto.projectType.length     > MAX.projectType)     throw ApiError.badRequest(`projectType muito longo (máx ${MAX.projectType})`);
    if (dto.description.length     > MAX.description)     throw ApiError.badRequest(`description muito longa (máx ${MAX.description} caracteres)`);
    if ((dto.estimatedBudget||'').length > MAX.estimatedBudget) throw ApiError.badRequest(`estimatedBudget muito longo (máx ${MAX.estimatedBudget})`);

    // Validação básica de e-mail
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dto.email)) {
      throw ApiError.badRequest('email inválido');
    }

    return prisma.quote.create({
      data: {
        name:            dto.name.trim(),
        email:           dto.email.toLowerCase().trim(),
        whatsapp:        dto.whatsapp.trim(),
        company:         dto.company         ?? null,
        projectType:     dto.projectType.trim(),
        description:     dto.description.trim(),
        estimatedBudget: dto.estimatedBudget ?? null,
      },
    });
  },

  async list(opts: ListQuotesOptions) {
    const page  = Math.max(1, parseInt(opts.page  || '1',  10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(opts.limit || '20', 10) || 20));

    const where: Record<string, unknown> = {};
    if (opts.status) {
      if (!VALID_STATUS.includes(opts.status as QuoteStatus)) {
        throw ApiError.badRequest(`Status inválido. Aceitos: ${VALID_STATUS.join(', ')}`);
      }
      where.status = opts.status as QuoteStatus;
    }
    if (opts.search) {
      where.OR = [
        { name:  { contains: opts.search, mode: 'insensitive' } },
        { email: { contains: opts.search, mode: 'insensitive' } },
        { projectType: { contains: opts.search, mode: 'insensitive' } },
      ];
    }

    const [total, data] = await Promise.all([
      prisma.quote.count({ where }),
      prisma.quote.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  },

  async getById(id: string) {
    const quote = await prisma.quote.findUnique({ where: { id } });
    if (!quote) throw ApiError.notFound('Orçamento não encontrado');
    return quote;
  },

  async updateStatus(id: string, status: string, adminNotes?: string) {
    if (!VALID_STATUS.includes(status as QuoteStatus)) {
      throw ApiError.badRequest(`Status inválido. Aceitos: ${VALID_STATUS.join(', ')}`);
    }
    await this.getById(id);

    return prisma.quote.update({
      where: { id },
      data: {
        status:     status as QuoteStatus,
        adminNotes: adminNotes ?? undefined,
        repliedAt:  status === 'REPLIED' ? new Date() : undefined,
      },
    });
  },

  async remove(id: string) {
    await this.getById(id);
    await prisma.quote.delete({ where: { id } });
    return { id };
  },

  async stats() {
    const [total, pending, replied, closed, cancelled] = await Promise.all([
      prisma.quote.count(),
      prisma.quote.count({ where: { status: 'PENDING' } }),
      prisma.quote.count({ where: { status: 'REPLIED' } }),
      prisma.quote.count({ where: { status: 'CLOSED' } }),
      prisma.quote.count({ where: { status: 'CANCELLED' } }),
    ]);
    return { total, pending, replied, closed, cancelled };
  },
};

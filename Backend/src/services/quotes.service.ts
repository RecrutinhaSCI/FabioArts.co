import prisma from '../prisma/client';
import { QuoteStatus } from '@prisma/client';
import { ApiError }    from '../utils/ApiError';
import { isActiveCategory } from '../constants/catalog';
import { normalizePhone, isValidPhone } from '../utils/phone';

export interface CreateQuoteDTO {
  name:             string;
  email:            string;
  whatsapp:         string;
  company?:         string | null;
  projectType:      string;
  description:      string;
  estimatedBudget?: string | null;
}

/** Orçamento lançado pelo admin: só o essencial (nome + telefone + tipo). */
export interface ManualQuoteDTO {
  name?:            string;
  whatsapp?:        string;
  projectType?:     string;
  estimatedBudget?: string | null;
  status?:          string;
  adminNotes?:      string | null;
}

export interface ListQuotesOptions {
  status?: string;
  search?: string;
  page?:   string;
  limit?:  string;
}

const VALID_STATUS: QuoteStatus[] = ['PENDING', 'REPLIED', 'CLOSED', 'CANCELLED'];

const QUOTE_INCLUDE = {
  client:  { select: { id: true, name: true, phone: true } },
  project: { select: { id: true, title: true, category: true, workStatus: true, deliveryDate: true } },
};

function validateManual(dto: ManualQuoteDTO, partial: boolean, currentType?: string) {
  const out: Record<string, unknown> = {};
  if (!partial || dto.name !== undefined) {
    const name = String(dto.name ?? '').trim();
    if (!name)             throw ApiError.badRequest('Nome é obrigatório.');
    if (name.length > 120) throw ApiError.badRequest('Nome muito longo (máx. 120).');
    out.name = name;
  }
  if (!partial || dto.whatsapp !== undefined) {
    const phone = String(dto.whatsapp ?? '').trim();
    if (!phone)               throw ApiError.badRequest('Telefone é obrigatório.');
    if (!isValidPhone(phone)) throw ApiError.badRequest('Telefone inválido. Use DDD + número, ex.: (54) 99999-9999.');
    out.whatsapp = phone;
  }
  if (!partial || dto.projectType !== undefined) {
    const type = String(dto.projectType ?? '');
    // Tipo antigo (texto livre do site) continua válido se não foi alterado.
    if (!isActiveCategory(type) && type !== currentType) {
      throw ApiError.badRequest('Selecione um tipo de projeto válido.');
    }
    out.projectType = type;
  }
  if (dto.estimatedBudget !== undefined) {
    const b = String(dto.estimatedBudget ?? '').trim();
    if (b.length > 60) throw ApiError.badRequest('Valor estimado muito longo (máx. 60).');
    out.estimatedBudget = b || null;
  }
  if (dto.status !== undefined) {
    if (!VALID_STATUS.includes(dto.status as QuoteStatus)) throw ApiError.badRequest('Status inválido.');
    out.status = dto.status;
  }
  if (dto.adminNotes !== undefined) {
    out.adminNotes = String(dto.adminNotes ?? '').trim() || null;
  }
  return out;
}

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

  /** POST /quotes/manual — admin, sem e-mail/empresa/descrição. */
  async createManual(dto: ManualQuoteDTO) {
    const data = validateManual(dto, false);
    // Vincula ao cliente já cadastrado com o mesmo telefone (não cria cliente).
    const client = await prisma.client.findUnique({
      where:  { phoneNormalized: normalizePhone(data.whatsapp) },
      select: { id: true },
    });
    return prisma.quote.create({
      data: {
        ...data,
        status:   (data.status as QuoteStatus) ?? 'PENDING',
        clientId: client?.id ?? null,
      },
      include: QUOTE_INCLUDE,
    });
  },

  /** PUT /quotes/:id — admin edita dados comerciais e acompanhamento. */
  async update(id: string, dto: ManualQuoteDTO) {
    const current = await this.getById(id);
    const data = validateManual(dto, true, current.projectType);
    if (!Object.keys(data).length) throw ApiError.badRequest('Nenhum campo para atualizar');
    if (data.status === 'REPLIED' && current.status !== 'REPLIED') data.repliedAt = new Date();
    return prisma.quote.update({ where: { id }, data, include: QUOTE_INCLUDE });
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
        { whatsapp: { contains: opts.search, mode: 'insensitive' } },
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
        include: QUOTE_INCLUDE,
      }),
    ]);

    return {
      data,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  },

  async getById(id: string) {
    const quote = await prisma.quote.findUnique({ where: { id }, include: QUOTE_INCLUDE });
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

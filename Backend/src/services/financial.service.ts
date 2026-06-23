import prisma from '../prisma/client';
import { ApiError } from '../utils/ApiError';
import { FinancialType, FinancialStatus } from '@prisma/client';

/* ============================================================
   FinancialEntry — entradas e saídas com vínculo opcional a
   client/project/quote. amount em Float (MVP); migrar para
   Decimal em revisão futura para precisão monetária.
   ============================================================ */

const TYPES:   FinancialType[]   = ['INCOME', 'EXPENSE'];
const STATUSES: FinancialStatus[] = ['PAID', 'PENDING', 'CANCELLED'];

export interface CreateFinancialEntryDTO {
  type: FinancialType;
  amount: number;
  currency?: string;
  description: string;
  category?: string | null;
  status?: FinancialStatus;
  occurredAt: string;     // ISO date
  dueDate?: string | null;
  paymentMethod?: string | null;
  notes?: string | null;
  clientId?: string | null;
  projectId?: string | null;
  quoteId?: string | null;
}

export type UpdateFinancialEntryDTO = Partial<CreateFinancialEntryDTO>;

export interface ListFinancialOptions {
  type?: string;
  status?: string;
  month?: string;      // YYYY-MM
  category?: string;
  search?: string;
  clientId?: string;
  projectId?: string;
  page?: string;
  limit?: string;
}

function monthRange(yyyymm: string): { gte: Date; lt: Date } | null {
  if (!/^\d{4}-\d{2}$/.test(yyyymm)) return null;
  const [y, m] = yyyymm.split('-').map(Number);
  const gte = new Date(Date.UTC(y, m - 1, 1));
  const lt  = new Date(Date.UTC(y, m, 1));
  return { gte, lt };
}

export const FinancialService = {

  async list(opts: ListFinancialOptions) {
    const page  = Math.max(1, parseInt(opts.page  || '1',  10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(opts.limit || '50', 10) || 50));

    const where: Record<string, unknown> = {};

    if (opts.type) {
      if (!TYPES.includes(opts.type as FinancialType)) {
        throw ApiError.badRequest(`type inválido. Valores: ${TYPES.join(', ')}`);
      }
      where.type = opts.type;
    }
    if (opts.status) {
      if (!STATUSES.includes(opts.status as FinancialStatus)) {
        throw ApiError.badRequest(`status inválido. Valores: ${STATUSES.join(', ')}`);
      }
      where.status = opts.status;
    }
    if (opts.month) {
      const range = monthRange(opts.month);
      if (!range) throw ApiError.badRequest('month deve estar no formato YYYY-MM');
      where.occurredAt = range;
    }
    if (opts.category) {
      where.category = { contains: opts.category, mode: 'insensitive' };
    }
    if (opts.clientId)  where.clientId  = opts.clientId;
    if (opts.projectId) where.projectId = opts.projectId;
    if (opts.search) {
      where.OR = [
        { description: { contains: opts.search, mode: 'insensitive' } },
        { notes:       { contains: opts.search, mode: 'insensitive' } },
      ];
    }

    const [total, data] = await Promise.all([
      prisma.financialEntry.count({ where }),
      prisma.financialEntry.findMany({
        where,
        orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          client:  { select: { id: true, name: true, company: true } },
          project: { select: { id: true, title: true, slug: true } },
          quote:   { select: { id: true, name: true, projectType: true } },
        },
      }),
    ]);

    return {
      data,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  },

  async getById(id: string) {
    const r = await prisma.financialEntry.findUnique({
      where: { id },
      include: {
        client:  { select: { id: true, name: true, company: true } },
        project: { select: { id: true, title: true, slug: true } },
        quote:   { select: { id: true, name: true, projectType: true } },
      },
    });
    if (!r) throw ApiError.notFound('Lançamento não encontrado');
    return r;
  },

  async create(dto: CreateFinancialEntryDTO) {
    if (!dto.type)              throw ApiError.badRequest('type é obrigatório (INCOME|EXPENSE)');
    if (!TYPES.includes(dto.type)) throw ApiError.badRequest(`type inválido. Valores: ${TYPES.join(', ')}`);
    if (typeof dto.amount !== 'number' || !Number.isFinite(dto.amount)) {
      throw ApiError.badRequest('amount é obrigatório e deve ser numérico');
    }
    if (dto.amount < 0)         throw ApiError.badRequest('amount não pode ser negativo (use type=EXPENSE)');
    if (!dto.description?.trim()) throw ApiError.badRequest('description é obrigatória');
    if (!dto.occurredAt)        throw ApiError.badRequest('occurredAt é obrigatório');
    if (dto.status && !STATUSES.includes(dto.status)) {
      throw ApiError.badRequest(`status inválido. Valores: ${STATUSES.join(', ')}`);
    }

    // Valida FKs opcionais
    if (dto.clientId) {
      const c = await prisma.client.findUnique({ where: { id: dto.clientId } });
      if (!c) throw ApiError.badRequest('clientId não encontrado');
    }
    if (dto.projectId) {
      const p = await prisma.project.findUnique({ where: { id: dto.projectId } });
      if (!p) throw ApiError.badRequest('projectId não encontrado');
    }
    if (dto.quoteId) {
      const q = await prisma.quote.findUnique({ where: { id: dto.quoteId } });
      if (!q) throw ApiError.badRequest('quoteId não encontrado');
    }

    return prisma.financialEntry.create({
      data: {
        type:          dto.type,
        amount:        dto.amount,
        currency:      dto.currency ?? 'BRL',
        description:   dto.description.trim(),
        category:      dto.category ?? null,
        status:        dto.status ?? 'PAID',
        occurredAt:    new Date(dto.occurredAt),
        dueDate:       dto.dueDate ? new Date(dto.dueDate) : null,
        paymentMethod: dto.paymentMethod ?? null,
        notes:         dto.notes ?? null,
        clientId:      dto.clientId ?? null,
        projectId:     dto.projectId ?? null,
        quoteId:       dto.quoteId ?? null,
      },
    });
  },

  async update(id: string, dto: UpdateFinancialEntryDTO) {
    await this.getById(id);

    if (dto.type && !TYPES.includes(dto.type)) {
      throw ApiError.badRequest(`type inválido. Valores: ${TYPES.join(', ')}`);
    }
    if (dto.status && !STATUSES.includes(dto.status)) {
      throw ApiError.badRequest(`status inválido. Valores: ${STATUSES.join(', ')}`);
    }
    if (dto.amount !== undefined && (typeof dto.amount !== 'number' || dto.amount < 0)) {
      throw ApiError.badRequest('amount inválido');
    }

    if (dto.clientId) {
      const c = await prisma.client.findUnique({ where: { id: dto.clientId } });
      if (!c) throw ApiError.badRequest('clientId não encontrado');
    }
    if (dto.projectId) {
      const p = await prisma.project.findUnique({ where: { id: dto.projectId } });
      if (!p) throw ApiError.badRequest('projectId não encontrado');
    }
    if (dto.quoteId) {
      const q = await prisma.quote.findUnique({ where: { id: dto.quoteId } });
      if (!q) throw ApiError.badRequest('quoteId não encontrado');
    }

    return prisma.financialEntry.update({
      where: { id },
      data: {
        ...(dto.type          !== undefined && { type: dto.type }),
        ...(dto.amount        !== undefined && { amount: dto.amount }),
        ...(dto.currency      !== undefined && { currency: dto.currency }),
        ...(dto.description   !== undefined && { description: dto.description }),
        ...(dto.category      !== undefined && { category: dto.category }),
        ...(dto.status        !== undefined && { status: dto.status }),
        ...(dto.occurredAt    !== undefined && { occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : null }),
        ...(dto.dueDate       !== undefined && { dueDate: dto.dueDate ? new Date(dto.dueDate) : null }),
        ...(dto.paymentMethod !== undefined && { paymentMethod: dto.paymentMethod }),
        ...(dto.notes         !== undefined && { notes: dto.notes }),
        ...(dto.clientId      !== undefined && { clientId: dto.clientId }),
        ...(dto.projectId     !== undefined && { projectId: dto.projectId }),
        ...(dto.quoteId       !== undefined && { quoteId: dto.quoteId }),
      },
    });
  },

  async remove(id: string) {
    await this.getById(id);
    await prisma.financialEntry.delete({ where: { id } });
    return { id };
  },

  /** Stats agregadas. Sem `month` → mês corrente. */
  async stats(opts: { month?: string }) {
    const month = opts.month && /^\d{4}-\d{2}$/.test(opts.month)
      ? opts.month
      : new Date().toISOString().slice(0, 7);

    const range = monthRange(month)!;

    const [incomeAgg, expenseAgg, pendingAgg, allTimeAgg] = await Promise.all([
      prisma.financialEntry.aggregate({
        where: { type: 'INCOME', status: 'PAID', occurredAt: range },
        _sum: { amount: true }, _count: { _all: true },
      }),
      prisma.financialEntry.aggregate({
        where: { type: 'EXPENSE', status: 'PAID', occurredAt: range },
        _sum: { amount: true }, _count: { _all: true },
      }),
      prisma.financialEntry.aggregate({
        where: { status: 'PENDING' },
        _sum: { amount: true }, _count: { _all: true },
      }),
      prisma.financialEntry.aggregate({
        where: { status: 'PAID' },
        _sum: { amount: true },
      }),
    ]);

    const incomeMonth  = incomeAgg._sum.amount  ?? 0;
    const expenseMonth = expenseAgg._sum.amount ?? 0;

    return {
      month,
      incomeMonth,
      expenseMonth,
      balanceMonth:  incomeMonth - expenseMonth,
      incomeCount:   incomeAgg._count._all,
      expenseCount:  expenseAgg._count._all,
      pendingTotal:  pendingAgg._sum.amount ?? 0,
      pendingCount:  pendingAgg._count._all,
      allTimePaid:   allTimeAgg._sum.amount ?? 0,
    };
  },
};

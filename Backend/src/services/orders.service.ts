import { randomBytes } from 'crypto';
import defaultPrisma from '../prisma/client';
import { ApiError } from '../utils/ApiError';
import { slugify } from '../utils/slugify';
import { normalizePhone, isValidPhone } from '../utils/phone';
import { isDateOnly, parseDateInput, dateOnlyToUTC, todayISO, addDaysISO } from '../utils/dates';
import {
  isActiveCategory, categoryLabel,
  ORDER_FINANCIAL_STATUS_CODES, PAYMENT_METHOD_CODES,
  WORK_STATUS_CODES, OPEN_WORK_STATUSES,
} from '../constants/catalog';

/* ============================================================
   PEDIDOS — camada agregadora (sem tabela própria).

   Um pedido é um Projeto com cliente vinculado. O fluxo "Novo
   Pedido" cria, numa única transação:
     Cliente (reaproveitado pelo telefone) → Projeto (rascunho)
     → Orçamento (quotes) → Lançamento financeiro (INCOME)
   ============================================================ */

// prisma/client.ts exporta via require → tipado como any; mantemos o
// parâmetro `db` para os testes poderem injetar falhas na transação.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = any;

/** Janela da agenda: hoje + 14 dias (15 dias contando hoje). */
export const DELIVERY_WINDOW_DAYS = 14;

export interface CreateOrderDTO {
  clientId?: string | null;
  client?: { name?: string; phone?: string } | null;
  project?: { category?: string; carModel?: string | null } | null;
  commercial?: {
    amount?: number | string;
    launchDate?: string;
    deliveryDate?: string;
    financialStatus?: string;
    paymentMethod?: string;
  } | null;
}

export interface ListOrdersOptions {
  search?: string;
  workStatus?: string;
  financialStatus?: string;
  page?: string;
  limit?: string;
}

const CLIENT_SELECT = { id: true, name: true, phone: true, instagram: true, website: true, isActive: true };

function brl(v: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

function parseAmount(v: unknown): number {
  if (typeof v === 'number') return v;
  if (typeof v !== 'string') return NaN;
  // aceita "850", "850,00", "1.250,50" e "1250.50"
  const s = v.replace(/[R$\s]/g, '');
  const normalized = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s;
  return normalized ? Number(normalized) : NaN;
}

function projectTitle(category: string, carModel: string | null, clientName: string): string {
  return `${categoryLabel(category)} — ${carModel || clientName}`;
}

/** Valida e normaliza o payload do Novo Pedido. Lança 400 com mensagem clara. */
export function validateOrder(dto: CreateOrderDTO) {
  const errors: { field: string; message: string }[] = [];
  const add = (field: string, message: string) => errors.push({ field, message });

  const clientId = dto.clientId ? String(dto.clientId) : null;
  const name  = String(dto.client?.name ?? '').trim();
  const phone = String(dto.client?.phone ?? '').trim();
  if (!clientId) {
    if (!name)                     add('client.name', 'Nome do cliente é obrigatório.');
    else if (name.length > 120)    add('client.name', 'Nome muito longo (máx. 120).');
    if (!phone)                    add('client.phone', 'Telefone é obrigatório.');
    else if (!isValidPhone(phone)) add('client.phone', 'Telefone inválido. Use DDD + número, ex.: (54) 99999-9999.');
  }

  const category = String(dto.project?.category ?? '');
  if (!isActiveCategory(category)) add('project.category', 'Selecione uma categoria válida.');
  const carModel = String(dto.project?.carModel ?? '').trim() || null;
  if (carModel && carModel.length > 120) add('project.carModel', 'Modelo do carro muito longo (máx. 120).');

  const c = dto.commercial ?? {};
  const amount = parseAmount(c.amount);
  if (!Number.isFinite(amount) || amount < 0) add('commercial.amount', 'Informe um valor válido (ex.: 850,00).');
  else if (amount > 10_000_000)               add('commercial.amount', 'Valor muito alto.');

  const launchDate   = String(c.launchDate ?? '');
  const deliveryDate = String(c.deliveryDate ?? '');
  if (!isDateOnly(launchDate))   add('commercial.launchDate', 'Data de lançamento inválida.');
  if (!isDateOnly(deliveryDate)) add('commercial.deliveryDate', 'Data de entrega inválida.');
  else if (isDateOnly(launchDate) && deliveryDate < launchDate) {
    add('commercial.deliveryDate', 'A entrega não pode ser antes do lançamento.');
  }

  const financialStatus = String(c.financialStatus ?? '');
  if (!ORDER_FINANCIAL_STATUS_CODES.includes(financialStatus)) {
    add('commercial.financialStatus', 'Status financeiro inválido (Pendente, Parcialmente pago ou Pago).');
  }
  const paymentMethod = String(c.paymentMethod ?? '').toUpperCase();
  if (!PAYMENT_METHOD_CODES.includes(paymentMethod)) {
    add('commercial.paymentMethod', 'Método de pagamento inválido (Pix, Cartão ou Boleto).');
  }

  if (errors.length) throw ApiError.badRequest(errors[0].message, errors);

  return {
    clientId, name, phone, phoneNormalized: normalizePhone(phone),
    category, carModel, amount, launchDate, deliveryDate, financialStatus, paymentMethod,
  };
}

function isUniqueViolation(err: unknown, field: string): boolean {
  const e = err as { code?: string; meta?: { target?: string[] | string } };
  if (e?.code !== 'P2002') return false;
  const t = e.meta?.target;
  return Array.isArray(t) ? t.includes(field) : String(t ?? '').includes(field);
}

/** Formata um projeto (com relações) como "pedido" para a API. */
function toOrder(p: Db) {
  const quote = p.quotes?.[0] ?? null;
  const fin   = p.financialEntries?.[0] ?? null;
  return {
    id:           p.id,
    projectId:    p.id,
    title:        p.title,
    category:     p.category,
    carModel:     p.carModel ?? null,
    workStatus:   p.workStatus,
    launchDate:   p.projectDate ?? p.createdAt,
    deliveryDate: p.deliveryDate ? new Date(p.deliveryDate).toISOString().slice(0, 10) : null,
    isPublished:  p.isPublished,
    isFeatured:   p.isFeatured,
    createdAt:    p.createdAt,
    client: p.client ?? null,
    quote: quote && {
      id: quote.id, status: quote.status, estimatedBudget: quote.estimatedBudget, projectType: quote.projectType,
    },
    financial: fin && {
      id: fin.id, amount: fin.amount, status: fin.status, paymentMethod: fin.paymentMethod, occurredAt: fin.occurredAt,
    },
    amount: fin?.amount ?? null,
  };
}

const ORDER_INCLUDE = {
  client: { select: CLIENT_SELECT },
  quotes: { orderBy: { createdAt: 'desc' }, take: 1 },
  financialEntries: { where: { type: 'INCOME' }, orderBy: { createdAt: 'desc' }, take: 1 },
};

export const OrdersService = {

  /** Etapa 1: procura cliente pelo telefone normalizado. */
  async lookupClientByPhone(phone: string, db: Db = defaultPrisma) {
    const normalized = normalizePhone(phone);
    if (!isValidPhone(phone)) throw ApiError.badRequest('Telefone inválido. Use DDD + número, ex.: (54) 99999-9999.');
    const client = await db.client.findUnique({
      where:  { phoneNormalized: normalized },
      select: { ...CLIENT_SELECT, _count: { select: { projects: true } } },
    });
    if (!client) return { found: false, client: null };
    const { _count, ...rest } = client;
    return { found: true, client: { ...rest, projectsCount: _count.projects } };
  },

  /**
   * Cria o pedido completo em uma transação. Se qualquer etapa falhar,
   * nada é gravado (sem cliente/projeto/orçamento órfão).
   */
  async create(dto: CreateOrderDTO, db: Db = defaultPrisma) {
    const v = validateOrder(dto);

    const run = () => db.$transaction(async (tx: Db) => {
      // 1) Cliente — reaproveita pelo id ou pelo telefone; nunca duplica.
      let client = null;
      let clientReused = false;
      if (v.clientId) {
        client = await tx.client.findUnique({ where: { id: v.clientId }, select: CLIENT_SELECT });
        if (!client) throw ApiError.badRequest('Cliente selecionado não encontrado.');
        clientReused = true;
      } else {
        client = await tx.client.findUnique({ where: { phoneNormalized: v.phoneNormalized }, select: CLIENT_SELECT });
        if (client) {
          clientReused = true;
        } else {
          client = await tx.client.create({
            data:   { name: v.name, phone: v.phone, phoneNormalized: v.phoneNormalized, isActive: true },
            select: CLIENT_SELECT,
          });
        }
      }

      // 2) Projeto — nasce como rascunho, fora do portfólio e sem destaque.
      const title = projectTitle(v.category, v.carModel, client.name);
      const slug  = `${slugify(`${title}-${client.name}`).slice(0, 80)}-${randomBytes(3).toString('hex')}`;
      const project = await tx.project.create({
        data: {
          title, slug,
          description:  '',
          thumbnail:    '',
          tags:         [],
          category:     v.category,
          carModel:     v.carModel,
          clientId:     client.id,
          isPublished:  false,
          isFeatured:   false,
          workStatus:   'NOT_STARTED',
          projectDate:  parseDateInput(v.launchDate),
          deliveryDate: dateOnlyToUTC(v.deliveryDate),
        },
      });

      // 3) Orçamento — já fechado (o pedido foi aceito).
      const quote = await tx.quote.create({
        data: {
          name:            client.name,
          whatsapp:        client.phone || v.phone || '',
          projectType:     v.category,
          estimatedBudget: brl(v.amount),
          status:          'CLOSED',
          clientId:        client.id,
          projectId:       project.id,
        },
      });

      // 4) Financeiro — receita vinculada a cliente, projeto e orçamento.
      const financial = await tx.financialEntry.create({
        data: {
          type:          'INCOME',
          amount:        v.amount,
          description:   title,
          category:      categoryLabel(v.category),
          status:        v.financialStatus,
          occurredAt:    parseDateInput(v.launchDate),
          paymentMethod: v.paymentMethod,
          clientId:      client.id,
          projectId:     project.id,
          quoteId:       quote.id,
        },
      });

      return { client, clientReused, project, quote, financial };
    });

    try {
      return await run();
    } catch (err) {
      // Corrida: outro cadastro criou o mesmo telefone entre a busca e o insert.
      // O índice UNIQUE barrou o duplicado; repete reaproveitando o cliente.
      if (!v.clientId && isUniqueViolation(err, 'phoneNormalized')) return run();
      throw err;
    }
  },

  async list(opts: ListOrdersOptions, db: Db = defaultPrisma) {
    const page  = Math.max(1, parseInt(opts.page  || '1',  10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(opts.limit || '20', 10) || 20));

    const where: Record<string, unknown> = { clientId: { not: null } };
    if (opts.workStatus) {
      if (!WORK_STATUS_CODES.includes(opts.workStatus)) throw ApiError.badRequest('Status de andamento inválido.');
      where.workStatus = opts.workStatus;
    }
    if (opts.financialStatus) {
      if (![...ORDER_FINANCIAL_STATUS_CODES, 'CANCELLED'].includes(opts.financialStatus)) {
        throw ApiError.badRequest('Status financeiro inválido.');
      }
      where.financialEntries = { some: { type: 'INCOME', status: opts.financialStatus } };
    }
    if (opts.search) {
      const digits = normalizePhone(opts.search);
      where.OR = [
        { title:    { contains: opts.search, mode: 'insensitive' } },
        { carModel: { contains: opts.search, mode: 'insensitive' } },
        { client:   { name: { contains: opts.search, mode: 'insensitive' } } },
        ...(digits.length >= 4 ? [{ client: { phoneNormalized: { contains: digits } } }] : []),
      ];
    }

    const [total, rows] = await Promise.all([
      db.project.count({ where }),
      db.project.findMany({
        where,
        include: ORDER_INCLUDE,
        orderBy: [{ createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data: rows.map(toOrder),
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  },

  async getById(projectId: string, db: Db = defaultPrisma) {
    const p = await db.project.findUnique({
      where: { id: projectId },
      include: {
        client: { select: CLIENT_SELECT },
        quotes: { orderBy: { createdAt: 'desc' } },
        financialEntries: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!p || !p.clientId) throw ApiError.notFound('Pedido não encontrado');
    return { ...toOrder(p), quotes: p.quotes, financialEntries: p.financialEntries };
  },

  /**
   * Agenda de entregas: trabalhos em aberto com entrega até hoje + 14 dias.
   * Atrasados vêm primeiro (inclusive os de antes de hoje), depois por data.
   */
  async deliveries(now: Date = new Date(), db: Db = defaultPrisma) {
    const today = todayISO(now);
    const until = addDaysISO(today, DELIVERY_WINDOW_DAYS);

    const rows = await db.project.findMany({
      where: {
        deliveryDate: { not: null, lte: dateOnlyToUTC(until) },
        workStatus:   { in: OPEN_WORK_STATUSES },
      },
      include: { client: { select: { id: true, name: true } } },
      orderBy: [{ deliveryDate: 'asc' }, { createdAt: 'asc' }],
      take: 200,
    });

    const items = rows.map((p: Db) => {
      const date = new Date(p.deliveryDate).toISOString().slice(0, 10);
      return {
        projectId:    p.id,
        title:        p.title,
        category:     p.category,
        carModel:     p.carModel ?? null,
        workStatus:   p.workStatus,
        deliveryDate: date,
        client:       p.client ?? null,
        overdue:      date < today,
        isToday:      date === today,
      };
    });

    const overdue  = items.filter((i: { overdue: boolean }) => i.overdue);
    const upcoming = items.filter((i: { overdue: boolean }) => !i.overdue);
    return { today, until, windowDays: DELIVERY_WINDOW_DAYS + 1, overdueCount: overdue.length, upcomingCount: upcoming.length, items: [...overdue, ...upcoming] };
  },
};

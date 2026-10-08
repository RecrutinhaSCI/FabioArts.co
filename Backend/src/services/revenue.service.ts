import defaultPrisma from '../prisma/client';
import { ApiError } from '../utils/ApiError';
import { todayISO } from '../utils/dates';

/* ============================================================
   FATURAMENTO MENSAL — somente LEITURA de financial_entries.

   Faturamento do mês = receitas (type INCOME) lançadas no mês,
   exceto canceladas, agrupadas pela data do lançamento (occurredAt).
   occurredAt guarda a data do lançamento (meia-noite ou meio-dia UTC),
   então o mês é calculado em UTC — o mesmo critério de /financial/stats.

   Nada aqui escreve no banco nem estima valores: meses sem
   lançamentos aparecem com zero.
   ============================================================ */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = any;

export const REVENUE_PERIODS = ['6m', '12m', 'year'] as const;
export type RevenuePeriod = (typeof REVENUE_PERIODS)[number];

export interface RevenueMonth {
  month: string;          // "YYYY-MM"
  total: number;          // faturamento (PAID + PENDING + PARTIAL)
  paid: number;           // recebido (status Pago)
  pending: number;        // pendente
  partial: number;        // valor dos lançamentos "Parcialmente pago"
  entries: number;        // lançamentos considerados no faturamento
  payments: number;       // lançamentos com status Pago
}

/** Lista de meses "YYYY-MM" do período, do mais antigo ao atual. */
export function monthsForPeriod(period: RevenuePeriod, now: Date = new Date()): string[] {
  const [y, m] = todayISO(now).split('-').map(Number);
  const count = period === '12m' ? 12 : period === 'year' ? m : 6;
  const out: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(y, m - 1 - i, 1));
    out.push(d.toISOString().slice(0, 7));
  }
  return out;
}

const toNum = (v: unknown) => (v === null || v === undefined ? 0 : Number(v));

export const RevenueService = {

  async monthly(periodParam: string | undefined, now: Date = new Date(), db: Db = defaultPrisma) {
    const period = (periodParam || '6m') as RevenuePeriod;
    if (!REVENUE_PERIODS.includes(period)) {
      throw ApiError.badRequest('Período inválido. Use 6m, 12m ou year.');
    }

    const months = monthsForPeriod(period, now);
    const start  = new Date(`${months[0]}-01T00:00:00Z`);
    const [ly, lm] = months[months.length - 1].split('-').map(Number);
    const end    = new Date(Date.UTC(ly, lm, 1)); // 1º dia do mês seguinte

    const rows: Array<Record<string, unknown>> = await db.$queryRaw`
      SELECT to_char(date_trunc('month', "occurredAt"), 'YYYY-MM') AS month,
             COALESCE(SUM(amount) FILTER (WHERE status <> 'CANCELLED'), 0) AS total,
             COALESCE(SUM(amount) FILTER (WHERE status = 'PAID'), 0)       AS paid,
             COALESCE(SUM(amount) FILTER (WHERE status = 'PENDING'), 0)    AS pending,
             COALESCE(SUM(amount) FILTER (WHERE status = 'PARTIAL'), 0)    AS partial,
             COUNT(*) FILTER (WHERE status <> 'CANCELLED')                 AS entries,
             COUNT(*) FILTER (WHERE status = 'PAID')                       AS payments
      FROM financial_entries
      WHERE type = 'INCOME' AND "occurredAt" >= ${start} AND "occurredAt" < ${end}
      GROUP BY 1`;

    const byMonth = new Map(rows.map(r => [String(r.month), r]));
    const data: RevenueMonth[] = months.map(month => {
      const r = byMonth.get(month);
      return {
        month,
        total:    toNum(r?.total),
        paid:     toNum(r?.paid),
        pending:  toNum(r?.pending),
        partial:  toNum(r?.partial),
        entries:  toNum(r?.entries),
        payments: toNum(r?.payments),
      };
    });

    return {
      period,
      from: months[0],
      to:   months[months.length - 1],
      months: data,
      total: data.reduce((s, m) => s + m.total, 0),
    };
  },
};

/* ============================================================
   CATÁLOGO — fonte única de verdade do backend para categorias,
   andamento do trabalho, status financeiro e métodos de pagamento.

   O admin espelha estes códigos em Frontend/admin/assets/js/admin.js
   (objeto Catalog). O teste tests/catalog.test.ts garante que as
   duas listas continuem iguais.
   ============================================================ */

// ── Categorias de projeto ──────────────────────────────────────────
// Ativas: as únicas oferecidas em novos cadastros (Pedidos, Projetos,
// Orçamentos, filtros). Ordem = ordem de exibição.
export const PROJECT_CATEGORIES = [
  { code: 'AUTOMOTIVE', label: 'Design Automotivo' },
  { code: 'TSHIRT',     label: 'Camiseta' },
  { code: 'STICKER',    label: 'Adesivo' },
  { code: 'BRANDING',   label: 'Identidade Visual' },
  { code: 'COMBO',      label: 'Combos' },
  { code: 'OTHER',      label: 'Outros' },
] as const;

// Legado: ainda existem no enum do banco, só para ler registros antigos.
export const LEGACY_PROJECT_CATEGORIES = [
  { code: 'SOCIAL_MEDIA', label: 'Social Media' },
  { code: 'LOGO',         label: 'Logo' },
  { code: 'PACKAGING',    label: 'Embalagem' },
  { code: 'ILLUSTRATION', label: 'Ilustração' },
] as const;

export type ProjectCategoryCode =
  | (typeof PROJECT_CATEGORIES)[number]['code']
  | (typeof LEGACY_PROJECT_CATEGORIES)[number]['code'];

export const ACTIVE_CATEGORY_CODES: string[] = PROJECT_CATEGORIES.map(c => c.code);
export const ALL_CATEGORY_CODES: string[] = [
  ...ACTIVE_CATEGORY_CODES,
  ...LEGACY_PROJECT_CATEGORIES.map(c => c.code),
];

export function isActiveCategory(code: unknown): code is ProjectCategoryCode {
  return typeof code === 'string' && ACTIVE_CATEGORY_CODES.includes(code);
}

export function isKnownCategory(code: unknown): code is ProjectCategoryCode {
  return typeof code === 'string' && ALL_CATEGORY_CODES.includes(code);
}

export function categoryLabel(code: string): string {
  const all = [...PROJECT_CATEGORIES, ...LEGACY_PROJECT_CATEGORIES] as readonly { code: string; label: string }[];
  return all.find(c => c.code === code)?.label ?? code;
}

// ── Andamento do trabalho (Projeto) ────────────────────────────────
export const WORK_STATUSES = [
  { code: 'NOT_STARTED', label: 'Não iniciado' },
  { code: 'IN_PROGRESS', label: 'Em andamento' },
  { code: 'COMPLETED',   label: 'Concluído' },
  { code: 'CANCELLED',   label: 'Cancelado' },
] as const;
export type WorkStatusCode = (typeof WORK_STATUSES)[number]['code'];
export const WORK_STATUS_CODES: string[] = WORK_STATUSES.map(s => s.code);
/** Trabalhos que ainda exigem ação (entram na agenda de entregas). */
export const OPEN_WORK_STATUSES: WorkStatusCode[] = ['NOT_STARTED', 'IN_PROGRESS'];

// ── Status financeiro ──────────────────────────────────────────────
// Visíveis em novos cadastros. CANCELLED segue válido por compatibilidade.
export const FINANCIAL_STATUSES = [
  { code: 'PENDING', label: 'Pendente' },
  { code: 'PARTIAL', label: 'Parcialmente pago' },
  { code: 'PAID',    label: 'Pago' },
] as const;
export type FinancialStatusCode = (typeof FINANCIAL_STATUSES)[number]['code'] | 'CANCELLED';
export const ORDER_FINANCIAL_STATUS_CODES: string[] = FINANCIAL_STATUSES.map(s => s.code);
export const ALL_FINANCIAL_STATUS_CODES: string[] = [...ORDER_FINANCIAL_STATUS_CODES, 'CANCELLED'];

// ── Métodos de pagamento ───────────────────────────────────────────
// Gravados como texto em financial_entries.paymentMethod.
export const PAYMENT_METHODS = [
  { code: 'PIX',    label: 'Pix' },
  { code: 'CARTAO', label: 'Cartão' },
  { code: 'BOLETO', label: 'Boleto' },
] as const;
export const PAYMENT_METHOD_CODES: string[] = PAYMENT_METHODS.map(m => m.code);

/** Normaliza variações comuns ("pix", "cartão", "Boleto") para o código padrão. */
export function normalizePaymentMethod(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const key = raw.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
  if (key === 'PIX') return 'PIX';
  if (key === 'CARTAO' || key.startsWith('CARTAO ') || key === 'CARD' || key === 'CREDITO' || key === 'DEBITO') return 'CARTAO';
  if (key === 'BOLETO') return 'BOLETO';
  return raw; // valor livre antigo é preservado (compatibilidade)
}

/** Fuso usado para "hoje" no painel (o Fabio trabalha no Brasil). */
export const APP_TIMEZONE = 'America/Sao_Paulo';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** true se for "YYYY-MM-DD" e uma data de calendário real. */
export function isDateOnly(value: unknown): value is string {
  if (typeof value !== 'string' || !DATE_ONLY.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/**
 * "YYYY-MM-DD" → Date ao meio-dia UTC. Meio-dia evita que a data "volte"
 * um dia ao ser exibida em fusos negativos (ex.: UTC-3).
 * Strings com hora (ISO completo) são aceitas como estão.
 */
export function parseDateInput(value: string): Date {
  return isDateOnly(value) ? new Date(`${value}T12:00:00Z`) : new Date(value);
}

/** "YYYY-MM-DD" → Date à meia-noite UTC (para colunas @db.Date). */
export function dateOnlyToUTC(value: string): Date {
  return new Date(`${value}T00:00:00Z`);
}

/** Data de hoje ("YYYY-MM-DD") no fuso do painel. */
export function todayISO(now: Date = new Date(), timeZone: string = APP_TIMEZONE): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

/** Soma dias a uma data "YYYY-MM-DD". */
export function addDaysISO(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Normaliza telefone para comparação (anti-duplicação de clientes).
 * Mantém só dígitos, remove zeros à esquerda e o DDI 55.
 * A migration 20261006120000_orders_flow aplica a mesma regra em SQL.
 *
 * @example
 * normalizePhone('(54) 99999-9999')   // "54999999999"
 * normalizePhone('+55 54 99999-9999') // "54999999999"
 * normalizePhone('54999999999')       // "54999999999"
 */
export function normalizePhone(value: unknown): string {
  let d = String(value ?? '').replace(/\D/g, '').replace(/^0+/, '');
  if (d.length >= 12 && d.startsWith('55')) d = d.slice(2);
  return d;
}

/**
 * Telefone válido = DDD + número (10–11 dígitos) ou número estrangeiro
 * com DDI (até 13 dígitos).
 */
export function isValidPhone(value: unknown): boolean {
  const n = normalizePhone(value);
  return n.length >= 10 && n.length <= 13;
}

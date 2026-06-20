/**
 * Converte uma string em slug amigável para URL.
 * Remove acentos, caracteres especiais e espaços.
 *
 * @example
 * slugify('Projeto Automotivo #1 — BMW!') // "projeto-automotivo-1-bmw"
 */
export function slugify(text: string): string {
  return text
    .toString()
    .normalize('NFD')                        // decompõe acentos
    .replace(/[\u0300-\u036f]/g, '')         // remove diacríticos
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')                    // espaços → hífens
    .replace(/&/g, '-e-')                    // & → -e-
    .replace(/[^\w-]+/g, '')                 // remove não-alfanuméricos
    .replace(/--+/g, '-')                    // múltiplos hífens → um
    .replace(/^-+/, '')                      // remove hífens do início
    .replace(/-+$/, '');                     // remove hífens do fim
}

/**
 * Gera um slug único adicionando timestamp ou sufixo customizado.
 *
 * @example
 * generateUniqueSlug('Meu Projeto')           // "meu-projeto-1713456789123"
 * generateUniqueSlug('Meu Projeto', 'abc123') // "meu-projeto-abc123"
 */
export function generateUniqueSlug(title: string, suffix?: string): string {
  const base = slugify(title);
  const tag  = suffix ?? Date.now().toString();
  return `${base}-${tag}`;
}
export interface PaginationResult {
  page:       number;
  limit:      number;
  total:      number;
  totalPages: number;
  hasNext:    boolean;
  hasPrev:    boolean;
}

export interface ParsedPagination {
  page:  number;
  limit: number;
  skip:  number;
}

/**
 * Faz o parse das query strings `page` e `limit`,
 * garantindo valores seguros e dentro de limites razoáveis.
 */
export function parsePagination(
  pageStr?:  string,
  limitStr?: string,
  maxLimit = 100
): ParsedPagination {
  const page  = Math.max(1, parseInt(pageStr  ?? '1',  10) || 1);
  const limit = Math.min(
    maxLimit,
    Math.max(1, parseInt(limitStr ?? '10', 10) || 10)
  );
  const skip  = (page - 1) * limit;
  return { page, limit, skip };
}

/**
 * Constrói o objeto de paginação para a resposta da API.
 */
export function buildPagination(
  page:  number,
  limit: number,
  total: number
): PaginationResult {
  const totalPages = Math.ceil(total / limit) || 1;
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}
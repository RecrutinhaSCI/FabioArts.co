import { isIP } from 'net';
import type { Request } from 'express';

/**
 * IP real do visitante para rate limiting.
 *
 * Em produção a API fica atrás de Cloudflare → proxy do Render, então
 * `req.ip` é o IP do proxy (igual para todo mundo) e o limite viraria
 * compartilhado entre todos os visitantes. O Cloudflare grava o IP real em
 * `CF-Connecting-IP` (sobrescrevendo qualquer valor enviado pelo cliente).
 * Sem esse cabeçalho (dev local) usa `req.ip`.
 */
export function clientIp(req: Request): string {
  const cf = req.headers['cf-connecting-ip'];
  if (typeof cf === 'string' && isIP(cf.trim())) return cf.trim();
  return req.ip || req.socket.remoteAddress || 'unknown';
}

/** Opções comuns para todos os rateLimit() da API. */
export const rateLimitKeyOptions = {
  keyGenerator: (req: Request) => clientIp(req),
  // A chave não depende de X-Forwarded-For/trust proxy — desliga o aviso.
  validate: { xForwardedForHeader: false },
};

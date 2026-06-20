import { Request, Response, NextFunction } from 'express';
import jwt                                 from 'jsonwebtoken';
import { Role }                            from '@prisma/client';

import { env }          from '../config/env';
import { ApiError }     from '../utils/ApiError';
import prisma           from '../prisma/client';
import { JwtPayload }   from '../types';

// ─── authenticate ─────────────────────────────────────────────────────────────
// Verifica o Bearer token e injeta req.user

export const authenticate = async (
  req:  Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw ApiError.unauthorized(
        'Token de acesso não fornecido. Use: Authorization: Bearer <token>'
      );
    }

    const token = authHeader.split(' ')[1];

    if (!token || token.trim() === '') {
      throw ApiError.unauthorized('Token vazio');
    }

    // ── Verifica assinatura e expiração ──────────────────────────────────────
    let payload: JwtPayload;
    try {
      payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        throw ApiError.unauthorized('Token expirado. Use /api/auth/refresh para renovar.');
      }
      if (err instanceof jwt.JsonWebTokenError) {
        throw ApiError.unauthorized('Token inválido');
      }
      throw ApiError.unauthorized('Falha na verificação do token');
    }

    // ── Verifica se usuário ainda existe e está ativo ─────────────────────────
    const user = await prisma.user.findUnique({
      where:  { id: payload.sub },
      select: {
        id:       true,
        name:     true,
        email:    true,
        role:     true,
        isActive: true,
      },
    });

    if (!user) {
      throw ApiError.unauthorized('Usuário não encontrado');
    }

    if (!user.isActive) {
      throw ApiError.unauthorized('Conta desativada');
    }

    // ── Injeta usuário na request ─────────────────────────────────────────────
    req.user = {
      id:    user.id,
      name:  user.name,
      email: user.email,
      role:  user.role,
    };

    next();
  } catch (err) {
    next(err);
  }
};

// ─── authorize ────────────────────────────────────────────────────────────────
// Deve ser usado APÓS authenticate
// Exemplo: router.delete('/:id', authenticate, authorize(Role.SUPER_ADMIN), ctrl)

export const authorize = (...roles: Role[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(ApiError.unauthorized('Não autenticado'));
    }

    if (roles.length === 0) {
      // Nenhum role exigido — apenas autenticação
      return next();
    }

    if (!roles.includes(req.user.role)) {
      return next(
        ApiError.forbidden(
          `Acesso negado. Roles permitidas: [${roles.join(', ')}]. ` +
          `Sua role: ${req.user.role}`
        )
      );
    }

    next();
  };
};

// ─── optionalAuth ─────────────────────────────────────────────────────────────
// Não lança erro se não houver token — apenas tenta injetar req.user
// Útil para rotas públicas que têm comportamento diferente para admins

export const optionalAuth = async (
  req:  Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return next();

    const token = authHeader.split(' ')[1];
    if (!token) return next();

    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

    const user = await prisma.user.findUnique({
      where:  { id: payload.sub },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });

    if (user && user.isActive) {
      req.user = {
        id:    user.id,
        name:  user.name,
        email: user.email,
        role:  user.role,
      };
    }
  } catch {
    // Falha silenciosa — auth é opcional
  }
  next();
};

// ─── Atalhos para roles comuns ────────────────────────────────────────────────

/** Apenas ADMIN ou SUPER_ADMIN */
export const requireAdmin = [
  authenticate,
  authorize(Role.ADMIN, Role.SUPER_ADMIN),
];

/** Apenas SUPER_ADMIN */
export const requireSuperAdmin = [
  authenticate,
  authorize(Role.SUPER_ADMIN),
];


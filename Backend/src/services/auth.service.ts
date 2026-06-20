import bcrypt          from 'bcryptjs';
import jwt             from 'jsonwebtoken';
import { v4 as uuid }  from 'uuid';
import { Role }        from '@prisma/client';

import prisma          from '../prisma/client';
import { env }         from '../config/env';
import { ApiError }    from '../utils/ApiError';
import { JwtPayload, AuthenticatedUser } from '../types';

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface LoginDTO {
  email:    string;
  password: string;
}

export interface UpdateProfileDTO {
  name?:   string;
  email?:  string;
  avatar?: string;
}

export interface ChangePasswordDTO {
  currentPassword: string;
  newPassword:     string;
}

export interface TokenPair {
  accessToken:  string;
  refreshToken: string;
  expiresIn:    string;
}

export interface AuthResult {
  user:   AuthenticatedUser;
  tokens: TokenPair;
}

// ─── Helpers internos ─────────────────────────────────────────────────────────

function signAccessToken(user: { id: string; email: string; role: Role }): string {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role } satisfies Omit<JwtPayload, 'iat' | 'exp'>,
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions
  );
}

function signRefreshToken(): string {
  // Refresh token é um UUID opaco armazenado no banco — não carrega payload sensível
  return uuid();
}

async function saveRefreshToken(
  userId:    string,
  token:     string,
  expiresAt: Date
): Promise<void> {
  await prisma.refreshToken.create({
    data: { token, userId, expiresAt },
  });
}

function refreshTokenExpiryDate(): Date {
  // Converte "30d" em Date
  const raw   = env.JWT_REFRESH_EXPIRES_IN; // ex: "30d", "7d", "24h"
  const unit  = raw.slice(-1);
  const value = parseInt(raw.slice(0, -1), 10);

  const ms: Record<string, number> = {
    s: 1_000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };

  const duration = (ms[unit] ?? ms['d']) * value;
  return new Date(Date.now() + duration);
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const AuthService = {

  // ── Login ───────────────────────────────────────────────────────────────────

  async login(dto: LoginDTO): Promise<AuthResult> {
    // 1. Busca usuário pelo email (inclui password para comparação)
    const user = await prisma.user.findUnique({
      where:  { email: dto.email.toLowerCase().trim() },
      select: {
        id:       true,
        name:     true,
        email:    true,
        password: true,
        role:     true,
        isActive: true,
        avatar:   true,
      },
    });

    if (!user) {
      // Mensagem genérica para não revelar se email existe
      throw ApiError.unauthorized('Credenciais inválidas');
    }

    if (!user.isActive) {
      throw ApiError.unauthorized('Conta desativada. Entre em contato com o suporte.');
    }

    // 2. Valida senha
    const passwordMatch = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatch) {
      throw ApiError.unauthorized('Credenciais inválidas');
    }

    // 3. Gera tokens
    const accessToken  = signAccessToken(user);
    const refreshToken = signRefreshToken();
    const expiresAt    = refreshTokenExpiryDate();

    await saveRefreshToken(user.id, refreshToken, expiresAt);

    // 4. Retorna dados públicos + tokens
    return {
      user: {
        id:    user.id,
        name:  user.name,
        email: user.email,
        role:  user.role,
      },
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: env.JWT_EXPIRES_IN,
      },
    };
  },

  // ── Refresh Token ────────────────────────────────────────────────────────────

  async refresh(refreshToken: string): Promise<TokenPair> {
    if (!refreshToken || refreshToken.trim() === '') {
      throw ApiError.badRequest('Refresh token não fornecido');
    }

    // 1. Busca token no banco
    const stored = await prisma.refreshToken.findUnique({
      where:   { token: refreshToken },
      include: {
        user: {
          select: { id: true, email: true, role: true, isActive: true },
        },
      },
    });

    if (!stored) {
      throw ApiError.unauthorized('Refresh token inválido');
    }

    // 2. Verifica expiração
    if (stored.expiresAt < new Date()) {
      // Limpa token expirado
      await prisma.refreshToken.delete({ where: { id: stored.id } });
      throw ApiError.unauthorized('Refresh token expirado. Faça login novamente.');
    }

    if (!stored.user.isActive) {
      throw ApiError.unauthorized('Conta desativada');
    }

    // 3. Rotação de refresh token (invalidar o antigo, emitir novo par)
    const newAccessToken  = signAccessToken(stored.user);
    const newRefreshToken = signRefreshToken();
    const expiresAt       = refreshTokenExpiryDate();

    await prisma.$transaction([
      prisma.refreshToken.delete({ where: { id: stored.id } }),
      prisma.refreshToken.create({
        data: { token: newRefreshToken, userId: stored.user.id, expiresAt },
      }),
    ]);

    return {
      accessToken:  newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn:    env.JWT_EXPIRES_IN,
    };
  },

  // ── Logout ───────────────────────────────────────────────────────────────────

  async logout(refreshToken: string): Promise<void> {
    if (!refreshToken || refreshToken.trim() === '') return;

    // Deleta o refresh token (idempotente — não lança erro se não existir)
    await prisma.refreshToken.deleteMany({
      where: { token: refreshToken },
    });
  },

  // ── Logout de todos os dispositivos ──────────────────────────────────────────

  async logoutAll(userId: string): Promise<void> {
    await prisma.refreshToken.deleteMany({
      where: { userId },
    });
  },

  // ── Perfil do usuário autenticado ────────────────────────────────────────────

  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where:  { id: userId },
      select: {
        id:        true,
        name:      true,
        email:     true,
        role:      true,
        avatar:    true,
        isActive:  true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw ApiError.notFound('Usuário não encontrado');
    }

    return user;
  },

  // ── Atualizar perfil ─────────────────────────────────────────────────────────

  async updateProfile(userId: string, dto: UpdateProfileDTO) {
    // Se tentar mudar email, verifica se não está em uso por outro usuário
    if (dto.email) {
      const emailLower = dto.email.toLowerCase().trim();
      const existing   = await prisma.user.findFirst({
        where: { email: emailLower, NOT: { id: userId } },
      });
      if (existing) {
        throw ApiError.conflict('Este e-mail já está em uso');
      }
      dto.email = emailLower;
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data:  {
        ...(dto.name   && { name:   dto.name.trim()  }),
        ...(dto.email  && { email:  dto.email        }),
        ...(dto.avatar && { avatar: dto.avatar       }),
      },
      select: {
        id:        true,
        name:      true,
        email:     true,
        role:      true,
        avatar:    true,
        updatedAt: true,
      },
    });

    return updated;
  },

  // ── Troca de senha ───────────────────────────────────────────────────────────

  async changePassword(userId: string, dto: ChangePasswordDTO): Promise<void> {
    const user = await prisma.user.findUnique({
      where:  { id: userId },
      select: { id: true, password: true },
    });

    if (!user) {
      throw ApiError.notFound('Usuário não encontrado');
    }

    // Valida senha atual
    const match = await bcrypt.compare(dto.currentPassword, user.password);
    if (!match) {
      throw ApiError.badRequest('Senha atual incorreta');
    }

    // Não pode reutilizar a mesma senha
    const same = await bcrypt.compare(dto.newPassword, user.password);
    if (same) {
      throw ApiError.badRequest('A nova senha não pode ser igual à senha atual');
    }

    // Hash da nova senha
    const hashed = await bcrypt.hash(dto.newPassword, 12);

    await prisma.$transaction([
      // Atualiza senha
      prisma.user.update({
        where: { id: userId },
        data:  { password: hashed },
      }),
      // Invalida todos os refresh tokens (força novo login em todos os devices)
      prisma.refreshToken.deleteMany({ where: { userId } }),
    ]);
  },

  // ── Limpeza periódica de tokens expirados ─────────────────────────────────────

  async purgeExpiredTokens(): Promise<number> {
    const result = await prisma.refreshToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    return result.count;
  },
};
import { Request, Response, NextFunction } from 'express';
import { AuthService }                     from '../services/auth.service';
import { ApiResponse }                     from '../utils/ApiResponse';
import { env }                             from '../config/env';
import { deleteFileByUrl }                 from '../config/upload';

// ─── Cookie helpers ───────────────────────────────────────────────────────────

const REFRESH_COOKIE = 'fabioarts_refresh';

function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure:   env.isProduction,
    sameSite: env.isProduction ? 'strict' : 'lax',
    maxAge:   30 * 24 * 60 * 60 * 1000, // 30 dias em ms
    path:     '/api/auth',
  });
}

function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
}

function getRefreshToken(req: Request): string {
  // Prioriza cookie httpOnly; fallback para body (clientes sem cookie support)
  return (req.cookies?.[REFRESH_COOKIE] as string | undefined)
      ?? (req.body?.refreshToken as string | undefined)
      ?? '';
}

// ─── Controller ───────────────────────────────────────────────────────────────

export const AuthController = {

  // POST /api/auth/login
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body as { email: string; password: string };

      const result = await AuthService.login({ email, password });

      // Seta refresh token em cookie httpOnly
      setRefreshCookie(res, result.tokens.refreshToken);

      ApiResponse.success(
        res,
        {
          user:         result.user,
          accessToken:  result.tokens.accessToken,
          refreshToken: result.tokens.refreshToken, // também no body para clientes mobile
          expiresIn:    result.tokens.expiresIn,
        },
        'Login realizado com sucesso'
      );
    } catch (err) {
      next(err);
    }
  },

  // POST /api/auth/refresh
  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token  = getRefreshToken(req);
      const tokens = await AuthService.refresh(token);

      setRefreshCookie(res, tokens.refreshToken);

      ApiResponse.success(
        res,
        {
          accessToken:  tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn:    tokens.expiresIn,
        },
        'Token renovado com sucesso'
      );
    } catch (err) {
      next(err);
    }
  },

  // POST /api/auth/logout
  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = getRefreshToken(req);
      await AuthService.logout(token);

      clearRefreshCookie(res);

      ApiResponse.success(res, null, 'Logout realizado com sucesso');
    } catch (err) {
      next(err);
    }
  },

  // POST /api/auth/logout-all
  async logoutAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      await AuthService.logoutAll(userId);

      clearRefreshCookie(res);

      ApiResponse.success(res, null, 'Logout realizado em todos os dispositivos');
    } catch (err) {
      next(err);
    }
  },

  // GET /api/auth/me
  async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const profile = await AuthService.getProfile(req.user!.id);
      ApiResponse.success(res, profile, 'Perfil obtido com sucesso');
    } catch (err) {
      next(err);
    }
  },

  // PUT /api/auth/me
  async updateMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { name, email } = req.body as { name?: string; email?: string };

      // Se fez upload de avatar
      let avatar: string | undefined;
      if (req.file) {
        avatar = `${env.APP_URL}/uploads/avatars/${req.file.filename}`;

        // Remove avatar antigo se existir
        const current = await AuthService.getProfile(userId);
        if (current.avatar) {
          deleteFileByUrl(current.avatar);
        }
      }

      const updated = await AuthService.updateProfile(userId, { name, email, avatar });

      ApiResponse.success(res, updated, 'Perfil atualizado com sucesso');
    } catch (err) {
      next(err);
    }
  },

  // PUT /api/auth/change-password
  async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { currentPassword, newPassword } = req.body as {
        currentPassword: string;
        newPassword:     string;
      };

      await AuthService.changePassword(req.user!.id, { currentPassword, newPassword });

      // Limpa cookie (usuário precisa logar novamente)
      clearRefreshCookie(res);

      ApiResponse.success(
        res,
        null,
        'Senha alterada com sucesso. Faça login novamente.'
      );
    } catch (err) {
      next(err);
    }
  },
};
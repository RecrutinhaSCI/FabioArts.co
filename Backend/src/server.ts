import 'dotenv/config';
import express, { Request, Response }   from 'express';
import helmet                           from 'helmet';
import cors                             from 'cors';
import compression                      from 'compression';
import cookieParser                     from 'cookie-parser';
import rateLimit                        from 'express-rate-limit';
import path                             from 'path';
import http                             from 'http';

import { env }                          from './config/env';
import { logger, httpLogger, requestIdMiddleware } from './middlewares/logger.middleware';
import { notFoundHandler, globalErrorHandler }     from './middlewares/error.middleware';
import prisma                           from './prisma/client';
import router                           from './routes';

// ─── App ──────────────────────────────────────────────────────────────────────

const app    = express();
const server = http.createServer(app);

// ─── Security ─────────────────────────────────────────────────────────────────

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // permite servir imagens
}));

// ─── CORS ─────────────────────────────────────────────────────────────────────

// CORS_ORIGIN aceita strings exatas E padrões com `*` no início
// (ex: "https://*.vercel.app" cobre todos os preview deploys da Vercel).
function originAllowed(origin: string): boolean {
  return env.CORS_ORIGIN.some(allowed => {
    if (allowed === origin) return true;
    if (allowed.includes('*')) {
      // converte "https://*.vercel.app" → /^https:\/\/.+\.vercel\.app$/
      const pattern = '^' + allowed
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '.+') + '$';
      return new RegExp(pattern).test(origin);
    }
    return false;
  });
}

app.use(cors({
  origin(origin, callback) {
    // Sem origin (Postman, curl, server-to-server) sempre passa
    if (!origin) return callback(null, true);
    // Dev local libera tudo
    if (env.isDevelopment) return callback(null, true);
    // Produção: checa whitelist (com suporte a wildcard)
    if (originAllowed(origin)) return callback(null, true);
    // Rejeita SEM jogar erro — devolve resposta sem headers CORS,
    // o navegador bloqueia limpo (200/204), sem 500 confuso nos logs.
    logger.warn(`[CORS] origin rejeitada: ${origin}`);
    return callback(null, false);
  },
  credentials:     true,
  methods:         ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders:  ['Content-Type', 'Authorization', 'X-Request-Id'],
  exposedHeaders:  ['X-Request-Id'],
}));

// ─── Rate Limiting ────────────────────────────────────────────────────────────

const limiter = rateLimit({
  windowMs:         env.RATE_LIMIT_WINDOW_MS,
  max:              env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders:  true,
  legacyHeaders:    false,
  message: {
    success: false,
    message: 'Muitas requisições. Aguarde alguns minutos e tente novamente.',
  },
  skip: (req) => {
    // Não aplica rate limit em healthcheck
    return req.path === '/health';
  },
});

app.use(limiter);

// Rate limit mais restrito para auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max:      20,
  message: {
    success: false,
    message: 'Muitas tentativas de login. Aguarde 15 minutos.',
  },
});

// ─── Compression ─────────────────────────────────────────────────────────────

app.use(compression());

// ─── Body Parsers ─────────────────────────────────────────────────────────────

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ─── Logging ──────────────────────────────────────────────────────────────────

app.use(requestIdMiddleware);
app.use(httpLogger);

// ─── Static files (uploads) ──────────────────────────────────────────────────

app.use(
  '/uploads',
  express.static(path.resolve(process.cwd(), env.UPLOAD_DIR), {
    maxAge:   env.isProduction ? '7d' : '0',
    etag:     true,
    dotfiles: 'deny',
  })
);

// ─── Healthcheck ──────────────────────────────────────────────────────────────

app.get('/health', async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      success:  true,
      message:  'FabioArts API is healthy',
      version:  process.env.npm_package_version ?? '1.0.0',
      env:      env.NODE_ENV,
      database: 'connected',
      uptime:   `${Math.floor(process.uptime())}s`,
      timestamp: new Date().toISOString(),
    });
  } catch {
    res.status(503).json({
      success:  false,
      message:  'Database unavailable',
      database: 'disconnected',
    });
  }
});

// ─── Test Route ───────────────────────────────────────────────────────────────

app.get('/api/test', async (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Backend funcionando 🚀',
    timestamp: new Date().toISOString(),
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────

app.use('/api', (req, _res, next) => {
  // Aplica rate limit de auth nas rotas de auth
  if (req.path.startsWith('/auth')) {
    return authLimiter(req, _res, next);
  }
  next();
});

app.use('/api', router);

// ─── 404 + Global Error Handler ──────────────────────────────────────────────

app.use(notFoundHandler);
app.use(globalErrorHandler);

// ─── Graceful Shutdown ────────────────────────────────────────────────────────

async function gracefulShutdown(signal: string): Promise<void> {
  logger.info(`\n[Server] Sinal ${signal} recebido. Encerrando graciosamente...`);

  server.close(async () => {
    logger.info('[Server] Servidor HTTP fechado.');
    try {
      await prisma.$disconnect();
      logger.info('[Prisma] Conexão com banco encerrada.');
      process.exit(0);
    } catch (err) {
      logger.error('[Prisma] Erro ao desconectar:', err);
      process.exit(1);
    }
  });

  // Force exit após 10s caso o servidor não feche
  setTimeout(() => {
    logger.error('[Server] Forçando encerramento após timeout.');
    process.exit(1);
  }, 10_000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT',  () => gracefulShutdown('SIGINT'));

// Captura exceções não tratadas
process.on('uncaughtException', (err) => {
  logger.error('[UncaughtException]', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('[UnhandledRejection]', reason);
  process.exit(1);
});

// ─── Boot ─────────────────────────────────────────────────────────────────────

async function bootstrap(): Promise<void> {
  try {
    // Verifica conexão com banco antes de subir
    await prisma.$connect();
    logger.info('[Prisma] ✅ Conectado ao PostgreSQL');

    server.listen(env.PORT, () => {
      logger.info('');
      logger.info('╔════════════════════════════════════════╗');
      logger.info('║        FABIOARTS API — ONLINE          ║');
      logger.info('╚════════════════════════════════════════╝');
      logger.info(`  Ambiente  : ${env.NODE_ENV}`);
      logger.info(`  Porta     : ${env.PORT}`);
      logger.info(`  URL       : ${env.APP_URL}`);
      logger.info(`  Healthcheck: ${env.APP_URL}/health`);
      logger.info(`  API Base  : ${env.APP_URL}/api`);
      logger.info('');
    });
  } catch (err) {
    logger.error('[Bootstrap] ❌ Falha ao iniciar servidor:', err);
    await prisma.$disconnect();
    process.exit(1);
  }
}

bootstrap();

export { app, server };


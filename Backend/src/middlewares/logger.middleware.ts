import winston                          from 'winston';
import morgan, { StreamOptions }        from 'morgan';
import { Request, Response, NextFunction } from 'express';
import { env }                          from '../config/env';

// ─── Winston Logger ───────────────────────────────────────────────────────────

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

const devFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp: ts, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length
      ? `\n${JSON.stringify(meta, null, 2)}`
      : '';
    return `[${ts}] ${level}: ${stack ?? message}${metaStr}`;
  })
);

const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json()
);

export const logger = winston.createLogger({
  level:       env.isDevelopment ? 'debug' : 'info',
  format:      env.isDevelopment ? devFormat : prodFormat,
  defaultMeta: { service: 'fabioarts-api' },
  transports:  [
    new winston.transports.Console(),
    // Em produção, adicione transports de arquivo ou serviços externos:
    // new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    // new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

// ─── Morgan → Winston stream ─────────────────────────────────────────────────

const morganStream: StreamOptions = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

export const httpLogger = morgan(
  env.isDevelopment ? 'dev' : 'combined',
  { stream: morganStream }
);

// ─── Request ID middleware ────────────────────────────────────────────────────

export const requestIdMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  req.headers['x-request-id'] = id;
  res.setHeader('X-Request-Id', id);
  next();
};
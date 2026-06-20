import { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';

import { ApiError } from '../utils/ApiError';
import { logger } from './logger.middleware';

export const notFoundHandler = (
  req: Request,
  res: Response
): void => {
  res.status(404).json({
    success: false,
    message: `Rota não encontrada: ${req.originalUrl}`,
  });
};

export const globalErrorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // ApiError customizado
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors || null,
    });

    return;
  }

  // Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    res.status(400).json({
      success: false,
      message: 'Erro no banco de dados',
      code: err.code,
    });

    return;
  }

  // JSON inválido
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({
      success: false,
      message: 'JSON inválido no corpo da requisição',
    });

    return;
  }

  // Unknown error
  logger.error('[UnhandledError]', {
    error: err,
    url: req.originalUrl,
    method: req.method,
  });

  res.status(500).json({
    success: false,
    message: 'Erro interno do servidor',
  });
};
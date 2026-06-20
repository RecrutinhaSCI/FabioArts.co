import { Response } from 'express';
// Local definitions to avoid missing-module errors for '../types'
type PaginationResult = {
  total: number;
  page: number;
  pageSize: number;
  totalPages?: number;
};

type ApiResponseBody<T = unknown> = {
  success: boolean;
  message?: string;
  data?: T;
  pagination?: PaginationResult;
  errors?: unknown;
};

export class ApiResponse {

  /** 200 — Resposta genérica de sucesso */
  static success<T>(
    res:        Response,
    data:       T,
    message   = 'Sucesso',
    statusCode = 200
  ): Response {
    const body: ApiResponseBody<T> = { success: true, message, data };
    return res.status(statusCode).json(body);
  }

  /** 201 — Recurso criado */
  static created<T>(
    res:      Response,
    data:     T,
    message = 'Criado com sucesso'
  ): Response {
    return ApiResponse.success(res, data, message, 201);
  }

  /** 200 — Lista paginada */
  static paginated<T>(
    res:        Response,
    data:       T[],
    pagination: PaginationResult,
    message   = 'Sucesso'
  ): Response {
    const body: ApiResponseBody<T[]> = {
      success: true,
      message,
      data,
      pagination,
    };
    return res.status(200).json(body);
  }

  /** 204 — Sem conteúdo (delete, por exemplo) */
  static noContent(res: Response): Response {
    return res.status(204).send();
  }

  /** Erro genérico */
  static error(
    res:        Response,
    message:    string,
    statusCode = 500,
    errors?:    unknown
  ): Response {
    const body: ApiResponseBody = { success: false, message, errors };
    return res.status(statusCode).json(body);
  }
}
export class ApiError extends Error {
  public readonly statusCode:    number;
  public readonly isOperational: boolean;
  public readonly errors?:       unknown;

  constructor(
    statusCode:    number,
    message:       string,
    errors?:       unknown,
    isOperational  = true
  ) {
    super(message);
    this.name          = 'ApiError';
    this.statusCode    = statusCode;
    this.isOperational = isOperational;
    this.errors        = errors;

    Object.setPrototypeOf(this, ApiError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  // ─── Factories ────────────────────────────────────────────────────────────

  static badRequest(message: string, errors?: unknown): ApiError {
    return new ApiError(400, message, errors);
  }

  static unauthorized(message = 'Não autorizado'): ApiError {
    return new ApiError(401, message);
  }

  static forbidden(message = 'Acesso negado'): ApiError {
    return new ApiError(403, message);
  }

  static notFound(message = 'Recurso não encontrado'): ApiError {
    return new ApiError(404, message);
  }

  static conflict(message: string): ApiError {
    return new ApiError(409, message);
  }

  static unprocessable(message: string, errors?: unknown): ApiError {
    return new ApiError(422, message, errors);
  }

  static tooManyRequests(message = 'Muitas requisições. Tente novamente mais tarde.'): ApiError {
    return new ApiError(429, message);
  }

  static internal(message = 'Erro interno do servidor'): ApiError {
    return new ApiError(500, message, undefined, false);
  }

  // ─── Helper ───────────────────────────────────────────────────────────────

  toJSON() {
    return {
      statusCode:    this.statusCode,
      message:       this.message,
      isOperational: this.isOperational,
      errors:        this.errors,
    };
  }
}
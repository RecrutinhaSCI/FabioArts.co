import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';
import { ApiError } from '../utils/ApiError';

/**
 * Middleware que executa uma lista de ValidationChains e,
 * se houver erros, lança ApiError 422 com os detalhes.
 *
 * @example
 * router.post('/login', [
 *   body('email').isEmail(),
 *   body('password').notEmpty(),
 *   validate,
 * ], authController.login);
 */
export const validate = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formatted = errors.array().map(err => ({
      field:   'path' in err ? err.path : 'unknown',
      message: err.msg,
      value:   'value' in err ? err.value : undefined,
    }));

    return next(
      new ApiError(422, 'Dados de entrada inválidos', formatted)
    );
  }

  next();
};

/**
 * Factory: recebe chains, retorna array de middlewares [chain, chain, validate].
 * Uso mais conciso nas rotas.
 *
 * @example
 * router.post('/login', validateRequest([
 *   body('email').isEmail(),
 *   body('password').notEmpty(),
 * ]), authController.login);
 */
export const validateRequest = (chains: ValidationChain[]) => [
  ...chains,
  validate,
];
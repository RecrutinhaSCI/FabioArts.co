import { Router }                         from 'express';
import { body }                           from 'express-validator';
import { AuthController }                 from '../controllers/auth.controller';
import { authenticate, requireAdmin }     from '../middlewares/auth.middleware';
import { validateRequest }                from '../middlewares/validate.middleware';
import { uploadSingle }                   from '../config/upload';

const router = Router();

// ─── Validações ───────────────────────────────────────────────────────────────

const loginValidation = validateRequest([
  body('email')
    .trim()
    .notEmpty().withMessage('E-mail é obrigatório')
    .isEmail().withMessage('E-mail inválido')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Senha é obrigatória')
    .isLength({ min: 6 }).withMessage('Senha deve ter no mínimo 6 caracteres'),
]);

const refreshValidation = validateRequest([
  body('refreshToken')
    .optional()
    .isString().withMessage('Refresh token inválido'),
]);

const updateMeValidation = validateRequest([
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Nome deve ter entre 2 e 100 caracteres'),

  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('E-mail inválido')
    .normalizeEmail(),
]);

const changePasswordValidation = validateRequest([
  body('currentPassword')
    .notEmpty().withMessage('Senha atual é obrigatória'),

  body('newPassword')
    .notEmpty().withMessage('Nova senha é obrigatória')
    .isLength({ min: 8 }).withMessage('Nova senha deve ter no mínimo 8 caracteres')
    .matches(/[A-Z]/).withMessage('Nova senha deve conter ao menos uma letra maiúscula')
    .matches(/[0-9]/).withMessage('Nova senha deve conter ao menos um número')
    .custom((value, { req }) => {
      if (value === (req.body as { currentPassword: string }).currentPassword) {
        throw new Error('Nova senha não pode ser igual à senha atual');
      }
      return true;
    }),

  body('confirmPassword')
    .notEmpty().withMessage('Confirmação de senha é obrigatória')
    .custom((value, { req }) => {
      if (value !== (req.body as { newPassword: string }).newPassword) {
        throw new Error('As senhas não conferem');
      }
      return true;
    }),
]);

// ─── Rotas públicas ───────────────────────────────────────────────────────────

/**
 * @route  POST /api/auth/login
 * @desc   Login do administrador
 * @access Public
 */
router.post(
  '/login',
  loginValidation,
  AuthController.login
);

/**
 * @route  POST /api/auth/refresh
 * @desc   Renova access token usando refresh token
 * @access Public (requer refresh token no body ou cookie)
 */
router.post(
  '/refresh',
  refreshValidation,
  AuthController.refresh
);

// ─── Rotas protegidas ─────────────────────────────────────────────────────────

/**
 * @route  POST /api/auth/logout
 * @desc   Logout — invalida refresh token
 * @access Private
 */
router.post(
  '/logout',
  authenticate,
  AuthController.logout
);

/**
 * @route  POST /api/auth/logout-all
 * @desc   Logout de todos os dispositivos
 * @access Private
 */
router.post(
  '/logout-all',
  authenticate,
  AuthController.logoutAll
);

/**
 * @route  GET /api/auth/me
 * @desc   Retorna perfil do admin autenticado
 * @access Private
 */
router.get(
  '/me',
  authenticate,
  AuthController.getMe
);

/**
 * @route  PUT /api/auth/me
 * @desc   Atualiza perfil (nome, email, avatar)
 * @access Private
 */
router.put(
  '/me',
  authenticate,
  uploadSingle('avatar'),
  updateMeValidation,
  AuthController.updateMe
);

/**
 * @route  PUT /api/auth/change-password
 * @desc   Troca senha do admin autenticado
 * @access Private
 */
router.put(
  '/change-password',
  authenticate,
  changePasswordValidation,
  AuthController.changePassword
);

export default router;
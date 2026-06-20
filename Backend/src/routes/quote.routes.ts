import { Router } from 'express';
import rateLimit   from 'express-rate-limit';
import { requireAdmin } from '../middlewares/auth.middleware';
import { QuoteController } from '../controllers/quote.controller';

const router = Router();

// ── Anti-spam: público POST /quotes ─────────────────────────────────
// 5 envios por IP a cada 60min. Suficiente para uso legítimo, freia bots.
const publicQuoteLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1h
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Você atingiu o limite de envios. Tente novamente em 1h ou fale direto pelo WhatsApp.',
  },
});

// Público (formulário do site) — com rate limit anti-spam
router.post('/', publicQuoteLimiter, QuoteController.create);

// Admin
router.get('/stats',         requireAdmin, QuoteController.stats);
router.get('/',              requireAdmin, QuoteController.list);
router.get('/:id',           requireAdmin, QuoteController.getById);
router.patch('/:id/status',  requireAdmin, QuoteController.updateStatus);
router.delete('/:id',        requireAdmin, QuoteController.remove);

export default router;

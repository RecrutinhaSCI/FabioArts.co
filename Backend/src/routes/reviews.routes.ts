import { Router } from 'express';
import { requireAdmin }     from '../middlewares/auth.middleware';
import { ReviewsController } from '../controllers/reviews.controller';

/* ============================================================
   Rotas de avaliações externas (R9D).
     - GET  /reviews/google              público
     - POST /reviews/google/refresh      admin (limpa cache)
   ============================================================ */

const router = Router();

router.get('/google',          ReviewsController.getGoogle);
router.post('/google/refresh', requireAdmin, ReviewsController.refreshGoogle);

export default router;

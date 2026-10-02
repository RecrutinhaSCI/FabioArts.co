/* ============================================================
   FABIOARTS ADMIN — runtime config
   Em produção, substitua APENAS este arquivo (ou injete antes
   no build/CI) para apontar a API para o domínio real.

   Exemplos:
     window.__FA_API_BASE__ = '/api';                       // mesmo domínio
     window.__FA_API_BASE__ = 'https://api.fabioarts.co';   // subdomínio
   ============================================================ */
// Em localhost (dev), usa a API local automaticamente.
// Em qualquer outro host (produção/preview), usa Render.
window.__FA_API_BASE__ =
  (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
    ? 'http://localhost:3333/api'
    : 'https://fabioarts-co.onrender.com/api';

// Origem do site público — usada para exibir imagens salvas como caminho
// (ex.: /assets/img/portfolio/...). Vazio = mesmo domínio do admin.
// Se o admin estiver em outro domínio, coloque aqui a URL do site (sem barra final).
window.__FA_PUBLIC_BASE__ =
  (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
    ? 'http://localhost:5501'
    : 'https://fabioarts.vercel.app';

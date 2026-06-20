/* ============================================================
   FABIOARTS PÚBLICO — runtime config
   Em produção, substitua APENAS este arquivo (ou injete antes
   no build/CI) para apontar a API para o domínio real.

   Exemplos:
     window.__FA_API_BASE__ = '/api';                       // mesmo domínio
     window.__FA_API_BASE__ = 'https://api.fabioarts.co';   // subdomínio
   ============================================================ */
window.__FA_API_BASE__ = window.__FA_API_BASE__ || 'http://localhost:3333/api';

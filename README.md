# FabioArts.co

Portfólio + admin + API para o designer FabioArts (design automotivo, streetwear, identidade visual). Stack fullstack TypeScript / Node / Postgres com frontend HTML/CSS/JS puro.

---

## 📐 Visão geral

```
FABIOARTS.CO/
├── Backend/        Node + Express + TS + Prisma + Postgres (porta 3333)
├── Frontend/
│   ├── admin/      Painel admin (HTML/CSS/JS puro) — porta dev 5500
│   └── public/     Landing pública (HTML/CSS/JS puro) — porta dev 5501
└── .claude/        Configs dev (launch.json)
```

**Fluxo do sistema**
1. Cliente abre o site público → vê portfólio/serviços vindos da API → preenche form de orçamento.
2. Form envia `POST /api/quotes` → registro fica como `PENDING` no banco.
3. Admin loga em `/login.html` → vê o quote em `/orcamentos.html` → altera status para `REPLIED / CLOSED / CANCELLED`.
4. Admin gerencia clientes, projetos, serviços e settings — tudo persistido via API → o site público reflete em tempo real.

---

## 🧰 Stack

| Camada | Tecnologias |
|---|---|
| Backend | Node 18+, Express 4, TypeScript 5, Prisma 5, PostgreSQL 14+, JWT + bcrypt, Helmet, CORS, express-rate-limit, Multer, Winston |
| Admin | HTML5 + CSS3 + JS puro (sem React/Vue), Chart.js (CDN) |
| Público | HTML5 + CSS3 + JS puro, particles canvas |
| Tooling | tsx (dev), tsc (build), Prisma CLI, http-server (servir estáticos em dev) |

---

## 🚀 Rodando localmente

### Pré-requisitos
- Node 18+ e npm
- PostgreSQL 14+ rodando localmente (ou Docker)

### 1. Backend

```bash
cd Backend
cp .env.example .env          # ajuste DATABASE_URL e JWT_SECRETs
npm install
npx prisma generate
npx prisma migrate deploy     # aplica a migration init
npm run prisma:seed           # cria o admin (do .env)
npm run dev                   # tsx watch — recarrega ao salvar
```

Backend sobe em `http://localhost:3333`. Healthcheck: `GET /health`.

### 2. Frontend (admin + público)

Os HTMLs são estáticos — qualquer servidor estático serve. Em dev usamos `http-server`:

```bash
# admin (porta 5500)
npx http-server Frontend/admin -p 5500 -c-1 --cors

# público (porta 5501, em outro terminal)
npx http-server Frontend/public -p 5501 -c-1 --cors
```

Ou use `preview_start` se estiver via Claude Code (configurações em `.claude/launch.json`).

**Acessos:**
- Site público: http://localhost:5501/
- Admin login: http://localhost:5500/login.html
  - Email: `admin@fabioarts.co`
  - Senha: o valor de `ADMIN_PASSWORD` no `.env` (default `Admin@123`)

---

## ⚙️ Variáveis de ambiente

Veja [Backend/.env.example](Backend/.env.example) — todas estão documentadas inline. Resumo:

| Variável | Obrigatória | Default | Notas |
|---|---|---|---|
| `NODE_ENV` | não | `development` | Ative `production` para HTTPS cookies + logs minimal |
| `PORT` | não | `3333` | |
| `DATABASE_URL` | **sim** | — | Postgres; em prod, adicione `?sslmode=require` |
| `JWT_SECRET` | **sim** | — | mín. 32 caracteres |
| `JWT_REFRESH_SECRET` | **sim** | — | mín. 32 caracteres |
| `JWT_EXPIRES_IN` | não | `7d` | |
| `JWT_REFRESH_EXPIRES_IN` | não | `30d` | |
| `ADMIN_EMAIL/PASSWORD/NAME` | não | defaults | Usados só pelo seed |
| `CORS_ORIGIN` | **sim** | — | CSV de origens permitidas |
| `APP_URL` | não | `http://localhost:3333` | Compõe URLs de `/uploads/...` |
| `UPLOAD_DIR / MAX_FILE_SIZE / ALLOWED_MIME_TYPES` | não | defaults | |
| `RATE_LIMIT_WINDOW_MS / RATE_LIMIT_MAX_REQUESTS` | não | 15min / 100req | Global por IP |

### Apontar o frontend para a API real (produção)

Em vez de editar HTMLs, o frontend lê `window.__FA_API_BASE__` de um config injetado:

- Admin: [Frontend/admin/assets/js/config.js](Frontend/admin/assets/js/config.js)
- Público: [Frontend/public/assets/js/config.js](Frontend/public/assets/js/config.js)

Para produção, edite somente esses dois arquivos (ou injete via build/CDN):

```js
// Mesmo domínio (reverse proxy /api → backend)
window.__FA_API_BASE__ = '/api';

// Subdomínio dedicado
window.__FA_API_BASE__ = 'https://api.fabioarts.co';
```

---

## 🗄️ Prisma (dev vs produção)

| Cenário | Comando | Quando |
|---|---|---|
| Criar nova migration (dev) | `npx prisma migrate dev --name <nome>` | Após editar `schema.prisma` |
| Aplicar migrations existentes (prod) | `npx prisma migrate deploy` | Em CI/release |
| Regenerar Prisma Client | `npx prisma generate` | Após `npm install` em CI |
| Seed do admin | `npm run prisma:seed` | One-shot pós-deploy |
| Reset COMPLETO (DEV ONLY) | `npx prisma migrate reset --force` | Banco fica vazio |

⚠️ **Nunca rodar `prisma migrate dev` em produção.** Use sempre `migrate deploy`.

---

## 📋 Scripts npm (Backend)

| Script | Comando | Quando |
|---|---|---|
| `npm run dev` | `tsx watch src/server.ts` | Dev local |
| `npm run build` | `tsc` | Compila TS para `dist/` |
| `npm start` | `node dist/server.js` | Produção (após `build`) |
| `npm run typecheck` | `tsc --noEmit` | CI / pre-commit |
| `npm run release` | `prisma generate && prisma migrate deploy` | Pre-start em produção |
| `npm run prisma:seed` | seed admin do `.env` | One-shot |
| `npm run prisma:studio` | abre Prisma Studio | Inspeção de dados |

---

## 🔒 Segurança aplicada

- **Helmet** com `crossOriginResourcePolicy: cross-origin` (permite servir imagens)
- **CORS** estrito via `CORS_ORIGIN`
- **Rate-limit global** 100 req / 15 min por IP
- **Rate-limit auth** 20 req / 15 min em `/api/auth/*`
- **Rate-limit anti-spam** 5 req / 60 min no `POST /api/quotes` público
- **Limites de tamanho** em campos do quote (description: 5000 chars, etc.)
- **Bcrypt** 10–12 rounds para senha
- **JWT** access (7d) + refresh com rotação e revogação
- **Cookies** `httpOnly` + `secure` automático em produção
- **Uploads estáticos** com `dotfiles: 'deny'`

---

## ✅ Checklist de deploy

### Pré-requisitos do hosting
- Postgres gerenciado (Neon, Supabase, Render, RDS) com `sslmode=require`
- Runtime Node 18+ para o backend
- Static hosting para os frontends (Vercel, Netlify, Cloudflare Pages, ou o mesmo host do backend)

### Backend
1. ☐ Push do código para repo Git
2. ☐ Configurar serviço Node no host (Render/Railway/Fly):
   - Build: `npm ci && npm run build && npx prisma generate`
   - Pre-start: `npx prisma migrate deploy`
   - Start: `npm start`
3. ☐ Adicionar todas as variáveis do `.env.example` no painel do host:
   - `NODE_ENV=production`
   - `DATABASE_URL=postgres://...?sslmode=require`
   - `JWT_SECRET`, `JWT_REFRESH_SECRET` (≥32 chars cada — gere com `openssl rand -hex 48`)
   - `CORS_ORIGIN=https://fabioarts.co,https://www.fabioarts.co,https://admin.fabioarts.co`
   - `APP_URL=https://api.fabioarts.co`
   - `ADMIN_EMAIL/PASSWORD/NAME` (troque a senha!)
4. ☐ Rodar seed do admin uma vez: `npm run prisma:seed`
5. ☐ Validar `GET /health` → `{ success: true, database: "connected" }`

### Frontend (estático)
1. ☐ Editar `Frontend/admin/assets/js/config.js` e `Frontend/public/assets/js/config.js` com a URL real da API
2. ☐ Publicar `Frontend/public/` como root do domínio principal
3. ☐ Publicar `Frontend/admin/` em subdomínio ou subpath (ex: `admin.fabioarts.co`)
4. ☐ Validar fluxo completo: enviar quote no público → ver no admin

### Pós-deploy
1. ☐ Trocar `ADMIN_PASSWORD` (login no admin → mudar senha) e remover do `.env` do servidor
2. ☐ Adicionar imagem real de Open Graph em `/assets/og-cover.jpg` (1200×630)
3. ☐ Substituir o favicon SVG inline por `/favicon.ico` próprio
4. ☐ Configurar backup automático do Postgres (snapshot diário)
5. ☐ Monitoramento básico do healthcheck (UptimeRobot, BetterStack)

---

## 🛠️ Próximos passos (pós-MVP)

| Prioridade | Item |
|---|---|
| Alta | Upload real de imagens (Multer já existe; falta UI no admin para thumbnail/logo) |
| Alta | Captcha/Turnstile no form público (camada extra anti-bot) |
| Média | Implementar tabela `financial` + página `finances.html` (atualmente fora do schema) |
| Média | Refresh do `<select>` de cliente em projects ao reabrir modal |
| Média | Refinar `.stats-grid` responsivo no admin (768-1024px) |
| Baixa | Migrar admin para usar `admin.css` em todas as páginas (orcamentos.html e clients.html ainda têm CSS próprio) |
| Baixa | Adicionar página de mudança de senha do admin |
| Baixa | E-mail/WhatsApp automatizado ao receber novo quote |
| Baixa | Sitemap.xml + robots.txt no público |

---

## 📡 Endpoints da API

Todos sob `/api/`. Resposta padrão `{ success, message?, data?, pagination? }`.

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| `POST` | `/auth/login` | público | login do admin |
| `POST` | `/auth/refresh` | público | rotação do refresh token |
| `POST` | `/auth/logout` | admin | revoga refresh atual |
| `POST` | `/auth/logout-all` | admin | revoga todos refresh do user |
| `GET` | `/auth/me` | admin | perfil do admin |
| `PUT` | `/auth/me` | admin | edita nome/email/avatar |
| `PUT` | `/auth/change-password` | admin | troca senha |
| `GET` | `/projects` | público | lista + paginação |
| `GET` | `/projects/:id` | público | um projeto |
| `GET` | `/projects/slug/:slug` | público | um projeto por slug |
| `GET` | `/projects/stats` | público | totais agregados |
| `POST` | `/projects` | admin | cria |
| `PUT` | `/projects/:id` | admin | edita |
| `DELETE` | `/projects/:id` | admin | remove |
| `GET` | `/clients` | público | lista |
| `GET` | `/clients/:id` | público | um cliente |
| `GET` | `/clients/stats` | público | totais |
| `POST/PUT/DELETE` | `/clients[/:id]` | admin | CRUD |
| `GET` | `/services` | público | lista |
| `GET` | `/services/:id` | público | um |
| `POST/PUT/DELETE` | `/services[/:id]` | admin | CRUD |
| `POST` | `/quotes` | público (rate-limited) | envia orçamento |
| `GET` | `/quotes` | admin | lista |
| `GET` | `/quotes/stats` | admin | totais por status |
| `GET` | `/quotes/:id` | admin | um |
| `PATCH` | `/quotes/:id/status` | admin | muda status |
| `DELETE` | `/quotes/:id` | admin | remove |
| `GET` | `/settings` | público | singleton |
| `PUT` | `/settings` | admin | atualiza |
| `GET` | `/dashboard/stats` | admin | KPIs |
| `GET` | `/dashboard/recent` | admin | últimas atividades |

---

## 📝 Licença

Projeto privado FabioArts.co — todos os direitos reservados.

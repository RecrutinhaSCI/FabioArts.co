// Avaliações reais do Google (R15) — cadastro idempotente via API, sem Google Places.
//
//   node Backend/scripts/seed-reviews.mjs            → dry-run (só mostra o plano)
//   node Backend/scripts/seed-reviews.mjs --apply    → grava
//
// Env: API_BASE (default Render), ADMIN_EMAIL, ADMIN_PASSWORD (obrigatório no --apply).
//
// O que faz:
//   - cadastra as 7 avaliações como Clientes com depoimento (estrutura já editável no Admin);
//     cliente identificado pelo nome — se já existe, não é alterado;
//   - desativa os clientes fictícios do MVP (isActive=false), sem excluir;
//   - preenche só os campos manuais do Google em Configurações (nota, total, link da ficha).
//     Com a API do Google desligada/sem chave, /reviews/google responde em modo "manual"
//     e o site exibe as avaliações cadastradas.

const BASE  = process.env.API_BASE || 'https://fabioarts-co.onrender.com/api';
const EMAIL = process.env.ADMIN_EMAIL || 'admin@fabioarts.co';
const PASS  = process.env.ADMIN_PASSWORD;
const APPLY = process.argv.includes('--apply');

const FICTITIOUS_CLIENTS = ['Karla Wear', 'Thunder Motorsport'];

// Textos exatamente como na ficha do Google (prints enviados pelo cliente)
const REVIEWS = [
  ['Proyecciones Nyc', 'Arte excelente, 100% recomendada do Uruguai 🇺🇾🤝🏼🇧🇷'],
  ['Benjamín Diaz',    'Excelente trabalho, do Brasil ao Uruguai, rápido e eficiente.'],
  ['Théo',             'Serviço muito bem feito, e atencioso, vale muito a pena!'],
  ['Giovanny Lira',    'Gostei muito, serviço excelente melhor do que eu esperava'],
  ['Felipe Cresole',   'Muito top superou minhas expectativas na ideia e nos detalhes, muito bom 🤘🏻'],
  ['Lucas Breno',      'Excelente trabalho, o melhor que já vi, super humilde, responde super rápido, nota 10, meus parabéns 👏🏻'],
  ['Junin Adesivos',   'Arte perfeita gostei muito do serviço e vou fazer mais coisas com vocês'],
];

const GOOGLE_SETTINGS = {
  googleEnabled:      true,
  googleMapsUrl:      'https://maps.app.goo.gl/roGTaR2h3tckFT9P9',
  googleRatingManual: 5,
  googleReviewsCount: 70,
};

function step(msg) { console.log('▶', msg); }
function ok(msg)   { console.log('  ✓', msg); }
function fail(msg) { console.log('  ✗', msg); }

async function main() {
  console.log(`API: ${BASE}  |  modo: ${APPLY ? 'APPLY (grava)' : 'DRY-RUN (não grava)'}`);
  let headers = { 'Content-Type': 'application/json' };

  if (APPLY) {
    if (!PASS) { fail('Defina ADMIN_PASSWORD no ambiente para usar --apply.'); process.exit(1); }
    step('Login admin');
    const L = await fetch(BASE + '/auth/login', {
      method: 'POST', headers, body: JSON.stringify({ email: EMAIL, password: PASS }),
    }).then(r => r.json());
    if (!L.success) { fail('login falhou: ' + L.message); process.exit(1); }
    headers = { ...headers, Authorization: 'Bearer ' + L.data.accessToken };
    ok('logado');
  }

  step('Clientes existentes');
  const list = await fetch(`${BASE}/clients?limit=100`, { headers }).then(r => r.json());
  const clients = Array.isArray(list.data) ? list.data : (list.data?.items || []);
  const byName = new Map(clients.map(c => [c.name.trim().toLowerCase(), c]));
  ok(`${clients.length} cliente(s) no banco`);

  step('Desativar clientes fictícios');
  for (const name of FICTITIOUS_CLIENTS) {
    const c = byName.get(name.toLowerCase());
    if (!c)          { ok(`${name}: não encontrado`); continue; }
    if (!c.isActive) { ok(`${name}: já inativo`); continue; }
    if (!APPLY)      { ok(`[dry-run] desativaria ${name}`); continue; }
    const r = await fetch(`${BASE}/clients/${c.id}`, {
      method: 'PUT', headers, body: JSON.stringify({ isActive: false }),
    }).then(r => r.json());
    r.success ? ok(`desativado: ${name}`) : fail(`${name} — ${r.message}`);
  }

  step(`Cadastrar avaliações (${REVIEWS.length})`);
  let created = 0, kept = 0, failed = 0;
  // A API lista por createdAt DESC → insere de trás pra frente para exibir na ordem acima
  for (const [name, testimonial] of [...REVIEWS].reverse()) {
    if (byName.has(name.toLowerCase())) { kept++; ok(`já existe: ${name} (mantém)`); continue; }
    if (!APPLY) { created++; ok(`[dry-run] criaria ${name}`); continue; }
    const r = await fetch(BASE + '/clients', {
      method: 'POST', headers, body: JSON.stringify({ name, testimonial, isActive: true }),
    }).then(r => r.json());
    if (r.success) { created++; ok(`criado: ${name}`); }
    else { failed++; fail(`${name} — ${r.message}`); }
  }

  step('Configurações manuais do Google');
  const s = (await fetch(`${BASE}/settings`).then(r => r.json())).data || {};
  const diff = Object.fromEntries(Object.entries(GOOGLE_SETTINGS).filter(([k, v]) => s[k] !== v));
  if (!Object.keys(diff).length) ok('já configurado');
  else if (!APPLY) ok('[dry-run] atualizaria ' + JSON.stringify(diff));
  else {
    const r = await fetch(BASE + '/settings', { method: 'PUT', headers, body: JSON.stringify(diff) }).then(r => r.json());
    r.success ? ok('atualizado ' + Object.keys(diff).join(', ')) : (failed++, fail(r.message));
  }

  console.log(`\nResumo: ${created} avaliação(ões) ${APPLY ? 'criada(s)' : 'a criar'}, ${kept} já existente(s), ${failed} falha(s).`);
  if (failed) process.exit(1);
}

main().catch(e => { fail(e.message); process.exit(1); });

// Destaques iniciais da vitrine "Todos" do portfólio (R16) — idempotente via API.
//
//   node Backend/scripts/seed-featured.mjs            → dry-run (só mostra o plano)
//   node Backend/scripts/seed-featured.mjs --apply    → grava
//
// Env: API_BASE (default Render), ADMIN_EMAIL, ADMIN_PASSWORD (obrigatório no --apply).
//
// Deixa marcados como Destaque exatamente os 9 projetos aprovados e desmarca os demais.
// Primeiro desmarca, depois marca — nunca ultrapassa o limite de 9 do backend.
// Depois disso o Fabio troca os destaques pelo Admin (Projetos → Destaque).

const BASE  = process.env.API_BASE || 'https://fabioarts-co.onrender.com/api';
const EMAIL = process.env.ADMIN_EMAIL || 'admin@fabioarts.co';
const PASS  = process.env.ADMIN_PASSWORD;
const APPLY = process.argv.includes('--apply');

const FEATURED_SLUGS = [
  'ilustracao-automotiva-02',
  'g6-do-merso',
  'leo-maganha',
  'bischoff-mecanica-multimarcas',
  'ilustracao-automotiva-05',
  'baixos-de-rua',
  'golf-do-zucco',
  'giusti-garagem',
  'ilustracao-automotiva-10',
];

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

  step('Projetos existentes');
  const list = await fetch(`${BASE}/projects?limit=100`, { headers }).then(r => r.json());
  const projects = Array.isArray(list.data) ? list.data : [];
  const bySlug = new Map(projects.map(p => [p.slug, p]));
  ok(`${projects.length} projeto(s) no banco`);

  const missing = FEATURED_SLUGS.filter(s => !bySlug.has(s) || !bySlug.get(s).isPublished);
  if (missing.length) { fail('projetos aprovados ausentes/despublicados: ' + missing.join(', ')); process.exit(1); }

  const set = async (p, value) => {
    if (!APPLY) { ok(`[dry-run] ${value ? 'marcaria' : 'desmarcaria'} ${p.slug}`); return true; }
    const r = await fetch(`${BASE}/projects/${p.id}`, {
      method: 'PUT', headers, body: JSON.stringify({ isFeatured: value }),
    }).then(r => r.json());
    if (r.success) ok(`${value ? 'marcado' : 'desmarcado'}: ${p.slug}`);
    else fail(`${p.slug} — ${r.message}`);
    return !!r.success;
  };

  let failed = 0;
  step('Desmarcar destaques fora da seleção aprovada');
  const toUnset = projects.filter(p => p.isFeatured && !FEATURED_SLUGS.includes(p.slug));
  if (!toUnset.length) ok('nenhum');
  for (const p of toUnset) if (!(await set(p, false))) failed++;

  step('Marcar os 9 destaques aprovados');
  const toSet = FEATURED_SLUGS.map(s => bySlug.get(s)).filter(p => !p.isFeatured);
  if (!toSet.length) ok('todos já marcados');
  for (const p of toSet) if (!(await set(p, true))) failed++;

  console.log(`\nResumo: ${toUnset.length} a desmarcar, ${toSet.length} a marcar, ${failed} falha(s).`);
  if (failed) process.exit(1);
}

main().catch(e => { fail(e.message); process.exit(1); });

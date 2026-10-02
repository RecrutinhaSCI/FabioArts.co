// Portfólio real do Fabio (R13B) — cadastro idempotente via API.
//
// Rodar SOMENTE depois que o frontend com /assets/img/portfolio/ estiver publicado:
//   node Backend/scripts/seed-portfolio.mjs            → dry-run (só mostra o plano, não grava)
//   node Backend/scripts/seed-portfolio.mjs --apply    → grava
//
// Env: API_BASE (default Render), ADMIN_EMAIL, ADMIN_PASSWORD (obrigatório no --apply).
//
// Idempotência:
//   - projeto identificado pelo slug; se já existe, NÃO é alterado (preserva edições do Admin);
//   - fictícios do MVP são apenas despublicados (isPublished=false), nunca excluídos.
//
// Convenção de imagens: thumbnail = versão ampliada (<slug>-1080.webp ou <slug>-2400.webp).
// O site deriva a versão de card (-600 / -800) pelo nome do arquivo.

const BASE  = process.env.API_BASE || 'https://fabioarts-co.onrender.com/api';
const EMAIL = process.env.ADMIN_EMAIL || 'admin@fabioarts.co';
const PASS  = process.env.ADMIN_PASSWORD;
const APPLY = process.argv.includes('--apply');

const IMG = '/assets/img/portfolio';

// Fictícios usados no desenvolvimento (seed-mvp.mjs) → despublicar
export const FICTITIOUS_SLUGS = [
  'phantom-wrap-gt',
  'drift-culture-tee',
  'thunder-motorsport-branding',
];

const DESC = {
  STICKER:    'Arte para adesivo.',
  TSHIRT:     'Estampa de camiseta — frente e costas.',
  AUTOMOTIVE: 'Ilustração automotiva.',
  BRANDING:   'Identidade visual — prancha de apresentação da marca.',
};
const TAGS = {
  STICKER: ['adesivo'], TSHIRT: ['camiseta'], AUTOMOTIVE: ['ilustração'], BRANDING: ['identidade visual'],
};

// [título exibido, slug, arquivo original no material do cliente]
const STICKERS = [
  ['Borges do Grau',  'borges-do-grau',  'ADESIVOS/BORGES-DO-GRAU.jpg'],
  ['Cross G5 do Edy', 'cross-g5-do-edy', 'ADESIVOS/CROSS-G5-DO-EDY.jpg'],
  ['G6 do Vasem',     'g6-do-vasem',     'ADESIVOS/G6-DO-VASEM.jpg'],
  ['Gol G8 Dayane',   'gol-g8-dayane',   'ADESIVOS/GOL-G8-DAYANE.jpg'],
  ['Golf do Zucco',   'golf-do-zucco',   'ADESIVOS/GOLF-DO-ZUCCO.jpg'],
  ['Guria da Parati', 'guria-da-parati', 'ADESIVOS/GURIA-DA-PARATI.jpg'],
  ['Jetta do VK',     'jetta-do-vk',     'ADESIVOS/JETTA-DO-VK.jpg'],
  ['Leo Maganha',     'leo-maganha',     'ADESIVOS/LEO-MAGANHA.jpg'],
  ['Na Soka Films',   'na-soka-films',   'ADESIVOS/NA-SOKA-FILMS.jpg'],
  ['Nery Garagem',    'nery-garagem',    'ADESIVOS/NERY-GARAGEM.jpg'],
  ['Raul Guterres',   'raul-guterres',   'ADESIVOS/RAUL-GUTERRES.jpg'],
  ['Magrão do G6',    'magrao-do-g6',    'ADESIVOS/MAGRÃO-DO-G6.jpg'],
  ['Maciak Frutas',   'maciak-frutas',   'ADESIVOS/MACIAK-FRUTAS.jpg'],
];
const TSHIRTS = [
  ['Baixos de Rua',    'baixos-de-rua',    'CAMISETAS/BAIXOS DE RUA.jpg'],
  ['Cross do Avanzi',  'cross-do-avanzi',  'CAMISETAS/CROSS DO AVANZI.jpg'],
  ['Dani Lima',        'dani-lima',        'CAMISETAS/DANI-LIMA.jpg'],
  ['G6 do Merso',      'g6-do-merso',      'CAMISETAS/G6-DO-MERSO.jpg'],
  ['Gang 31 AM',       'gang-31-am',       'CAMISETAS/GANG 31 AM.jpg'],
  ['GFM 39AM',         'gfm-39am',         'CAMISETAS/GFM-39AM.jpg'],
  ['Giusti Garagem',   'giusti-garagem',   'CAMISETAS/GIUSTI GARAGEM.jpg'],
  ['Jetta do Maicon',  'jetta-do-maicon',  'CAMISETAS/JETTA-DO-MAICON.jpg'],
  ['Nene Suspensões',  'nene-suspensoes',  'CAMISETAS/NENE SUSPENSÕES.jpg'],
  ['TH Preparações',   'th-preparacoes',   'CAMISETAS/TH-PREPARAÇÕES.jpg'],
];
const CARS = Array.from({ length: 11 }, (_, i) => {
  const n = String(i + 1).padStart(2, '0');
  return [`Ilustração Automotiva ${n}`, `ilustracao-automotiva-${n}`, `CARROS/${n}.jpg`];
});
const BRANDING = [
  ['Lion Films',                      'lion-films',                     'IDENTIDADE VISUAL/ID VISUAL LION FILMS.png'],
  ['Bischoff Mecânica Multimarcas',   'bischoff-mecanica-multimarcas',  'IDENTIDADE VISUAL/IDENTIDADE VISUAL BISCHOFF MECÂNICA MULTIMARCAS.png'],
];

const GROUPS = [
  { category: 'AUTOMOTIVE', folder: 'carros',    full: 1080, card: 600, items: CARS },
  { category: 'TSHIRT',     folder: 'camisetas', full: 1080, card: 600, items: TSHIRTS },
  { category: 'STICKER',    folder: 'adesivos',  full: 1080, card: 600, items: STICKERS },
  { category: 'BRANDING',   folder: 'branding',  full: 2400, card: 800, items: BRANDING },
];

export const PORTFOLIO = GROUPS.flatMap(g => g.items.map(([title, slug, source]) => ({
  title, slug, source,
  category:  g.category,
  folder:    g.folder,
  fullWidth: g.full,
  cardWidth: g.card,
  thumbnail: `${IMG}/${g.folder}/${slug}-${g.full}.webp`,
  description: DESC[g.category],
  tags: TAGS[g.category],
})));

// Ordem de inserção intercalando categorias; a API lista por createdAt DESC,
// então insere de trás pra frente para o "Todos" abrir misturado.
function interleaved() {
  const lists = GROUPS.map(g => PORTFOLIO.filter(p => p.category === g.category));
  const out = [];
  for (let i = 0; lists.some(l => i < l.length); i++) lists.forEach(l => l[i] && out.push(l[i]));
  return out.reverse();
}

function step(msg) { console.log('▶', msg); }
function ok(msg)   { console.log('  ✓', msg); }
function fail(msg) { console.log('  ✗', msg); }

async function listAllProjects(headers) {
  const all = [];
  for (let page = 1; ; page++) {
    const r = await fetch(`${BASE}/projects?limit=100&page=${page}`, { headers }).then(r => r.json());
    const arr = Array.isArray(r.data) ? r.data : (r.data?.items || []);
    all.push(...arr);
    const pg = r.pagination || r.data?.pagination || r.meta;
    if (!pg || !pg.hasNext || !arr.length) break;
  }
  return all;
}

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
    const token = L.data?.accessToken || L.data?.token;
    headers = { ...headers, Authorization: 'Bearer ' + token };
    ok('logado');
  }

  step('Projetos existentes');
  const existing = await listAllProjects(headers);
  const bySlug = new Map(existing.map(p => [p.slug, p]));
  ok(`${existing.length} projeto(s) no banco`);

  step('Despublicar fictícios');
  for (const slug of FICTITIOUS_SLUGS) {
    const p = bySlug.get(slug);
    if (!p)              { ok(`${slug}: não encontrado/já oculto`); continue; }
    if (!p.isPublished)  { ok(`${slug}: já despublicado`); continue; }
    if (!APPLY)          { ok(`[dry-run] despublicaria ${slug}`); continue; }
    const r = await fetch(`${BASE}/projects/${p.id}`, {
      method: 'PUT', headers, body: JSON.stringify({ isPublished: false }),
    }).then(r => r.json());
    r.success ? ok(`despublicado: ${slug}`) : fail(`${slug} — ${r.message}`);
  }

  step(`Cadastrar portfólio (${PORTFOLIO.length} projetos)`);
  let created = 0, kept = 0, failed = 0;
  for (const p of interleaved()) {
    if (bySlug.has(p.slug)) { kept++; ok(`já existe: ${p.slug} (mantém)`); continue; }
    if (!APPLY) { created++; ok(`[dry-run] criaria ${p.category} · ${p.title}`); continue; }
    const payload = {
      title: p.title, slug: p.slug, description: p.description, category: p.category,
      thumbnail: p.thumbnail, tags: p.tags, isPublished: true, isFeatured: false,
    };
    const r = await fetch(BASE + '/projects', { method: 'POST', headers, body: JSON.stringify(payload) }).then(r => r.json());
    if (r.success) { created++; ok(`criado: ${p.category} · ${p.title}`); }
    else { failed++; fail(`${p.slug} — ${r.message}`); }
  }
  console.log(`\nResumo: ${created} ${APPLY ? 'criado(s)' : 'a criar'}, ${kept} já existente(s), ${failed} falha(s).`);
  if (failed) process.exit(1);
}

// Só executa quando chamado diretamente (permite importar PORTFOLIO em outros scripts)
if ((process.argv[1] || '').replace(/\\/g, '/').endsWith('seed-portfolio.mjs')) {
  main().catch(e => { fail(e.message); process.exit(1); });
}

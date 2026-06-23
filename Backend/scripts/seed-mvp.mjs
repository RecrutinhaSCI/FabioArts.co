// One-shot seed para popular MVP no Render
// Rodar com: node Backend/scripts/seed-mvp.mjs
const BASE = process.env.API_BASE || 'https://fabioarts-co.onrender.com/api';
const EMAIL = process.env.ADMIN_EMAIL || 'admin@fabioarts.co';
const PASS  = process.env.ADMIN_PASSWORD || 'Admin@123';

function step(msg) { console.log('▶', msg); }
function ok(msg)   { console.log('  ✓', msg); }
function fail(msg) { console.log('  ✗', msg); }

const SERVICES = [
  {
    name: 'Design Automotivo',
    description: 'Criação de artes, wraps, adesivos e identidades visuais para veículos que precisam chamar atenção na rua, no evento ou nas redes.',
    startingPrice: 1800,
    isActive: true, isFeatured: true, order: 1,
  },
  {
    name: 'Streetwear & Camisetas',
    description: 'Estampas autorais para marcas de moda urbana, coleções limitadas, eventos, equipes e projetos com identidade forte.',
    startingPrice: 450,
    isActive: true, isFeatured: true, order: 2,
  },
  {
    name: 'Identidade Visual',
    description: 'Desenvolvimento de identidade visual completa com logo, paleta, tipografia e linguagem visual para marcas que querem parecer profissionais desde o primeiro contato.',
    startingPrice: 2500,
    isActive: true, isFeatured: false, order: 3,
  },
];

const CLIENTS = [
  {
    name: 'Thunder Motorsport',
    company: 'Thunder Racing Team',
    instagram: '@thundermsport',
    website: null,
    testimonial: 'A identidade ficou com presença de equipe profissional. Visual forte, direto e pronto para pista.',
    isActive: true,
  },
  {
    name: 'Karla Wear',
    company: 'Karla Wear Streetwear',
    instagram: '@karla.wear',
    website: null,
    testimonial: 'As estampas trouxeram exatamente a atitude que a coleção precisava.',
    isActive: true,
  },
];

const PROJECTS = [
  {
    title: 'Phantom Wrap GT',
    slug: 'phantom-wrap-gt',
    description: 'Projeto conceitual de wrap automotivo com visual agressivo, acabamento premium e direção visual inspirada em performance, velocidade e presença de rua.',
    category: 'AUTOMOTIVE',
    thumbnail: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1200',
    tags: ['wrap','automotivo','performance','gold'],
    clientName: 'Thunder Motorsport',  // associa via nome
    isFeatured: true,
    isPublished: true,
  },
  {
    title: 'Drift Culture Tee',
    slug: 'drift-culture-tee',
    description: 'Estampa streetwear inspirada na cultura drift, JDM e lifestyle automotivo, pensada para uma coleção limitada com visual forte e memorável.',
    category: 'TSHIRT',
    thumbnail: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=1200',
    tags: ['streetwear','camiseta','drift','jdm'],
    clientName: 'Karla Wear',
    isFeatured: false,
    isPublished: true,
  },
  {
    title: 'Thunder Motorsport',
    slug: 'thunder-motorsport-branding',
    description: 'Identidade visual para equipe fictícia de motorsport, com foco em presença visual, aplicações em uniforme, veículo, redes sociais e materiais de divulgação.',
    category: 'BRANDING',
    thumbnail: 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=1200',
    tags: ['branding','racing','motorsport','identidade'],
    clientName: 'Thunder Motorsport',
    isFeatured: true,
    isPublished: true,
  },
];

(async () => {
  step('Login');
  const L = await fetch(BASE + '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASS }),
  }).then(r => r.json());
  if (!L.success) { fail('login falhou: ' + L.message); process.exit(1); }
  const H = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + L.data.accessToken };
  ok('logado como ' + L.data.user.email);

  // ── 1. Atualizar Design Automotivo existente OU criar
  step('Services');
  const sList = await fetch(BASE + '/services?limit=100', { headers: H }).then(r=>r.json());
  const sArr  = sList.data?.data ?? sList.data ?? [];
  for (const cfg of SERVICES) {
    const existing = sArr.find(s => s.name === cfg.name);
    if (existing) {
      const r = await fetch(BASE + '/services/' + existing.id, { method:'PUT', headers:H, body: JSON.stringify(cfg) }).then(r=>r.json());
      r.success ? ok('PUT ' + cfg.name) : fail('PUT ' + cfg.name + ' — ' + r.message);
    } else {
      const r = await fetch(BASE + '/services', { method:'POST', headers:H, body: JSON.stringify(cfg) }).then(r=>r.json());
      r.success ? ok('POST ' + cfg.name + ' (id ' + r.data?.id?.slice(0,8) + ')') : fail('POST ' + cfg.name + ' — ' + r.message);
    }
  }

  // ── 2. Criar clientes (se já existir por nome, pula)
  step('Clients');
  const cList = await fetch(BASE + '/clients?limit=100', { headers: H }).then(r=>r.json());
  const cArr  = cList.data ?? [];
  const clientIdByName = {};
  for (const c of cArr) clientIdByName[c.name] = c.id;

  for (const cfg of CLIENTS) {
    if (clientIdByName[cfg.name]) {
      ok('já existe: ' + cfg.name + ' (mantém)');
      continue;
    }
    const r = await fetch(BASE + '/clients', { method:'POST', headers:H, body: JSON.stringify(cfg) }).then(r=>r.json());
    if (r.success) {
      clientIdByName[cfg.name] = r.data.id;
      ok('POST ' + cfg.name + ' (id ' + r.data.id.slice(0,8) + ')');
    } else fail('POST ' + cfg.name + ' — ' + r.message);
  }

  // ── 3. Criar projetos (linka pelo nome do cliente)
  step('Projects');
  const pList = await fetch(BASE + '/projects?limit=100', { headers: H }).then(r=>r.json());
  const pArr  = pList.data ?? [];
  const existingSlugs = new Set(pArr.map(p => p.slug));

  for (const cfg of PROJECTS) {
    if (existingSlugs.has(cfg.slug)) {
      ok('já existe: ' + cfg.slug + ' (mantém)');
      continue;
    }
    const payload = { ...cfg, clientId: clientIdByName[cfg.clientName] || null };
    delete payload.clientName;
    const r = await fetch(BASE + '/projects', { method:'POST', headers:H, body: JSON.stringify(payload) }).then(r=>r.json());
    r.success ? ok('POST ' + cfg.title + ' → cliente ' + cfg.clientName) : fail('POST ' + cfg.title + ' — ' + r.message);
  }

  console.log('\n✅ seed-mvp concluído');
})().catch(e => { console.error('ERR:', e.message); process.exit(1); });

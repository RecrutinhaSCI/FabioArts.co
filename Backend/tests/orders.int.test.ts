/* ============================================================
   Testes de integração do fluxo Novo Pedido.

   Rodam SOMENTE contra um Postgres local descartável:
     TEST_DATABASE_URL=postgresql://postgres:test@localhost:55432/fabioarts_test npm test

   Sem TEST_DATABASE_URL os testes são pulados. Qualquer host que
   não seja localhost/127.0.0.1 é recusado — nunca rodar na produção.
   ============================================================ */
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { resolve } from 'node:path';

const TEST_URL = process.env.TEST_DATABASE_URL;
const host = TEST_URL ? new URL(TEST_URL).hostname : '';
const enabled = !!TEST_URL && ['localhost', '127.0.0.1', '::1'].includes(host);
if (TEST_URL && !enabled) throw new Error(`TEST_DATABASE_URL precisa apontar para localhost (recebido: ${host}).`);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;
let prisma: Any;
let OrdersService: Any;
let ClientsService: Any;
let ProjectsService: Any;
let pool: Any;
let RevenueService: Any;

const base = (phone: string, extra: Record<string, unknown> = {}) => ({
  client:  { name: 'João Silva', phone },
  project: { category: 'AUTOMOTIVE', carModel: 'Golf GTI' },
  commercial: {
    amount: 850, launchDate: '2026-10-06', deliveryDate: '2026-10-16',
    financialStatus: 'PENDING', paymentMethod: 'PIX',
  },
  ...extra,
});

describe('Pedidos (integração)', { skip: !enabled && 'defina TEST_DATABASE_URL (localhost) para rodar' }, () => {
  before(async () => {
    process.env.DATABASE_URL = TEST_URL; // antes de importar prisma/pool
    execSync('npx prisma migrate reset --force --skip-seed --skip-generate', {
      cwd: resolve(__dirname, '..'),
      env: { ...process.env, DATABASE_URL: TEST_URL },
      stdio: 'ignore',
    });
    prisma          = (await import('../src/prisma/client')).default;
    OrdersService   = (await import('../src/services/orders.service')).OrdersService;
    ClientsService  = await import('../src/services/clients.service');
    ProjectsService = await import('../src/services/project.service');
    pool            = (await import('../src/config/pool')).default;
    RevenueService  = (await import('../src/services/revenue.service')).RevenueService;
  });

  after(async () => {
    await prisma?.$disconnect();
    await pool?.end();
  });

  test('Cenário 1: cliente novo → cliente + projeto + orçamento + financeiro vinculados', async () => {
    const r = await OrdersService.create(base('(54) 99999-9999'));
    assert.equal(r.clientReused, false);
    assert.equal(r.client.name, 'João Silva');
    assert.equal(r.project.clientId, r.client.id);
    assert.equal(r.project.title, 'Design Automotivo — Golf GTI');
    assert.equal(r.quote.projectId, r.project.id);
    assert.equal(r.quote.clientId, r.client.id);
    assert.equal(r.quote.projectType, 'AUTOMOTIVE');
    assert.equal(r.financial.amount, 850);
    assert.equal(r.financial.status, 'PENDING');
    assert.equal(r.financial.paymentMethod, 'PIX');
    assert.equal(r.financial.projectId, r.project.id);
    assert.equal(r.financial.clientId, r.client.id);
    assert.equal(r.financial.quoteId, r.quote.id);

    const order = await OrdersService.getById(r.project.id);
    assert.equal(order.deliveryDate, '2026-10-16');
    assert.equal(order.amount, 850);
  });

  test('Cenário 2: telefone já existente (outro formato) → não duplica', async () => {
    const lookup = await OrdersService.lookupClientByPhone('54999999999');
    assert.equal(lookup.found, true);
    assert.equal(lookup.client.name, 'João Silva');

    const r = await OrdersService.create(base('+55 54 99999-9999', {
      client: { name: 'Joao (digitado diferente)', phone: '+55 54 99999-9999' },
      project: { category: 'TSHIRT' },
    }));
    assert.equal(r.clientReused, true);
    assert.equal(r.client.name, 'João Silva');
    assert.equal(r.project.title, 'Camiseta — João Silva');
    assert.equal(await prisma.client.count(), 1);
  });

  test('Cenário 3: terceiro projeto do mesmo cliente → 1 cliente com 3 projetos', async () => {
    const { client } = await OrdersService.lookupClientByPhone('54 99999-9999');
    await OrdersService.create(base('', {
      clientId: client.id, client: null,
      project: { category: 'STICKER', carModel: 'Saveiro' },
    }));
    assert.equal(await prisma.client.count(), 1);
    assert.equal(await prisma.project.count({ where: { clientId: client.id } }), 3);
    const after = await OrdersService.lookupClientByPhone('54999999999');
    assert.equal(after.client.projectsCount, 3);
  });

  test('Cenário 4: projeto do Novo Pedido nasce não publicado e sem destaque', async () => {
    const projects = await prisma.project.findMany();
    assert.ok(projects.length >= 3);
    for (const p of projects) {
      assert.equal(p.isPublished, false);
      assert.equal(p.isFeatured, false);
    }
    // e o site público não enxerga esses rascunhos
    const pub = await ProjectsService.listProjects({ isAdmin: false });
    assert.equal(pub.data.length, 0);
  });

  test('Cenário 5: falha no meio do cadastro → nada gravado', async () => {
    const before = {
      clients:  await prisma.client.count(),
      projects: await prisma.project.count(),
      quotes:   await prisma.quote.count(),
      fin:      await prisma.financialEntry.count(),
    };
    // Simula queda na última etapa (financeiro) dentro da transação real
    const failing = {
      ...prisma,
      client: prisma.client,
      $transaction: (fn: Any) => prisma.$transaction((tx: Any) => fn(new Proxy(tx, {
        get: (t, k) => k === 'financialEntry'
          ? { create: async () => { throw new Error('falha simulada no financeiro'); } }
          : t[k],
      }))),
    };
    await assert.rejects(
      OrdersService.create(base('(11) 98888-7777', { client: { name: 'Maria', phone: '(11) 98888-7777' } }), failing),
      /falha simulada/,
    );
    assert.deepEqual({
      clients:  await prisma.client.count(),
      projects: await prisma.project.count(),
      quotes:   await prisma.quote.count(),
      fin:      await prisma.financialEntry.count(),
    }, before);
  });

  test('Cenário 5b: validação barra dados inválidos antes de gravar', async () => {
    await assert.rejects(OrdersService.create(base('123')), /Telefone inválido/);
    await assert.rejects(OrdersService.create(base('54 98888-1111', { project: { category: 'SOCIAL_MEDIA' } })), /categoria válida/);
    await assert.rejects(OrdersService.create(base('54 98888-1111', {
      commercial: { amount: 100, launchDate: '2026-10-06', deliveryDate: '2026-10-07', financialStatus: 'COMPLETED', paymentMethod: 'PIX' },
    })), /Status financeiro inválido/);
    await assert.rejects(OrdersService.create(base('54 98888-1111', {
      commercial: { amount: 100, launchDate: '2026-10-06', deliveryDate: '2026-10-01', financialStatus: 'PAID', paymentMethod: 'PIX' },
    })), /entrega não pode ser antes/);
  });

  test('Cenário 7: andamento e financeiro são campos separados', async () => {
    const r = await OrdersService.create(base('51 97777-6666', {
      client: { name: 'Marcos', phone: '51 97777-6666' },
      commercial: { amount: '1.250,50', launchDate: '2026-10-06', deliveryDate: '2026-10-09', financialStatus: 'PARTIAL', paymentMethod: 'CARTAO' },
    }));
    assert.equal(r.project.workStatus, 'NOT_STARTED');
    assert.equal(r.financial.status, 'PARTIAL');
    assert.equal(r.financial.amount, 1250.5);
    // mudar o andamento não mexe no financeiro
    await ProjectsService.updateProject(r.project.id, { workStatus: 'COMPLETED' });
    const fin = await prisma.financialEntry.findUnique({ where: { id: r.financial.id } });
    assert.equal(fin.status, 'PARTIAL');
    // financeiro rejeita status de andamento
    await assert.rejects(ProjectsService.updateProject(r.project.id, { workStatus: 'PAID' }), /andamento inválido/);
  });

  test('Agenda: hoje + 14 dias, atrasados primeiro, concluídos fora', async () => {
    const now = new Date('2026-10-17T15:00:00Z'); // 17/10 em São Paulo
    const d = await OrdersService.deliveries(now);
    assert.equal(d.today, '2026-10-17');
    assert.equal(d.until, '2026-10-31');
    // 16/10 (aberto) está atrasado; o de 09/10 foi concluído → fora da agenda
    assert.ok(d.items.every((i: Any) => ['NOT_STARTED', 'IN_PROGRESS'].includes(i.workStatus)));
    assert.equal(d.items[0].overdue, true);
    assert.equal(d.items[0].deliveryDate, '2026-10-16');
    assert.ok(!d.items.some((i: Any) => i.deliveryDate === '2026-10-09'));

    const early = await OrdersService.deliveries(new Date('2026-09-01T15:00:00Z'));
    assert.equal(early.items.length, 0); // fora da janela
  });

  test('Clientes: público não vê telefone; telefone duplicado é barrado', async () => {
    await pool.query(`UPDATE clients SET testimonial = 'Top!'`);
    const pub = await ClientsService.listClients({ isAdmin: false });
    assert.ok(pub.data.length > 0);
    for (const c of pub.data) {
      assert.deepEqual(Object.keys(c).sort(), ['id', 'isActive', 'name', 'testimonial']);
    }
    const adm = await ClientsService.listClients({ isAdmin: true });
    assert.ok(adm.data.some((c: Any) => c.phone && c.projectsCount === 3));

    await assert.rejects(ClientsService.createClient({ name: 'Clone', phone: '54999999999' }), /já cadastrado/);
    const ok = await ClientsService.createClient({ name: 'Pedro', phone: '(54) 91234-5678' });
    assert.equal(ok.phone, '(54) 91234-5678');
  });

  test('Corrida: dois pedidos simultâneos do mesmo telefone novo → 1 cliente', async () => {
    const payload = base('(48) 96666-5555', { client: { name: 'Lucas', phone: '(48) 96666-5555' } });
    const [a, b] = await Promise.all([OrdersService.create(payload), OrdersService.create(payload)]);
    assert.equal(a.client.id, b.client.id);
    assert.equal(await prisma.client.count({ where: { phoneNormalized: '48966665555' } }), 1);
  });

  test('Faturamento mensal: soma real por mês, sem estimar e sem escrever', async () => {
    // Base isolada: só os lançamentos criados aqui contam (limpa a tabela do banco DE TESTE)
    await prisma.financialEntry.deleteMany({});
    const mk = (amount: number, status: string, occurredAt: string, type = 'INCOME') =>
      prisma.financialEntry.create({ data: { type, amount, status, description: 'teste', occurredAt: new Date(occurredAt) } });
    await mk(1000, 'PAID',      '2026-09-05T12:00:00Z');
    await mk(250,  'PAID',      '2026-09-30T00:00:00Z'); // lançamento antigo à meia-noite UTC
    await mk(400,  'PENDING',   '2026-09-10T12:00:00Z');
    await mk(300,  'PARTIAL',   '2026-09-11T12:00:00Z');
    await mk(999,  'CANCELLED', '2026-09-12T12:00:00Z'); // fora do faturamento
    await mk(777,  'PAID',      '2026-09-13T12:00:00Z', 'EXPENSE'); // despesa não é faturamento
    await mk(50,   'PAID',      '2026-10-01T00:00:00Z');
    await mk(80,   'PAID',      '2026-03-01T12:00:00Z'); // fora dos 6 meses

    const before = await prisma.financialEntry.count();
    const r = await RevenueService.monthly('6m', new Date('2026-10-08T15:00:00Z'));
    assert.equal(await prisma.financialEntry.count(), before); // somente leitura

    assert.deepEqual(r.months.map((m: Any) => m.month), ['2026-05','2026-06','2026-07','2026-08','2026-09','2026-10']);
    const set = r.months.find((m: Any) => m.month === '2026-09');
    assert.deepEqual({ ...set }, { month: '2026-09', total: 1950, paid: 1250, pending: 400, partial: 300, entries: 4, payments: 2 });
    const out = r.months.find((m: Any) => m.month === '2026-10');
    assert.equal(out.total, 50);
    const zero = r.months.find((m: Any) => m.month === '2026-06');
    assert.deepEqual({ ...zero }, { month: '2026-06', total: 0, paid: 0, pending: 0, partial: 0, entries: 0, payments: 0 });
    assert.equal(r.total, 2000);

    const year = await RevenueService.monthly('year', new Date('2026-10-08T15:00:00Z'));
    assert.equal(year.months.length, 10);
    assert.equal(year.total, 2080); // inclui março
    await assert.rejects(RevenueService.monthly('5y'), /Período inválido/);
  });
});

/* ============================================================
   Modo Privacidade do Admin (Frontend/admin/assets/js/admin.js).

   Carrega o admin.js REAL numa VM com DOM mínimo simulado e testa o
   comportamento; depois audita as páginas para garantir que nenhum
   valor monetário é exibido sem passar pelo formatador central.
   Não toca em banco nem em API.
   ============================================================ */
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

const ADMIN = resolve(__dirname, '../../Frontend/admin');
const read = (f: string) => readFileSync(resolve(ADMIN, f), 'utf8');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

/** DOM mínimo: elementos .money[data-mid], inputs e botão, criados a partir de HTML simples. */
function makeEnv(store: Map<string, string>) {
  const elements: Any[] = [];
  const listeners: Record<string, Function[]> = {};
  const classes = new Set<string>();
  const document: Any = {
    documentElement: { classList: { toggle: (c: string, on: boolean) => (on ? classes.add(c) : classes.delete(c)) } },
    addEventListener: (ev: string, fn: Function) => { (listeners[ev] ||= []).push(fn); },
    dispatchEvent: (e: Any) => { (listeners[e.type] || []).forEach(fn => fn(e)); return true; },
    getElementById: () => null,
    querySelectorAll: (sel: string) => {
      if (sel === '.money[data-mid]') return elements.filter(e => e.kind === 'money');
      if (sel === 'input[data-money-input]') return elements.filter(e => e.kind === 'input');
      if (sel.includes('toggle-privacy')) return elements.filter(e => e.kind === 'button');
      return [];
    },
  };
  const localStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => store.set(k, String(v)),
    removeItem: (k: string) => store.delete(k),
  };
  class CustomEvent { type: string; detail: Any; constructor(t: string, o: Any) { this.type = t; this.detail = o?.detail; } }
  const ctx: Any = {
    window: { addEventListener: () => {} }, document, localStorage, sessionStorage: localStorage,
    CustomEvent, Intl, console, setTimeout, setInterval, fetch: () => Promise.reject(new Error('offline')),
  };
  ctx.window.__FA_API_BASE__ = 'http://test';
  vm.createContext(ctx);
  // admin.js declara const/class no topo — exporta o que os testes precisam
  vm.runInContext(read('assets/js/admin.js') + '\n;globalThis.__t = { Privacy, Helpers };', ctx);
  const { Privacy, Helpers } = ctx.__t;

  /** "Renderiza" um HTML gerado por Privacy.html() como elemento do DOM simulado. */
  const mount = (html: string) => {
    const m = html.match(/data-mid="(\d+)">([^<]*)</);
    assert.ok(m, 'Privacy.html deve gerar span com data-mid');
    const el = { kind: 'money', dataset: { mid: m[1] }, textContent: m[2] };
    elements.push(el);
    return el;
  };
  const input = (value: string, type = 'number') => {
    const el = { kind: 'input', dataset: {} as Any, type, value };
    elements.push(el);
    return el;
  };
  const button = () => {
    const attrs: Record<string, string> = {};
    const el = { kind: 'button', title: '', setAttribute: (k: string, v: string) => (attrs[k] = v), attrs, querySelector: () => null };
    elements.push(el);
    return el;
  };
  return { Privacy, Helpers, mount, input, button, classes, document };
}

describe('Modo Privacidade — comportamento', () => {
  let store: Map<string, string>;
  beforeEach(() => { store = new Map(); });

  test('Teste 1: modo normal mostra R$ 1.250,00', () => {
    const { Privacy, Helpers } = makeEnv(store);
    assert.equal(Privacy.isOn(), false);
    assert.equal(Privacy.text(1250).replace(/\s/g, ' '), 'R$ 1.250,00');
    assert.equal(Helpers.formatCurrency(1250).replace(/\s/g, ' '), 'R$ 1.250,00');
  });

  test('Teste 2: ativar privacidade mascara texto, spans e Helpers.formatCurrency', () => {
    const { Privacy, Helpers, mount } = makeEnv(store);
    const el = mount(Privacy.html(1250));
    Privacy.set(true);
    assert.equal(el.textContent, 'R$ ****');
    assert.equal(Privacy.text(1250), 'R$ ****');
    assert.equal(Helpers.formatCurrency(8540), 'R$ ****');
    assert.equal(Privacy.text('R$ 3,00', true), 'R$ ****'); // texto livre (orçamento)
  });

  test('Teste 3/4: troca de página e recarregar mantêm o modo (localStorage)', () => {
    makeEnv(store).Privacy.set(true);
    // "nova página" = novo contexto lendo o mesmo localStorage
    const next = makeEnv(store);
    assert.equal(next.Privacy.isOn(), true);
    assert.equal(next.Privacy.text(500), 'R$ ****');
    const html = next.Privacy.html(500);
    assert.ok(html.includes('R$ ****'));
  });

  test('Teste 5: desativar restaura o valor exato', () => {
    const { Privacy, mount } = makeEnv(store);
    Privacy.set(true);
    const el = mount(Privacy.html(3250.5));
    assert.equal(el.textContent, 'R$ ****');
    Privacy.set(false);
    assert.equal(el.textContent.replace(/\s/g, ' '), 'R$ 3.250,50');
  });

  test('valor real nunca vai para atributo do HTML no modo privado', () => {
    const { Privacy } = makeEnv(store);
    Privacy.set(true);
    const html = Privacy.html(98765.43);
    assert.ok(!/98\.?765|98765/.test(html), html);
    const htmlRaw = Privacy.html('R$ 4.200,00', true);
    assert.ok(!htmlRaw.includes('4.200'), htmlRaw);
  });

  test('inputs monetários viram password e voltam ao tipo original', () => {
    const { Privacy, input } = makeEnv(store);
    const amount = input('850', 'number');
    const text = input('R$ 1,00', 'text');
    Privacy.set(true);
    assert.equal(amount.type, 'password');
    assert.equal(text.type, 'password');
    assert.equal(amount.value, '850'); // edição continua funcionando
    Privacy.set(false);
    assert.equal(amount.type, 'number');
    assert.equal(text.type, 'text');
  });

  test('botão da topbar reflete o estado (aria-pressed e rótulo)', () => {
    const { Privacy, button, classes } = makeEnv(store);
    const b = button();
    Privacy.set(true);
    assert.equal(b.attrs['aria-pressed'], 'true');
    assert.equal(b.title, 'Mostrar valores');
    assert.ok(classes.has('privacy-on'));
    Privacy.set(false);
    assert.equal(b.attrs['aria-pressed'], 'false');
    assert.equal(b.title, 'Ocultar valores');
  });

  test('evento privacychange é emitido para os gráficos redesenharem', () => {
    const { Privacy, document } = makeEnv(store);
    let got: Any = null;
    document.addEventListener('privacychange', (e: Any) => (got = e.detail));
    Privacy.toggle();
    assert.deepEqual({ ...got }, { on: true });
  });
});

describe('Modo Privacidade — auditoria das páginas', () => {
  const pages = ['assets/js/dashboard.js', 'assets/js/finances.js', 'assets/js/pedidos.js', 'assets/js/courses.js',
                 'assets/js/clients.js', 'assets/js/projects.js', 'orcamentos.html'];

  test('nenhuma página formata moeda por conta própria (tudo passa por Privacy)', () => {
    for (const f of pages) {
      const src = read(f);
      assert.ok(!/Intl\.NumberFormat|currency\s*:\s*'BRL'/.test(src), `${f} formata moeda sem Privacy`);
    }
  });

  test('Teste 7/8: valores de orçamento/preço exibidos via Privacy.html', () => {
    const checks: [string, RegExp][] = [
      ['assets/js/dashboard.js', /Privacy\.html\(q\.estimatedBudget, true\)/],
      ['assets/js/pedidos.js', /Privacy\.html\(quote\.estimatedBudget, true\)/],
      ['assets/js/pedidos.js', /Privacy\.html\(q\.estimatedBudget, true\)/],
      ['assets/js/pedidos.js', /function brl\(v\) \{ return v == null \? '—' : Privacy\.html\(v\); \}/],
      ['orcamentos.html', /Privacy\.html\(d\.estimatedBudget, true\)/],
      ['assets/js/finances.js', /function fmtBRL\(v\) \{ return Privacy\.html\(v \|\| 0\); \}/],
      ['assets/js/courses.js', /Privacy\.html\(c\.price, true\)/],
    ];
    for (const [f, re] of checks) assert.match(read(f), re, f);
    for (const f of ['assets/js/dashboard.js', 'assets/js/pedidos.js', 'orcamentos.html']) {
      assert.ok(!/escHtml\w*\((q|d|quote)\.estimatedBudget/.test(read(f)), `${f} exibe estimatedBudget sem Privacy`);
    }
  });

  test('Teste 7: cards do Financeiro usam innerHTML com Privacy (não textContent com valor)', () => {
    const src = read('assets/js/finances.js');
    for (const id of ['stIncome', 'stExpense', 'stBalance', 'stPending']) {
      assert.match(src, new RegExp(`${id}\\.innerHTML\\s*=\\s*fmtBRL`), id);
    }
  });

  test('todos os campos de valor são marcados como data-money-input', () => {
    const inputs: [string, string][] = [
      ['finances.html', 'f-amount'], ['orcamentos.html', 'f-valor'], ['pedidos.html', 'o-amount'],
      ['courses.html', 'f-price'], ['services.html', 'f-price'],
    ];
    for (const [f, id] of inputs) assert.match(read(f), new RegExp(`id="${id}"[^>]*data-money-input`), `${f}#${id}`);
  });

  test('Teste 6: tooltip e eixo do faturamento respeitam o modo privado', () => {
    const src = read('assets/js/dashboard.js');
    assert.match(src, /Faturamento: \$\{Privacy\.text\(m\.total\)\}/);
    assert.match(src, /display: !priv/);              // eixo monetário some no modo privado
    assert.match(src, /addEventListener\('privacychange'/); // redesenha ao alternar
    assert.ok(!/formatCurrency\(ctx\.raw\)/.test(src), 'tooltip antigo com valor real');
  });

  test('Teste 9: dados não financeiros não passam pelo Privacy', () => {
    const src = read('assets/js/pedidos.js');
    assert.ok(!/Privacy\.html\(o\.client/.test(src));
    assert.ok(!/Privacy\.(html|text)\([^)]*(name|title|category|Date|status)/i.test(src));
  });
});

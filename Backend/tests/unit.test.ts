/* Testes unitários — não tocam em banco de dados. */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { normalizePhone, isValidPhone } from '../src/utils/phone';
import { isDateOnly, todayISO, addDaysISO, parseDateInput } from '../src/utils/dates';
import {
  PROJECT_CATEGORIES, LEGACY_PROJECT_CATEGORIES, WORK_STATUSES, FINANCIAL_STATUSES,
  PAYMENT_METHODS, normalizePaymentMethod, isActiveCategory,
} from '../src/constants/catalog';

const ADMIN_DIR = resolve(__dirname, '../../Frontend/admin');

describe('telefone', () => {
  test('formatos diferentes do mesmo número são iguais', () => {
    const variants = ['(54) 99999-9999', '54999999999', '54 99999-9999', '+55 54 99999-9999', '055 54 99999 9999'];
    for (const v of variants) assert.equal(normalizePhone(v), '54999999999', v);
  });
  test('DDD 55 (RS) não é confundido com DDI', () => {
    assert.equal(normalizePhone('55 99131-7401'), '55991317401');
    assert.equal(normalizePhone('+55 55 99131-7401'), '55991317401');
  });
  test('validação', () => {
    assert.equal(isValidPhone('(54) 99999-9999'), true);
    assert.equal(isValidPhone('54 9996-3321'), true);
    assert.equal(isValidPhone('9999-9999'), false);
    assert.equal(isValidPhone(''), false);
    assert.equal(isValidPhone('abc'), false);
  });
});

describe('datas', () => {
  test('isDateOnly rejeita datas impossíveis', () => {
    assert.equal(isDateOnly('2026-10-06'), true);
    assert.equal(isDateOnly('2026-02-30'), false);
    assert.equal(isDateOnly('06/10/2026'), false);
  });
  test('hoje no fuso de São Paulo e janela de 14 dias', () => {
    // 02:00 UTC de 07/10 ainda é 06/10 em São Paulo (UTC-3)
    assert.equal(todayISO(new Date('2026-10-07T02:00:00Z')), '2026-10-06');
    assert.equal(addDaysISO('2026-10-06', 14), '2026-10-20');
    assert.equal(addDaysISO('2026-12-25', 14), '2027-01-08');
  });
  test('data sem hora vira meio-dia UTC (não volta um dia no Brasil)', () => {
    assert.equal(parseDateInput('2026-10-06').toISOString(), '2026-10-06T12:00:00.000Z');
  });
});

// Cenário 6 — mesmas categorias em todo o painel (fonte única espelhada no admin)
describe('Cenário 6: categorias padronizadas', () => {
  const adminJs = readFileSync(resolve(ADMIN_DIR, 'assets/js/admin.js'), 'utf8');
  const block = (name: string) => {
    const m = adminJs.match(new RegExp(`${name}:\\s*\\[([\\s\\S]*?)\\]`));
    assert.ok(m, `Catalog.${name} não encontrado em admin.js`);
    return [...m[1].matchAll(/code:\s*'([A-Z_]+)',\s*label:\s*'([^']+)'/g)].map(x => ({ code: x[1], label: x[2] }));
  };

  test('lista oficial: exatamente as 6 categorias pedidas', () => {
    assert.deepEqual(PROJECT_CATEGORIES.map(c => c.label),
      ['Design Automotivo', 'Camiseta', 'Adesivo', 'Identidade Visual', 'Combos', 'Outros']);
  });
  test('admin.js espelha o backend (códigos e rótulos)', () => {
    assert.deepEqual(block('categories'), PROJECT_CATEGORIES.map(c => ({ code: c.code, label: c.label })));
    assert.deepEqual(block('legacyCategories'), LEGACY_PROJECT_CATEGORIES.map(c => ({ code: c.code, label: c.label })));
    assert.deepEqual(block('workStatuses'), WORK_STATUSES.map(c => ({ code: c.code, label: c.label })));
    assert.deepEqual(block('financialStatuses'), FINANCIAL_STATUSES.map(c => ({ code: c.code, label: c.label })));
    assert.deepEqual(block('paymentMethods'), PAYMENT_METHODS.map(c => ({ code: c.code, label: c.label })));
  });
  test('nenhuma página do admin tem lista de categorias própria', () => {
    for (const f of ['projects.html', 'orcamentos.html', 'pedidos.html', 'clients.html', 'finances.html', 'dashboard.html',
                     'assets/js/projects.js', 'assets/js/pedidos.js', 'assets/js/finances.js', 'assets/js/dashboard.js', 'assets/js/clients.js']) {
      const src = readFileSync(resolve(ADMIN_DIR, f), 'utf8');
      assert.ok(!/Branding Completo|Social Media|SOCIAL_MEDIA|Camiseta \/ Streetwear/.test(src), `${f} ainda cita categoria removida`);
      assert.ok(!/value="(AUTOMOTIVE|TSHIRT|STICKER|BRANDING|COMBO|OTHER)"/.test(src), `${f} tem <option> de categoria hardcoded`);
    }
  });
  test('Branding Completo e Social Media não são categorias ativas', () => {
    assert.equal(isActiveCategory('SOCIAL_MEDIA'), false);
    assert.equal(PROJECT_CATEGORIES.some(c => /Branding Completo|Social Media/.test(c.label)), false);
  });
});

// Cenário 7 — status financeiro e andamento não se misturam
describe('Cenário 7: status separados', () => {
  test('nenhum código/rótulo em comum entre andamento e financeiro', () => {
    const work = WORK_STATUSES.map(s => s.label);
    const fin  = FINANCIAL_STATUSES.map(s => s.label);
    assert.deepEqual(work, ['Não iniciado', 'Em andamento', 'Concluído', 'Cancelado']);
    assert.deepEqual(fin, ['Pendente', 'Parcialmente pago', 'Pago']);
    assert.equal(work.some(l => fin.includes(l)), false);
  });
  test('método de pagamento normalizado', () => {
    assert.equal(normalizePaymentMethod('pix'), 'PIX');
    assert.equal(normalizePaymentMethod('Cartão'), 'CARTAO');
    assert.equal(normalizePaymentMethod('boleto'), 'BOLETO');
    assert.equal(normalizePaymentMethod('dinheiro'), 'dinheiro'); // legado preservado
    assert.equal(normalizePaymentMethod(''), null);
  });
});

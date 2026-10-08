/* ============================================================
   FABIOARTS ADMIN — dashboard.js
   Consome backend real para stats, gráficos e tabelas
   ============================================================ */

'use strict';

// ─── CHART.JS via CDN (carregado no HTML) ────────────────────────────────────

let revenueChart = null;
let categoryChart = null;

// ─── MAIN ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.requireAuth()) return;

  loadDeliveries(); // independente: não espera os gráficos
  const periodSel = document.getElementById('revenue-period');
  periodSel?.addEventListener('change', () => loadRevenue(periodSel.value));
  loadRevenue(periodSel?.value || '6m');

  try {

    await loadStats();

    const recent = await API.get('/dashboard/recent');

    await Promise.all([
      loadRecentQuotes(recent.data),
      loadRecentClients(recent.data),
    ]);

  } catch (err) {
    console.error('Dashboard error:', err);
    Toast.error('Erro ao carregar dados do dashboard');
  }
});

// ─── STATS CARDS ─────────────────────────────────────────────────────────────

async function loadStats() {
  try {
    const res = await API.get('/dashboard/stats');
    const s   = res.data;

    // Preenche cards
    setText('stat-projects',  s.totalProjects  ?? 0);
    setText('stat-clients',   s.totalClients   ?? 0);
    setText('stat-quotes',    s.totalQuotes    ?? 0);
    setText('stat-services',  s.totalServices  ?? 0);
    setText('stat-pending',   s.pendingQuotes  ?? 0);
    setText('stat-published', s.publishedProjects ?? 0);
    setText('stat-featured',  s.featuredProjects  ?? 0);

    // Projetos por categoria (dados reais). O faturamento vem de loadRevenue().
    renderCategoryChart(s.projectsByCategory || []);

  } catch (err) {
    console.warn('Stats error:', err.message);
    renderCategoryChart([]);
  }
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

// ─── PRÓXIMAS ENTREGAS ───────────────────────────────────────────────────────
// Janela móvel: hoje até hoje + 14 dias. Atrasados (trabalho ainda aberto)
// aparecem primeiro; concluídos/cancelados não entram (filtrado no backend).

function escHtmlDash(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function loadDeliveries() {
  const summary = document.getElementById('deliv-summary');
  const list    = document.getElementById('deliv-list');
  if (!summary || !list) return;
  try {
    const res = await API.get('/dashboard/deliveries');
    const d = res.data || {};
    const items = d.items || [];
    const upcoming = items.filter(i => !i.overdue);
    const late     = items.filter(i => i.overdue);
    const project = i => i.carModel ? `${Catalog.categoryLabel(i.category)} — ${i.carModel}` : Catalog.categoryLabel(i.category);

    if (!items.length) {
      summary.textContent = 'Nenhuma entrega prevista para os próximos 15 dias.';
      list.innerHTML = '';
      return;
    }

    const parts = [];
    if (upcoming.length) {
      parts.push(`Você possui <b>${upcoming.length} ${upcoming.length === 1 ? 'pedido' : 'pedidos'}</b> com entrega prevista nos próximos 15 dias.`);
      const next = upcoming[0];
      parts.push(`Próxima entrega: <b>${escHtmlDash(next.client?.name || '—')}</b> — ${escHtmlDash(project(next))} — ${escHtmlDash(DateOnly.format(next.deliveryDate))}.`);
    } else {
      parts.push('Nenhuma entrega prevista para os próximos 15 dias.');
    }
    if (late.length) {
      parts.unshift(`<span class="late">${late.length} ${late.length === 1 ? 'entrega atrasada' : 'entregas atrasadas'}.</span>`);
    }
    summary.innerHTML = parts.join(' ');

    const weekday = iso => {
      const [y, m, dd] = iso.split('-').map(Number);
      return new Date(y, m - 1, dd).toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
    };
    list.innerHTML = items.map(i => {
      const cls  = i.overdue ? ' late' : i.isToday ? ' today' : '';
      const when = i.overdue ? 'atrasada' : i.isToday ? 'hoje' : weekday(i.deliveryDate);
      return `
        <a class="deliv-item${cls}" href="pedidos.html?id=${encodeURIComponent(i.projectId)}"
           title="${escHtmlDash(DateOnly.delivery(i.deliveryDate, i.workStatus).text)}">
          <div class="deliv-date">${escHtmlDash(DateOnly.format(i.deliveryDate, true))}<small>${escHtmlDash(when)}</small></div>
          <div class="deliv-main">
            <div class="who">${escHtmlDash(i.client?.name || 'Sem cliente')}</div>
            <div class="what">${escHtmlDash(project(i))}</div>
          </div>
          ${Catalog.workStatusBadge(i.workStatus)}
        </a>`;
    }).join('');
  } catch (err) {
    summary.textContent = 'Não foi possível carregar as entregas.';
    list.innerHTML = '';
  }
}

// ─── GRÁFICO — FATURAMENTO MENSAL ────────────────────────────────────────────
// Dados reais de GET /dashboard/revenue (somente leitura). Barras por mês;
// passar o mouse/tocar mostra tooltip; clicar seleciona o mês e abre o resumo.
// Todo valor exibido passa pelo Modo Privacidade (Privacy.text / Privacy.html):
// a escala continua real, mas nenhum número financeiro aparece com o modo ativo.

const REVENUE_COLOR      = '#ffc000';
const REVENUE_COLOR_DIM  = 'rgba(255,192,0,0.28)';
let revenueData = [];
let revenueSelected = null; // índice do mês selecionado

function monthLabel(ym, style = 'long') {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1, 1);
  if (style === 'short') return d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '') + '/' + String(y).slice(2);
  const txt = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return txt.charAt(0).toUpperCase() + txt.slice(1);
}

async function loadRevenue(period = '6m') {
  const totalEl = document.getElementById('revenue-total');
  try {
    const res = await API.get(`/dashboard/revenue?period=${encodeURIComponent(period)}`);
    revenueData = res.data?.months || [];
    revenueSelected = null;
    renderRevenueChart();
    renderRevenueTotal(res.data);
    renderRevenueDetail();
  } catch (err) {
    console.warn('revenue:', err.message);
    revenueData = [];
    renderRevenueChart();
    if (totalEl) totalEl.textContent = 'Não foi possível carregar o faturamento.';
  }
}

function renderRevenueTotal(d) {
  const el = document.getElementById('revenue-total');
  if (!el || !d) return;
  const label = { '6m': 'nos últimos 6 meses', '12m': 'nos últimos 12 meses', year: 'no ano' }[d.period] || '';
  el.innerHTML = `${Privacy.html(d.total)} ${label}`;
}

function renderRevenueDetail() {
  const box = document.getElementById('revenue-detail');
  if (!box) return;
  const m = revenueSelected !== null ? revenueData[revenueSelected] : null;
  if (!m) {
    box.innerHTML = '<span class="chart-hint">Toque ou clique em um mês para ver o resumo.</span>';
    return;
  }
  const item = (k, v) => `<div><div class="k">${k}</div><div class="v">${v}</div></div>`;
  const payments = `${m.payments} ${m.payments === 1 ? 'pagamento' : 'pagamentos'}`;
  box.innerHTML = `
    <div class="ttl"><span>${escHtmlDash(monthLabel(m.month))}</span>
      <a href="finances.html?month=${encodeURIComponent(m.month)}">Ver no Financeiro →</a></div>
    <div class="grid">
      ${item('Faturamento', Privacy.html(m.total))}
      ${item('Recebido', Privacy.html(m.paid) + ` <span class="text-xs text-muted">· ${payments}</span>`)}
      ${m.pending ? item('Pendente', Privacy.html(m.pending)) : ''}
      ${m.partial ? item('Parcialmente pago', Privacy.html(m.partial)) : ''}
      ${item('Lançamentos', m.entries)}
    </div>`;
}

function revenueColors() {
  return revenueData.map((_, i) => (revenueSelected === null || revenueSelected === i) ? REVENUE_COLOR : REVENUE_COLOR_DIM);
}

function renderRevenueChart() {
  const ctx = document.getElementById('revenue-chart');
  if (!ctx || typeof Chart === 'undefined') return;

  const labels = revenueData.map(m => monthLabel(m.month, 'short'));
  const values = revenueData.map(m => m.total);
  const priv = Privacy.isOn();

  if (revenueChart) revenueChart.destroy();

  revenueChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Faturamento',
        data: values,
        backgroundColor: revenueColors(),
        hoverBackgroundColor: REVENUE_COLOR,
        borderRadius: 4,
        borderSkipped: 'bottom',
        maxBarThickness: 42,
        minBarLength: 2, // mês com R$ 0,00 continua visível e clicável
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false }, // área de toque = coluna inteira
      onClick: (_e, els) => {
        if (!els.length) return;
        const i = els[0].index;
        revenueSelected = revenueSelected === i ? null : i;
        // Atualiza o gráfico existente (recriar dentro do clique perdia a seleção)
        revenueChart.data.datasets[0].backgroundColor = revenueColors();
        revenueChart.update('none');
        renderRevenueDetail();
      },
      onHover: (e, els) => { e.native.target.style.cursor = els.length ? 'pointer' : 'default'; },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#161618',
          borderColor:     'rgba(255,255,255,0.08)',
          borderWidth:     1,
          titleColor:      '#f4f4f5',
          bodyColor:       '#d4d4d8',
          padding:         10,
          displayColors:   false,
          callbacks: {
            // Modo privado: o tooltip mostra "R$ ****", nunca o valor real
            title: items => monthLabel(revenueData[items[0].dataIndex].month),
            label: item => {
              const m = revenueData[item.dataIndex];
              return [`Faturamento: ${Privacy.text(m.total)}`, `Pagamentos: ${m.payments}`];
            },
          },
        },
      },
      scales: {
        x: {
          grid:  { display: false },
          ticks: { color: '#a1a1aa', font: { size: 11 }, maxRotation: 0, autoSkip: true },
        },
        y: {
          beginAtZero: true,
          grid:  { color: 'rgba(255,255,255,0.04)' },
          border: { display: false },
          ticks: {
            display: !priv, // eixo monetário some no modo privado
            color: '#71717a',
            font:  { size: 11 },
            maxTicksLimit: 5,
            callback: v => 'R$' + (v >= 1000 ? (v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + 'k' : v),
          },
        },
      },
    },
  });
}

// ─── GRÁFICO — PROJETOS POR CATEGORIA ────────────────────────────────────────
// Cores fixas por categoria (ordem do Catalog), validadas para o fundo escuro.
// A cor segue a categoria — nunca a posição no ranking.

const CATEGORY_COLORS = {
  AUTOMOTIVE: '#3987e5', TSHIRT: '#d95926', STICKER: '#199e70',
  BRANDING:   '#c98500', COMBO:  '#d55181', OTHER:   '#9085e9',
};
const CATEGORY_LEGACY_COLOR = '#71717a';
let categoryData = [];
let categorySelected = null;

function renderCategoryChart(data) {
  const ctx = document.getElementById('category-chart');
  if (!ctx || typeof Chart === 'undefined') return;

  // Ordem fixa do catálogo; categorias antigas (legado) entram no fim
  const order = Catalog.categories.map(c => c.code);
  categoryData = (data || [])
    .filter(d => d.count > 0)
    .sort((a, b) => {
      const ia = order.indexOf(a.category), ib = order.indexOf(b.category);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
  const total = categoryData.reduce((s, d) => s + d.count, 0);
  const totalEl = document.getElementById('category-total');
  if (totalEl) totalEl.textContent = total ? `${total} ${total === 1 ? 'projeto' : 'projetos'} cadastrados` : 'Nenhum projeto cadastrado';

  if (categoryChart) categoryChart.destroy();
  if (!categoryData.length) { renderCategoryDetail(); return; }

  categoryChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: categoryData.map(d => Catalog.categoryLabel(d.category)),
      datasets: [{
        data: categoryData.map(d => d.count),
        backgroundColor: categoryColors(),
        borderColor: '#111113', // separação de 2px entre fatias
        borderWidth: 2,
        hoverOffset: 6,
        offset: categoryOffsets(),
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '68%',
      onClick: (_e, els) => {
        if (!els.length) return;
        selectCategory(els[0].index, total);
      },
      onHover: (e, els) => { e.native.target.style.cursor = els.length ? 'pointer' : 'default'; },
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#d4d4d8', font: { size: 11 }, padding: 12, boxWidth: 10, boxHeight: 10, usePointStyle: true, pointStyle: 'rectRounded' },
          onClick: (_e, item) => selectCategory(item.index, total), // legenda também seleciona
        },
        tooltip: {
          backgroundColor: '#161618',
          borderColor:     'rgba(255,255,255,0.08)',
          borderWidth:     1,
          titleColor:      '#f4f4f5',
          bodyColor:       '#d4d4d8',
          padding:         10,
          callbacks: {
            title: items => items[0].label,
            label: item => {
              const n = item.raw;
              const pct = total ? (n / total * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) : '0';
              return ` ${n} ${n === 1 ? 'projeto' : 'projetos'} · ${pct}%`;
            },
          },
        },
      },
    },
  });
  renderCategoryDetail(total);
}

const categoryColorOf = c => CATEGORY_COLORS[c] || CATEGORY_LEGACY_COLOR;
function categoryColors() {
  return categoryData.map((d, i) =>
    categorySelected === null || categorySelected === i ? categoryColorOf(d.category) : categoryColorOf(d.category) + '40');
}
function categoryOffsets() {
  return categoryData.map((_, i) => (categorySelected === i ? 8 : 0));
}
function selectCategory(i, total) {
  categorySelected = categorySelected === i ? null : i;
  const ds = categoryChart.data.datasets[0];
  ds.backgroundColor = categoryColors();
  ds.offset = categoryOffsets();
  categoryChart.update('none');
  renderCategoryDetail(total);
}

function renderCategoryDetail(total) {
  const box = document.getElementById('category-detail');
  if (!box) return;
  const d = categorySelected !== null ? categoryData[categorySelected] : null;
  if (!d) {
    box.innerHTML = '<span class="chart-hint">Toque ou clique em uma categoria.</span>';
    return;
  }
  const pct = total ? (d.count / total * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) : '0';
  const color = CATEGORY_COLORS[d.category] || CATEGORY_LEGACY_COLOR;
  box.innerHTML = `
    <div class="ttl"><span><span class="swatch" style="background:${color}"></span>${escHtmlDash(Catalog.categoryLabel(d.category))}</span>
      <a href="projects.html?category=${encodeURIComponent(d.category)}">Ver projetos →</a></div>
    <div class="grid">
      <div><div class="k">Projetos</div><div class="v">${d.count}</div></div>
      <div><div class="k">Do total</div><div class="v">${pct}%</div></div>
    </div>`;
}

// Modo Privacidade alternado: redesenha o gráfico (tooltip e eixo) e resumos
document.addEventListener('privacychange', () => {
  if (revenueChart) {
    revenueChart.options.scales.y.ticks.display = !Privacy.isOn();
    revenueChart.tooltip.setActiveElements([], { x: 0, y: 0 }); // fecha tooltip aberto com o modo anterior
    revenueChart.update('none');
  }
  renderRevenueDetail();
});

// ─── ÚLTIMOS ORÇAMENTOS ───────────────────────────────────────────────────────

async function loadRecentQuotes(data) {
  const tbody = document.getElementById('recent-quotes-body');
  if (!tbody) return;

  try {
    const quotes = data?.recentQuotes || [];

    if (!quotes.length) {
      tbody.innerHTML = `<tr><td colspan="5" class="table-empty">Nenhum orçamento recebido ainda</td></tr>`;
      return;
    }

    tbody.innerHTML = quotes.map(q => `
      <tr>
        <td>
          <div class="table-user">
            <div class="table-avatar">${Helpers.initials(q.name)}</div>
            <div>
              <div class="table-user-name">${escHtmlDash(q.name)}</div>
              <div class="table-user-email">${escHtmlDash(q.whatsapp || q.email || '')}</div>
            </div>
          </div>
        </td>
        <td><span class="text-sm">${escHtmlDash(Catalog.quoteTypeLabel(q.projectType))}</span></td>
        <td>${q.estimatedBudget
              ? `<span class="text-gold font-medium">${Privacy.html(q.estimatedBudget, true)}</span>`
              : '<span class="text-muted">—</span>'}</td>
        <td>${Helpers.quoteStatusBadge(q.status)}</td>
        <td class="text-muted text-sm">${Helpers.formatDateRelative(q.createdAt)}</td>
      </tr>
    `).join('');

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" class="table-empty text-muted">Erro ao carregar orçamentos</td></tr>`;
  }
}

// ─── ÚLTIMOS CLIENTES ─────────────────────────────────────────────────────────

async function loadRecentClients(data) {
  const container = document.getElementById('recent-clients-list');
  if (!container) return;

  try {
    const clients = data?.recentClients || [];

    if (!clients.length) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
            </svg>
          </div>
          <p class="empty-state-text">Nenhum cliente cadastrado ainda</p>
        </div>`;
      return;
    }

    container.innerHTML = clients.map(c => `
      <div class="recent-client-item">
        <div class="table-avatar" style="width:38px;height:38px;font-size:.8rem;">
          ${escHtmlDash(Helpers.initials(c.name))}
        </div>
        <div class="flex-1" style="flex:1;min-width:0;">
          <div class="table-user-name truncate">${escHtmlDash(c.name)}</div>
          <div class="table-user-email truncate">${escHtmlDash(c.phone || '—')}</div>
        </div>
        <span class="text-muted text-xs">${Helpers.formatDateRelative(c.createdAt)}</span>
      </div>
    `).join('');

  } catch (err) {
    container.innerHTML = `<p class="text-muted text-sm" style="text-align:center;padding:2rem">Erro ao carregar</p>`;
  }
}

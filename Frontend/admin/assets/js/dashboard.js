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
    setText('stat-revenue',   Helpers.formatCurrency(s.totalRevenue ?? 0));
    setText('stat-published', s.publishedProjects ?? 0);
    setText('stat-featured',  s.featuredProjects  ?? 0);

    // Renderiza gráficos com dados reais
    renderRevenueChart(s.revenueByMonth   || []);
    renderCategoryChart(s.projectsByCategory || []);

  } catch (err) {
    console.warn('Stats error:', err.message);
    renderRevenueChart([]);
    renderCategoryChart([]);
  }
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

// ─── GRÁFICO — FATURAMENTO MENSAL ────────────────────────────────────────────

function renderRevenueChart(data) {
  const ctx = document.getElementById('revenue-chart');
  if (!ctx || typeof Chart === 'undefined') return;

  const months   = data.map(d => d.month || '');
  const values   = data.map(d => d.total || 0);

  // Fallback: últimos 6 meses vazios
  const labels = months.length ? months : getLastMonths(6);
  const vals   = values.length ? values : new Array(6).fill(0);

  if (revenueChart) revenueChart.destroy();

  revenueChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label:           'Faturamento (R$)',
        data:            vals,
        borderColor:     '#ffc000',
        backgroundColor: 'rgba(255,192,0,0.08)',
        borderWidth:     2,
        fill:            true,
        tension:         0.4,
        pointBackgroundColor: '#ffc000',
        pointBorderColor:    '#0d0d0f',
        pointBorderWidth:    2,
        pointRadius:         4,
        pointHoverRadius:    6,
      }],
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      interaction:  { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#161618',
          borderColor:     'rgba(255,255,255,0.08)',
          borderWidth:     1,
          titleColor:      '#f4f4f5',
          bodyColor:       '#a1a1aa',
          padding:         10,
          callbacks: {
            label: ctx => ` ${Helpers.formatCurrency(ctx.raw)}`,
          },
        },
      },
      scales: {
        x: {
          grid:  { color: 'rgba(255,255,255,0.04)' },
          ticks: { color: '#52525b', font: { size: 11 } },
        },
        y: {
          grid:  { color: 'rgba(255,255,255,0.04)' },
          ticks: {
            color: '#52525b',
            font:  { size: 11 },
            callback: v => 'R$' + (v >= 1000 ? (v/1000).toFixed(0) + 'k' : v),
          },
          beginAtZero: true,
        },
      },
    },
  });
}

// ─── GRÁFICO — PROJETOS POR CATEGORIA ────────────────────────────────────────

function renderCategoryChart(data) {
  const ctx = document.getElementById('category-chart');
  if (!ctx || typeof Chart === 'undefined') return;

  const defaults = [
    { category: 'AUTOMOTIVE', count: 0 },
    { category: 'TSHIRT',     count: 0 },
    { category: 'STICKER',    count: 0 },
    { category: 'BRANDING',   count: 0 },
    { category: 'OTHER',      count: 0 },
  ];

  const source = data.length ? data : defaults;
  const labels = source.map(d => Helpers.categoryLabel(d.category));
  const values = source.map(d => d.count || 0);

  const colors = ['#ffc000', '#3b82f6', '#22c55e', '#a855f7', '#f59e0b'];

  if (categoryChart) categoryChart.destroy();

  categoryChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data:             values,
        backgroundColor:  colors.map(c => c + '30'),
        borderColor:      colors,
        borderWidth:      2,
        hoverOffset:      6,
      }],
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      cutout:              '72%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color:     '#a1a1aa',
            font:      { size: 11 },
            padding:   14,
            boxWidth:  10,
            boxHeight: 10,
          },
        },
        tooltip: {
          backgroundColor: '#161618',
          borderColor:     'rgba(255,255,255,0.08)',
          borderWidth:     1,
          titleColor:      '#f4f4f5',
          bodyColor:       '#a1a1aa',
          padding:         10,
          callbacks: {
            label: ctx => ` ${ctx.label}: ${ctx.raw} projeto(s)`,
          },
        },
      },
    },
  });
}

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
              <div class="table-user-name">${q.name}</div>
              <div class="table-user-email">${q.email}</div>
            </div>
          </div>
        </td>
        <td><span class="text-sm">${q.projectType || '—'}</span></td>
        <td>${q.estimatedBudget
              ? `<span class="text-gold font-medium">${q.estimatedBudget}</span>`
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
          ${c.logo
            ? `<img 
                  src="${c.logo}" 
                  alt="${c.name}"
                  onerror="this.parentElement.innerHTML='${Helpers.initials(c.name)}'"
>`
            : Helpers.initials(c.name)}
        </div>
        <div class="flex-1" style="flex:1;min-width:0;">
          <div class="table-user-name truncate">${c.name}</div>
          <div class="table-user-email truncate">${c.company || '—'}</div>
        </div>
        <span class="text-muted text-xs">${Helpers.formatDateRelative(c.createdAt)}</span>
      </div>
    `).join('');

  } catch (err) {
    container.innerHTML = `<p class="text-muted text-sm" style="text-align:center;padding:2rem">Erro ao carregar</p>`;
  }
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function getLastMonths(n) {
  const months = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    months.push(d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }));
  }
  return months;
}


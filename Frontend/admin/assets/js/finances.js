/* ============================================================
   FABIOARTS ADMIN — finances.js  (CRUD de lançamentos + stats)
   ============================================================ */

(function () {
  'use strict';

  if (typeof Auth === 'undefined' || !Auth.requireAuth()) return;

  const STATUS_LABEL = { PAID:'Pago', PENDING:'Pendente', CANCELLED:'Cancelado' };
  const STATUS_BADGE = { PAID:'badge-green', PENDING:'badge-yellow', CANCELLED:'badge-grey' };

  // ─── State ──────────────────────────────────────────────────────────────────
  let entries = [];
  let editingId = null;
  let filterMonth = '';        // YYYY-MM ou '' = todos
  let filterType  = 'all';     // all | INCOME | EXPENSE
  let filterStatus = 'all';    // all | PAID | PENDING | CANCELLED
  let searchQuery = '';
  let currentPage = 1, totalCount = 0, totalPages = 1;
  const PER_PAGE = 25;

  // Caches para selects
  let clientsCache  = [];
  let projectsCache = [];
  let quotesCache   = [];

  // ─── DOM ────────────────────────────────────────────────────────────────────
  const tbody       = document.getElementById('entries-tbody');
  const btnNew      = document.getElementById('btn-new');
  const btnRefresh  = document.getElementById('btn-refresh');
  const btnSave     = document.getElementById('btn-save');
  const btnClear    = document.getElementById('btn-clear-filters');
  const filterMonthEl = document.getElementById('filter-month');
  const filterSearch  = document.getElementById('filter-search');
  const pgInfo      = document.getElementById('pg-info');
  const pgBtns      = document.getElementById('pg-btns');
  const modalTitle  = document.getElementById('modal-title');
  const f = id => document.getElementById('f-' + id);

  // Stats
  const stIncome       = document.getElementById('st-income');
  const stIncomeCount  = document.getElementById('st-income-count');
  const stExpense      = document.getElementById('st-expense');
  const stExpenseCount = document.getElementById('st-expense-count');
  const stBalance      = document.getElementById('st-balance');
  const stMonthLabel   = document.getElementById('st-month-label');
  const stPending      = document.getElementById('st-pending');
  const stPendingCount = document.getElementById('st-pending-count');

  // ─── Helpers ────────────────────────────────────────────────────────────────
  function escHtml(s){ return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function fmtBRL(v) {
    return new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(v || 0);
  }
  function fmtDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('pt-BR', { day:'2-digit', month:'short', year:'2-digit' });
  }
  function todayISO() { return new Date().toISOString().slice(0,10); }
  function currentMonth() { return new Date().toISOString().slice(0,7); }

  // ─── Stats ──────────────────────────────────────────────────────────────────
  async function loadStats() {
    try {
      const month = filterMonth || currentMonth();
      const res = await API.get(`/financial/stats?month=${month}`);
      const s = res.data;
      stIncome.textContent       = fmtBRL(s.incomeMonth);
      stExpense.textContent      = fmtBRL(s.expenseMonth);
      stBalance.textContent      = fmtBRL(s.balanceMonth);
      stPending.textContent      = fmtBRL(s.pendingTotal);
      stIncomeCount.textContent  = `${s.incomeCount} ${s.incomeCount === 1 ? 'lançamento' : 'lançamentos'}`;
      stExpenseCount.textContent = `${s.expenseCount} ${s.expenseCount === 1 ? 'lançamento' : 'lançamentos'}`;
      stPendingCount.textContent = `${s.pendingCount} ${s.pendingCount === 1 ? 'lançamento' : 'lançamentos'} no total`;
      // Label do mês para o card saldo
      const [y, m] = s.month.split('-');
      const mLabel = new Date(Number(y), Number(m)-1, 1).toLocaleDateString('pt-BR', { month:'long', year:'numeric' });
      stMonthLabel.textContent = `Saldo de ${mLabel}`;
      stBalance.style.color = s.balanceMonth >= 0 ? 'var(--green)' : 'var(--red)';
    } catch (err) {
      console.warn('stats:', err.message);
    }
  }

  // ─── List ───────────────────────────────────────────────────────────────────
  async function loadList() {
    tbody.innerHTML = `<tr><td colspan="9" class="table-empty"><span class="loader-ring"></span> &nbsp;Carregando...</td></tr>`;
    try {
      const params = new URLSearchParams({ page: currentPage, limit: PER_PAGE });
      if (filterMonth)              params.set('month', filterMonth);
      if (filterType   !== 'all')   params.set('type', filterType);
      if (filterStatus !== 'all')   params.set('status', filterStatus);
      if (searchQuery)              params.set('search', searchQuery);

      const res = await API.get(`/financial?${params.toString()}`);
      entries    = res.data?.data ?? res.data ?? [];
      const pg   = res.data?.pagination ?? res.pagination ?? {};
      totalCount = pg.total ?? entries.length;
      totalPages = pg.totalPages ?? 1;
      renderTable();
      renderPagination();
    } catch (err) {
      console.error(err);
      Toast.error('Erro ao carregar lançamentos');
      tbody.innerHTML = `<tr><td colspan="9" class="table-empty text-muted">Erro: ${escHtml(err.message)}</td></tr>`;
    }
  }

  function renderTable() {
    if (!entries.length) {
      tbody.innerHTML = `
        <tr><td colspan="9">
          <div class="state-block">
            <div class="state-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
            </div>
            <div class="state-title">Nenhum lançamento</div>
            <div class="state-text">Crie uma receita ou despesa para começar a acompanhar o financeiro.</div>
            <button class="btn btn-primary" type="button" id="empty-new">Novo lançamento</button>
          </div>
        </td></tr>`;
      document.getElementById('empty-new')?.addEventListener('click', () => openModal());
      return;
    }

    tbody.innerHTML = entries.map(e => {
      const typeBadge = e.type === 'INCOME'
        ? '<span class="badge badge-green">Receita</span>'
        : '<span class="badge badge-red">Despesa</span>';
      const valClass = e.type === 'INCOME' ? 'amount-in' : 'amount-out';
      const valSign  = e.type === 'INCOME' ? '+' : '−';
      return `
        <tr>
          <td>
            <div style="font-weight:500;color:var(--txt);font-size:.83rem">${escHtml(e.description)}</div>
            ${e.client?.name  ? `<div class="text-muted text-sm">cliente: ${escHtml(e.client.name)}</div>` : ''}
            ${e.project?.title ? `<div class="text-muted text-sm">projeto: ${escHtml(e.project.title)}</div>` : ''}
            ${e.quote?.name   ? `<div class="text-muted text-sm">orçamento: ${escHtml(e.quote.name)}</div>` : ''}
          </td>
          <td>${typeBadge}</td>
          <td><span class="${valClass}">${valSign} ${fmtBRL(e.amount)}</span></td>
          <td>${e.category ? `<span class="badge">${escHtml(e.category)}</span>` : '<span class="text-muted">—</span>'}</td>
          <td><span class="badge ${STATUS_BADGE[e.status]||''}"><span class="badge-dot"></span>${STATUS_LABEL[e.status]||e.status}</span></td>
          <td class="text-muted text-sm">${fmtDate(e.occurredAt)}</td>
          <td class="text-muted text-sm">${fmtDate(e.dueDate)}</td>
          <td class="text-muted text-sm">${escHtml(e.paymentMethod || '—')}</td>
          <td>
            <div class="flex gap-1 justify-end">
              <button class="btn btn-ghost btn-icon" data-action="edit" data-id="${e.id}" title="Editar" type="button">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="btn btn-ghost btn-icon" data-action="delete" data-id="${e.id}" data-desc="${escHtml(e.description)}" title="Excluir" type="button" style="color:var(--red)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
              </button>
            </div>
          </td>
        </tr>`;
    }).join('');
  }

  function renderPagination() {
    if (pgInfo) {
      const start = totalCount ? (currentPage - 1) * PER_PAGE + 1 : 0;
      const end   = Math.min(currentPage * PER_PAGE, totalCount);
      pgInfo.textContent = totalCount ? `Mostrando ${start}–${end} de ${totalCount}` : 'Nenhum lançamento';
    }
    if (!pgBtns) return;
    pgBtns.innerHTML = '';
    if (totalPages <= 1) return;
    const mk = (lbl, p, dis) => {
      const b = document.createElement('button');
      b.className = `btn btn-secondary btn-sm${p === currentPage ? ' active' : ''}`;
      b.textContent = lbl;
      b.disabled = dis || p === currentPage;
      b.onclick = () => { currentPage = p; loadList(); };
      pgBtns.appendChild(b);
    };
    mk('‹', currentPage - 1, currentPage === 1);
    for (let i = 1; i <= totalPages; i++) mk(i, i, false);
    mk('›', currentPage + 1, currentPage === totalPages);
  }

  // ─── Selects de vínculos ────────────────────────────────────────────────────
  async function loadLookups() {
    try {
      const [cs, ps, qs] = await Promise.all([
        API.get('/clients?limit=200').catch(() => ({ data: [] })),
        API.get('/projects?limit=200').catch(() => ({ data: [] })),
        API.get('/quotes?limit=200').catch(() => ({ data: [] })),
      ]);
      clientsCache  = cs.data || [];
      projectsCache = ps.data || [];
      quotesCache   = qs.data?.data ?? qs.data ?? [];
      populateSelects();
    } catch (err) { console.warn('lookups:', err.message); }
  }

  function populateSelects() {
    f('clientId').innerHTML = ['<option value="">— Sem cliente —</option>']
      .concat(clientsCache.map(c => `<option value="${c.id}">${escHtml(c.name)}${c.company ? ' · ' + escHtml(c.company) : ''}</option>`))
      .join('');
    f('projectId').innerHTML = ['<option value="">— Sem projeto —</option>']
      .concat(projectsCache.map(p => `<option value="${p.id}">${escHtml(p.title)}</option>`))
      .join('');
    f('quoteId').innerHTML = ['<option value="">— Sem orçamento —</option>']
      .concat(quotesCache.map(q => `<option value="${q.id}">${escHtml(q.name)} · ${escHtml(q.projectType || '')}</option>`))
      .join('');
  }

  // ─── Modal ──────────────────────────────────────────────────────────────────
  function openModal(e) {
    editingId = e ? e.id : null;
    modalTitle.textContent = e ? 'Editar lançamento' : 'Novo lançamento';
    f('type').value          = e?.type          || 'INCOME';
    f('amount').value        = e?.amount != null ? e.amount : '';
    f('status').value        = e?.status        || 'PAID';
    f('description').value   = e?.description   || '';
    f('category').value      = e?.category      || '';
    f('paymentMethod').value = e?.paymentMethod || '';
    f('occurredAt').value    = e?.occurredAt    ? e.occurredAt.slice(0,10) : todayISO();
    f('dueDate').value       = e?.dueDate       ? e.dueDate.slice(0,10) : '';
    f('clientId').value      = e?.clientId      || '';
    f('projectId').value     = e?.projectId     || '';
    f('quoteId').value       = e?.quoteId       || '';
    f('notes').value         = e?.notes         || '';
    Modal.open('entry-modal');
    setTimeout(() => f('description').focus(), 80);
  }

  function buildPayload() {
    const amount = Number(f('amount').value);
    return {
      type:          f('type').value,
      amount:        Number.isFinite(amount) ? amount : 0,
      status:        f('status').value,
      description:   f('description').value.trim(),
      category:      f('category').value.trim()      || null,
      paymentMethod: f('paymentMethod').value.trim() || null,
      occurredAt:    f('occurredAt').value,
      dueDate:       f('dueDate').value || null,
      clientId:      f('clientId').value  || null,
      projectId:     f('projectId').value || null,
      quoteId:       f('quoteId').value   || null,
      notes:         f('notes').value.trim() || null,
    };
  }

  async function save() {
    const payload = buildPayload();
    if (!payload.description) return Toast.error('Descrição é obrigatória');
    if (!payload.amount && payload.amount !== 0) return Toast.error('Valor é obrigatório');
    if (payload.amount < 0)   return Toast.error('Valor não pode ser negativo (use tipo Despesa)');
    if (!payload.occurredAt)  return Toast.error('Data do lançamento é obrigatória');

    Helpers.setButtonLoading(btnSave, true);
    try {
      if (editingId) {
        await API.put(`/financial/${editingId}`, payload);
        Toast.success('Lançamento atualizado');
      } else {
        await API.post('/financial', payload);
        Toast.success('Lançamento criado');
      }
      Modal.close('entry-modal');
      await Promise.all([loadStats(), loadList()]);
    } catch (err) {
      Toast.error(err.message || 'Erro ao salvar');
    } finally {
      Helpers.setButtonLoading(btnSave, false);
    }
  }

  async function remove(id, desc) {
    const ok = await Helpers.confirmDialog(`Excluir o lançamento "${desc}"?`);
    if (!ok) return;
    try {
      await API.delete(`/financial/${id}`);
      Toast.success('Lançamento excluído');
      await Promise.all([loadStats(), loadList()]);
    } catch (err) {
      Toast.error(err.message || 'Erro ao excluir');
    }
  }

  async function startEdit(id) {
    try {
      const res = await API.get(`/financial/${id}`);
      openModal(res.data);
    } catch (err) {
      Toast.error(err.message || 'Erro ao carregar lançamento');
    }
  }

  // ─── Bind ───────────────────────────────────────────────────────────────────
  btnNew?.addEventListener('click', () => openModal());
  btnRefresh?.addEventListener('click', () => Promise.all([loadStats(), loadList(), loadLookups()]));
  btnSave?.addEventListener('click', save);

  filterMonthEl?.addEventListener('change', () => {
    filterMonth = filterMonthEl.value;
    currentPage = 1;
    Promise.all([loadStats(), loadList()]);
  });

  document.querySelectorAll('.filter-btn[data-type]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn[data-type]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filterType = btn.dataset.type;
      currentPage = 1;
      loadList();
    });
  });
  document.querySelectorAll('.filter-btn[data-status]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn[data-status]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filterStatus = btn.dataset.status;
      currentPage = 1;
      loadList();
    });
  });

  filterSearch?.addEventListener('input', Helpers.debounce(() => {
    searchQuery = filterSearch.value.trim();
    currentPage = 1;
    loadList();
  }, 300));

  btnClear?.addEventListener('click', () => {
    filterMonth = ''; filterMonthEl.value = '';
    filterType  = 'all'; filterStatus = 'all'; searchQuery = '';
    filterSearch.value = '';
    document.querySelectorAll('.filter-btn[data-type], .filter-btn[data-status]').forEach(b => {
      b.classList.toggle('active', (b.dataset.type === 'all' || b.dataset.status === 'all'));
    });
    currentPage = 1;
    Promise.all([loadStats(), loadList()]);
  });

  tbody?.addEventListener('click', e => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    if (btn.dataset.action === 'edit')   startEdit(btn.dataset.id);
    if (btn.dataset.action === 'delete') remove(btn.dataset.id, btn.dataset.desc);
  });

  // ─── INIT ───────────────────────────────────────────────────────────────────
  filterMonthEl.value = currentMonth();
  filterMonth = '';   // default: lista todos os meses; stats usa mês corrente
  Promise.all([loadLookups(), loadStats(), loadList()]);
})();

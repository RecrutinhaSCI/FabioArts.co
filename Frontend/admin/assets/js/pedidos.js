/* ============================================================
   FABIOARTS ADMIN — pedidos.js
   Porta de entrada dos trabalhos: Novo Pedido (3 etapas) cria
   Cliente → Projeto → Orçamento → Financeiro numa transação
   (POST /api/orders). A listagem agrega os dados existentes.
   ============================================================ */

(function () {
  'use strict';

  if (typeof Auth === 'undefined' || !Auth.requireAuth()) return;

  // ─── STATE ──────────────────────────────────────────────────────────────────
  let orders = [];
  let currentPage = 1, totalCount = 0, totalPages = 1;
  const PER_PAGE = 20;
  let filterWork = '';
  let filterFin  = '';
  let searchQuery = '';

  const wz = {
    step: 1,
    client: null,        // { id, name, phone, projectsCount } quando reaproveitado
    found: null,         // cliente encontrado pelo telefone, aguardando confirmação
    category: '',
    financialStatus: 'PENDING',
    paymentMethod: 'PIX',
    saving: false,
    lookupSeq: 0,
  };

  // ─── DOM ────────────────────────────────────────────────────────────────────
  const $ = id => document.getElementById(id);
  const tbody = $('orders-tbody');
  const fPhone = $('o-phone'), fName = $('o-name'), fCar = $('o-car');
  const fAmount = $('o-amount'), fLaunch = $('o-launch'), fDelivery = $('o-delivery');
  const btnNext = $('wz-next'), btnPrev = $('wz-prev');
  const errBox = $('wz-error');

  // ─── HELPERS ────────────────────────────────────────────────────────────────
  function escHtml(s) { return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function ini(n) { return (n || '?').split(' ').filter(Boolean).map(x => x[0]).join('').slice(0, 2).toUpperCase(); }
  // Valores passam pelo Modo Privacidade (admin.js → Privacy)
  function brl(v) { return v == null ? '—' : Privacy.html(v); }
  function phoneDigits(v) {
    let d = String(v || '').replace(/\D/g, '').replace(/^0+/, '');
    if (d.length >= 12 && d.startsWith('55')) d = d.slice(2);
    return d;
  }
  function parseAmount(v) {
    const s = String(v || '').replace(/[R$\s]/g, '');
    if (!s) return NaN;
    return Number(s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s);
  }
  function projectLabel(o) {
    const cat = Catalog.categoryLabel(o.category);
    return o.carModel ? `${cat} — ${o.carModel}` : cat;
  }
  function deliveryHtml(o) {
    const d = DateOnly.delivery(o.deliveryDate, o.workStatus);
    if (d.state === 'none') return '<span class="text-muted">—</span>';
    const cls = d.state === 'late' ? ' late' : d.state === 'today' ? ' today' : '';
    const label = d.state === 'late' ? `Atrasada · ${DateOnly.format(o.deliveryDate)}`
                : d.state === 'today' ? 'Hoje' : DateOnly.format(o.deliveryDate);
    return `<span class="delivery${cls}" title="${escHtml(d.text)}">${escHtml(label)}</span>`;
  }

  // ─── FILTROS (do catálogo) ──────────────────────────────────────────────────
  function renderFilters() {
    const wf = $('work-filters');
    wf.innerHTML = [{ code: '', label: 'Todos' }, ...Catalog.workStatuses]
      .map(s => `<button class="filter-btn${s.code === filterWork ? ' active' : ''}" data-work="${s.code}" type="button">${escHtml(s.label)}</button>`)
      .join('');
    $('filter-fin').innerHTML = Catalog.options(Catalog.financialStatuses, filterFin, { placeholder: 'Financeiro: todos' });
  }

  // ─── LIST ───────────────────────────────────────────────────────────────────
  async function loadList() {
    tbody.innerHTML = `<tr><td colspan="8" class="table-empty"><span class="loader-ring"></span> &nbsp;Carregando pedidos...</td></tr>`;
    try {
      const params = new URLSearchParams({ page: currentPage, limit: PER_PAGE });
      if (filterWork)  params.set('workStatus', filterWork);
      if (filterFin)   params.set('financialStatus', filterFin);
      if (searchQuery) params.set('search', searchQuery);
      const res = await API.get(`/orders?${params}`);
      orders     = res.data?.data ?? [];
      totalCount = res.data?.pagination?.total ?? orders.length;
      totalPages = res.data?.pagination?.totalPages ?? 1;
      renderTable();
      renderPagination();
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="8" class="table-empty text-muted">Erro ao carregar: ${escHtml(err.message)}</td></tr>`;
    }
  }

  function renderTable() {
    if (!orders.length) {
      const filtered = filterWork || filterFin || searchQuery;
      tbody.innerHTML = `
        <tr><td colspan="8">
          <div class="state-block">
            <div class="state-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
            </div>
            <div class="state-title">${filtered ? 'Nenhum pedido encontrado' : 'Nenhum pedido ainda'}</div>
            <div class="state-text">${filtered ? 'Ajuste os filtros ou a busca.' : 'Lance o primeiro trabalho em menos de um minuto.'}</div>
            ${filtered ? '' : '<button class="btn btn-primary" type="button" data-action="new">Novo Pedido</button>'}
          </div>
        </td></tr>`;
      return;
    }
    tbody.innerHTML = orders.map(o => `
      <tr>
        <td>
          <div class="order-cell">
            <div class="order-avatar">${escHtml(ini(o.client?.name))}</div>
            <div style="min-width:0">
              <div class="name truncate">${escHtml(o.client?.name || '—')}</div>
              <div class="sub truncate">${escHtml(o.client?.phone || '')}</div>
            </div>
          </div>
        </td>
        <td class="order-proj">
          <div class="cat">${escHtml(Catalog.categoryLabel(o.category))}</div>
          ${o.carModel ? `<div class="car">${escHtml(o.carModel)}</div>` : ''}
        </td>
        <td>${o.amount != null ? `<span class="text-gold" style="font-weight:600">${brl(o.amount)}</span>` : '<span class="text-muted">—</span>'}</td>
        <td>${Catalog.financialStatusBadge(o.financial?.status)}</td>
        <td>${Catalog.workStatusBadge(o.workStatus)}</td>
        <td>${deliveryHtml(o)}</td>
        <td class="text-muted text-sm">${DateOnly.format(o.launchDate)}</td>
        <td>
          <div class="flex gap-1 justify-end">
            <button class="btn btn-ghost btn-sm" type="button" data-action="view" data-id="${escHtml(o.id)}">Ver pedido</button>
          </div>
        </td>
      </tr>`).join('');
  }

  function renderPagination() {
    const info = $('pg-info'), btns = $('pg-btns');
    const start = totalCount ? (currentPage - 1) * PER_PAGE + 1 : 0;
    info.textContent = totalCount ? `Mostrando ${start}–${start + orders.length - 1} de ${totalCount}` : '';
    btns.innerHTML = '';
    if (totalPages <= 1) return;
    const mk = (lbl, p, dis) => {
      const b = document.createElement('button');
      b.className = `btn btn-secondary btn-sm${p === currentPage ? ' active' : ''}`;
      b.textContent = lbl;
      b.disabled = dis || p === currentPage;
      b.onclick = () => { currentPage = p; loadList(); };
      btns.appendChild(b);
    };
    mk('‹', currentPage - 1, currentPage === 1);
    for (let i = 1; i <= totalPages; i++) mk(i, i, false);
    mk('›', currentPage + 1, currentPage === totalPages);
  }

  // ─── WIZARD ─────────────────────────────────────────────────────────────────
  function choiceButtons(container, list, current, onPick) {
    container.innerHTML = list.map(x =>
      `<button type="button" class="choice" role="radio" data-code="${escHtml(x.code)}" aria-pressed="${x.code === current}" aria-checked="${x.code === current}">${escHtml(x.label)}</button>`
    ).join('');
    container.onclick = e => {
      const b = e.target.closest('.choice');
      if (!b) return;
      container.querySelectorAll('.choice').forEach(c => {
        const on = c === b;
        c.setAttribute('aria-pressed', on); c.setAttribute('aria-checked', on);
      });
      onPick(b.dataset.code);
    };
  }

  function setFieldError(id, msg) {
    const input = $(id);
    const el = document.querySelector(`.field-error[data-for="${id}"]`);
    if (input && input.classList) input.classList.toggle('is-invalid', !!msg);
    if (el) { el.textContent = msg || ''; el.classList.toggle('show', !!msg); }
  }
  function clearErrors() {
    document.querySelectorAll('#modal-order .field-error').forEach(el => { el.textContent = ''; el.classList.remove('show'); });
    document.querySelectorAll('#modal-order .is-invalid').forEach(el => el.classList.remove('is-invalid'));
    showError('');
  }
  function showError(msg) { errBox.textContent = msg || ''; errBox.classList.toggle('show', !!msg); }

  function goStep(n) {
    wz.step = n;
    ['wz-1', 'wz-2', 'wz-3', 'wz-done'].forEach((id, i) => { $(id).hidden = (i + 1) !== n; });
    document.querySelectorAll('#wz-steps .wz-step').forEach(s => {
      const k = Number(s.dataset.step);
      s.classList.toggle('active', k === n);
      s.classList.toggle('done', k < n);
    });
    $('wz-steps').hidden = n === 4;
    $('wz-footer').hidden = n === 4;
    btnPrev.textContent = n === 1 ? 'Cancelar' : 'Voltar';
    btnNext.textContent = n === 3 ? 'Salvar pedido' : 'Salvar e continuar';

    const clientName = wz.client ? wz.client.name : fName.value.trim();
    $('wz-client-chip').textContent = wz.client ? `${wz.client.name} (já cadastrado)` : `${clientName} (novo)`;
    $('wz-summary-client').textContent = clientName;
    $('wz-summary-project').textContent = wz.category
      ? (fCar.value.trim() ? `${Catalog.categoryLabel(wz.category)} — ${fCar.value.trim()}` : Catalog.categoryLabel(wz.category))
      : '—';
    // Cliente vindo da ficha (?clientId) não volta para a etapa 1
    $('wz-back-client').hidden = !!wz.lockedClient;

    setTimeout(() => {
      const focus = n === 1 ? fPhone : n === 2 ? $('o-category').querySelector('.choice') : n === 3 ? fAmount : null;
      focus?.focus();
    }, 60);
  }

  function resetWizard() {
    Object.assign(wz, { step: 1, client: null, found: null, lockedClient: false, category: '', financialStatus: 'PENDING', paymentMethod: 'PIX', saving: false });
    [fPhone, fName, fCar, fAmount, fDelivery].forEach(f => { f.value = ''; });
    fLaunch.value = DateOnly.today();
    $('wz-found').hidden = true;
    choiceButtons($('o-category'), Catalog.categories, '', code => { wz.category = code; setFieldError('o-category', ''); });
    choiceButtons($('o-fin'), Catalog.financialStatuses, wz.financialStatus, code => { wz.financialStatus = code; });
    choiceButtons($('o-pay'), Catalog.paymentMethods, wz.paymentMethod, code => { wz.paymentMethod = code; });
    clearErrors();
    setNextLoading(false);
  }

  async function openWizard(clientId) {
    resetWizard();
    Modal.open('modal-order');
    if (clientId) {
      // "Novo pedido para este cliente": pula a etapa do cliente
      try {
        const res = await API.get(`/clients/${encodeURIComponent(clientId)}`);
        const c = res.data;
        wz.client = { id: c.id, name: c.name, phone: c.phone, projectsCount: c.projectsCount };
        wz.lockedClient = true;
        fName.value = c.name; fPhone.value = c.phone || '';
        goStep(2);
        return;
      } catch (err) {
        Toast.error('Cliente não encontrado. Informe o telefone.');
      }
    }
    goStep(1);
  }

  function closeWizard() {
    Modal.close('modal-order');
  }

  function setNextLoading(on) {
    wz.saving = on;
    btnPrev.disabled = on;
    if (on) Helpers.setButtonLoading(btnNext, true);
    else { btnNext.disabled = false; if (btnNext.dataset.originalText) { btnNext.innerHTML = btnNext.dataset.originalText; delete btnNext.dataset.originalText; } }
  }

  // Etapa 1: valida e procura o telefone
  async function lookupPhone() {
    const digits = phoneDigits(fPhone.value);
    if (digits.length < 10 || digits.length > 13) return null;
    const seq = ++wz.lookupSeq;
    const res = await API.get(`/orders/client-lookup?phone=${encodeURIComponent(fPhone.value.trim())}`);
    if (seq !== wz.lookupSeq) return undefined; // resposta antiga
    return res.data;
  }

  function showFound(client) {
    wz.found = client;
    $('wz-found-title').textContent = `Cliente já cadastrado: ${client.name}`;
    const n = client.projectsCount || 0;
    $('wz-found-sub').textContent = `${client.phone || ''} · ${n} ${n === 1 ? 'projeto vinculado' : 'projetos vinculados'}`;
    $('wz-found').hidden = false;
  }

  async function submitStep1() {
    clearErrors();
    const digits = phoneDigits(fPhone.value);
    let ok = true;
    if (!fPhone.value.trim())                     { setFieldError('o-phone', 'Informe o telefone.'); ok = false; }
    else if (digits.length < 10 || digits.length > 13) { setFieldError('o-phone', 'Telefone inválido. Use DDD + número, ex.: (54) 99999-9999.'); ok = false; }
    if (!ok) return fPhone.focus();

    setNextLoading(true);
    try {
      const r = await lookupPhone();
      if (r && r.found) { showFound(r.client); return; }
      if (!fName.value.trim()) { setFieldError('o-name', 'Informe o nome do cliente.'); fName.focus(); return; }
      wz.client = null;
      goStep(2);
    } catch (err) {
      showError(err.message || 'Não foi possível verificar o telefone.');
    } finally {
      setNextLoading(false);
    }
  }

  function useFoundClient() {
    if (!wz.found) return;
    wz.client = wz.found;
    fName.value = wz.found.name;
    $('wz-found').hidden = true;
    goStep(2);
  }

  function submitStep2() {
    clearErrors();
    if (!wz.category) { setFieldError('o-category', 'Escolha a categoria do projeto.'); return; }
    goStep(3);
    if (!fDelivery.value) fDelivery.focus();
  }

  function validateStep3() {
    clearErrors();
    let ok = true;
    const amount = parseAmount(fAmount.value);
    if (!fAmount.value.trim() || !Number.isFinite(amount) || amount < 0) { setFieldError('o-amount', 'Informe um valor válido, ex.: 850,00.'); ok = false; }
    if (!fLaunch.value)   { setFieldError('o-launch', 'Informe a data de lançamento.'); ok = false; }
    if (!fDelivery.value) { setFieldError('o-delivery', 'Informe a data de entrega.'); ok = false; }
    else if (fLaunch.value && fDelivery.value < fLaunch.value) { setFieldError('o-delivery', 'A entrega não pode ser antes do lançamento.'); ok = false; }
    return ok;
  }

  // Mapeia erro do backend (errors[].field) para a etapa certa
  const FIELD_MAP = {
    'client.name': [1, 'o-name'], 'client.phone': [1, 'o-phone'],
    'project.category': [2, 'o-category'], 'project.carModel': [2, 'o-car'],
    'commercial.amount': [3, 'o-amount'], 'commercial.launchDate': [3, 'o-launch'], 'commercial.deliveryDate': [3, 'o-delivery'],
  };

  async function submitOrder() {
    if (wz.saving || !validateStep3()) return;
    const payload = {
      clientId: wz.client ? wz.client.id : null,
      client:   wz.client ? null : { name: fName.value.trim(), phone: fPhone.value.trim() },
      project:  { category: wz.category, carModel: fCar.value.trim() || null },
      commercial: {
        amount:          fAmount.value.trim(),
        launchDate:      fLaunch.value,
        deliveryDate:    fDelivery.value,
        financialStatus: wz.financialStatus,
        paymentMethod:   wz.paymentMethod,
      },
    };
    setNextLoading(true);
    try {
      const res = await API.post('/orders', payload);
      showSuccess(res.data);
      loadList();
    } catch (err) {
      const first = Array.isArray(err.errors) ? err.errors[0] : null;
      const target = first && FIELD_MAP[first.field];
      if (target) {
        if (target[0] !== 3) goStep(target[0]);
        setFieldError(target[1], first.message);
      }
      showError(err.message || 'Não foi possível salvar o pedido. Nada foi gravado — tente novamente.');
    } finally {
      setNextLoading(false);
    }
  }

  function showSuccess(r) {
    const { client, project, quote, financial } = r;
    const row = (k, v) => `<div><div class="lbl">${k}</div><div class="val">${v}</div></div>`;
    $('wz-done-summary').innerHTML = [
      row('Cliente', escHtml(client.name) + (r.clientReused ? ' <span class="text-muted text-xs">(já cadastrado)</span>' : '')),
      row('Projeto', escHtml(project.title)),
      row('Publicado / Destaque', 'Não / Não'),
      row('Entrega prevista', escHtml(DateOnly.format(project.deliveryDate))),
      row('Orçamento', quote.estimatedBudget ? Privacy.html(quote.estimatedBudget, true) : '—'),
      row('Financeiro', `${Catalog.financialStatusBadge(financial.status)} · ${escHtml(Catalog.paymentLabel(financial.paymentMethod))}`),
    ].join('');
    const link = (href, label) => `<a class="btn btn-secondary btn-sm" href="${href}">${label}</a>`;
    $('wz-done-links').innerHTML = [
      link(`clients.html?id=${encodeURIComponent(client.id)}`, 'Ver cliente'),
      link(`projects.html?id=${encodeURIComponent(project.id)}`, 'Ver projeto'),
      link(`orcamentos.html?id=${encodeURIComponent(quote.id)}`, 'Ver orçamento'),
      link(`finances.html?id=${encodeURIComponent(financial.id)}`, 'Ver financeiro'),
      `<button class="btn btn-primary btn-sm" type="button" id="wz-again">Novo pedido</button>`,
    ].join('');
    $('wz-again').onclick = () => openWizard();
    goStep(4);
  }

  btnNext.addEventListener('click', () => {
    if (wz.saving) return;
    if (wz.step === 1) submitStep1();
    else if (wz.step === 2) submitStep2();
    else if (wz.step === 3) submitOrder();
  });
  btnPrev.addEventListener('click', () => {
    if (wz.saving) return;
    if (wz.step === 1) closeWizard();
    else if (wz.step === 2 && !wz.lockedClient) goStep(1);
    else if (wz.step === 2) closeWizard();
    else if (wz.step === 3) goStep(2);
  });
  $('wz-use-client').addEventListener('click', useFoundClient);
  $('wz-change-phone').addEventListener('click', () => { $('wz-found').hidden = true; wz.found = null; fPhone.select(); fPhone.focus(); });
  $('wz-back-client').addEventListener('click', () => { wz.client = null; goStep(1); });
  $('wz-back-project').addEventListener('click', () => goStep(2));

  // Enter avança a etapa (sem submit nativo)
  ['wz-1', 'wz-2', 'wz-3'].forEach(id => $(id).addEventListener('submit', e => { e.preventDefault(); btnNext.click(); }));
  document.querySelectorAll('#modal-order input').forEach(inp => inp.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); btnNext.click(); }
  }));

  // Telefone: avisa cedo se o cliente já existe (sem bloquear a digitação)
  fPhone.addEventListener('input', Helpers.debounce(async () => {
    setFieldError('o-phone', '');
    $('wz-found').hidden = true; wz.found = null;
    try {
      const r = await lookupPhone();
      if (r && r.found) showFound(r.client);
    } catch { /* validação completa acontece no "Salvar e continuar" */ }
  }, 450));
  fName.addEventListener('input', () => setFieldError('o-name', ''));

  // ─── DETALHES ───────────────────────────────────────────────────────────────
  let detailClientId = null;

  async function openDetail(id) {
    $('od-body').innerHTML = '<div class="table-empty"><span class="loader-ring"></span> &nbsp;Carregando...</div>';
    $('od-title').textContent = 'Pedido';
    $('od-subtitle').textContent = '';
    Modal.open('modal-detail');
    try {
      const res = await API.get(`/orders/${encodeURIComponent(id)}`);
      renderDetail(res.data);
    } catch (err) {
      $('od-body').innerHTML = `<div class="table-empty text-muted">${escHtml(err.message || 'Erro ao carregar o pedido')}</div>`;
    }
  }

  function renderDetail(o) {
    detailClientId = o.client?.id || null;
    $('od-title').textContent = projectLabel(o);
    $('od-subtitle').textContent = `${o.client?.name || ''} · lançado em ${DateOnly.format(o.launchDate)}`;
    const d = DateOnly.delivery(o.deliveryDate, o.workStatus);
    const cls = d.state === 'late' ? ' late' : d.state === 'today' ? ' today' : '';
    const row = (k, v) => `<div class="od-row"><span class="k">${k}</span><span class="v">${v}</span></div>`;
    const q = o.quote, f = o.financial;
    $('od-body').innerHTML = `
      <div class="od-delivery${cls}">${escHtml(d.text)}</div>
      <div class="od-grid">
        <div class="od-box">
          <h4>Cliente <a href="clients.html?id=${encodeURIComponent(o.client.id)}">Abrir →</a></h4>
          ${row('Nome', escHtml(o.client.name))}
          ${row('Telefone', escHtml(o.client.phone || '—'))}
          ${row('Contato', escHtml(o.client.instagram || '—'))}
          ${row('Instagram', escHtml(o.client.website || '—'))}
        </div>
        <div class="od-box">
          <h4>Projeto <a href="projects.html?id=${encodeURIComponent(o.projectId)}">Abrir →</a></h4>
          ${row('Categoria', escHtml(Catalog.categoryLabel(o.category)))}
          ${row('Modelo do carro', escHtml(o.carModel || '—'))}
          ${row('Publicado / Destaque', `${o.isPublished ? 'Sim' : 'Não'} / ${o.isFeatured ? 'Sim' : 'Não'}`)}
          <div class="od-work">
            <select class="form-control" id="od-work" aria-label="Status de andamento">${Catalog.options(Catalog.workStatuses, o.workStatus)}</select>
            <button class="btn btn-secondary btn-sm" type="button" id="od-work-save">Salvar</button>
          </div>
        </div>
        <div class="od-box">
          <h4>Orçamento ${q ? `<a href="orcamentos.html?id=${encodeURIComponent(q.id)}">Abrir →</a>` : ''}</h4>
          ${q ? row('Valor estimado', q.estimatedBudget ? Privacy.html(q.estimatedBudget, true) : '—') + row('Acompanhamento', Helpers.quoteStatusBadge(q.status))
              : '<div class="text-muted text-sm">Sem orçamento vinculado.</div>'}
        </div>
        <div class="od-box">
          <h4>Financeiro ${f ? `<a href="finances.html?id=${encodeURIComponent(f.id)}">Abrir →</a>` : ''}</h4>
          ${f ? row('Valor', brl(f.amount)) + row('Status', Catalog.financialStatusBadge(f.status)) + row('Pagamento', escHtml(Catalog.paymentLabel(f.paymentMethod)))
              : '<div class="text-muted text-sm">Sem lançamento vinculado.</div>'}
        </div>
      </div>`;

    const btn = $('od-work-save');
    btn.onclick = async () => {
      const workStatus = $('od-work').value;
      Helpers.setButtonLoading(btn, true);
      try {
        await API.put(`/projects/${encodeURIComponent(o.projectId)}`, { workStatus });
        Toast.success(`Andamento: ${Catalog.workStatusLabel(workStatus)}`);
        const res = await API.get(`/orders/${encodeURIComponent(o.projectId)}`);
        renderDetail(res.data);
        loadList();
      } catch (err) {
        Toast.error(err.message || 'Erro ao atualizar andamento');
        Helpers.setButtonLoading(btn, false);
      }
    };
  }

  $('od-new-for-client').addEventListener('click', () => {
    Modal.close('modal-detail');
    openWizard(detailClientId);
  });

  // ─── BIND ───────────────────────────────────────────────────────────────────
  $('btn-new').addEventListener('click', () => openWizard());
  $('btn-refresh').addEventListener('click', loadList);
  $('work-filters').addEventListener('click', e => {
    const b = e.target.closest('[data-work]');
    if (!b) return;
    filterWork = b.dataset.work;
    currentPage = 1;
    renderFilters();
    loadList();
  });
  $('filter-fin').addEventListener('change', e => { filterFin = e.target.value; currentPage = 1; loadList(); });
  $('filter-search').addEventListener('input', Helpers.debounce(e => {
    searchQuery = e.target.value.trim(); currentPage = 1; loadList();
  }, 350));
  tbody.addEventListener('click', e => {
    const b = e.target.closest('[data-action]');
    if (!b) return;
    if (b.dataset.action === 'view') openDetail(b.dataset.id);
    if (b.dataset.action === 'new')  openWizard();
  });

  // ─── INIT ───────────────────────────────────────────────────────────────────
  renderFilters();
  loadList();
  const qs = new URLSearchParams(location.search);
  if (qs.get('id'))            openDetail(qs.get('id'));
  else if (qs.get('clientId')) openWizard(qs.get('clientId'));
  else if (qs.get('new'))      openWizard();
})();

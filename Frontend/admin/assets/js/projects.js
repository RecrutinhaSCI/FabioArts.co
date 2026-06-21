/* ============================================================
   FABIOARTS ADMIN — projects.js
   CRUD de Projetos consumindo /api/projects + /api/clients
   ============================================================ */

(function () {
  'use strict';

  if (typeof Auth === 'undefined' || !Auth.requireAuth()) return;

  // ─── STATE ──────────────────────────────────────────────────────────────────
  let projects = [];
  let clientsCache = [];
  let currentPage = 1;
  let currentTotal = 0;
  let totalPages = 1;
  const PER_PAGE = 12;
  let filterFeatured = false;
  let filterPublishedOnly = false;
  let filterCategory = 'all';
  let searchQuery = '';
  let editingId = null;

  // ─── DOM ────────────────────────────────────────────────────────────────────
  const tbody         = document.getElementById('projects-tbody');
  const sTotal        = document.getElementById('s-total');
  const sPub          = document.getElementById('s-pub');
  const sFeat         = document.getElementById('s-feat');
  const sDraft        = document.getElementById('s-draft');
  const btnNew        = document.getElementById('btn-new');
  const btnRefresh    = document.getElementById('btn-refresh');
  const btnClearFilters = document.getElementById('btn-clear-filters');
  const filterSearch  = document.getElementById('filter-search');
  const filterFeat    = document.getElementById('filter-featured');
  const filterPub     = document.getElementById('filter-published');
  const pgInfo        = document.getElementById('pagination-info');
  const pgBtns        = document.getElementById('pagination-btns');
  const btnSave       = document.getElementById('btn-save');
  const fId           = document.getElementById('f-id');
  const fTitle        = document.getElementById('f-title');
  const fSlug         = document.getElementById('f-slug');
  const fSlugPreview  = document.getElementById('f-slug-preview');
  const fCategory     = document.getElementById('f-category');
  const fThumbnail    = document.getElementById('f-thumbnail');
  const fDescription  = document.getElementById('f-description');
  const fTags         = document.getElementById('f-tags');
  const fDate         = document.getElementById('f-date');
  const fPublished    = document.getElementById('f-published');
  const fFeatured     = document.getElementById('f-featured');
  const fClient       = document.getElementById('f-client');
  const modalTitle    = document.getElementById('modal-project-title');
  const thumbPreview  = document.getElementById('thumb-preview-box');
  const thumbPrevInfo = document.getElementById('thumb-preview-info');
  const viewTitle     = document.getElementById('view-title');
  const viewSubtitle  = document.getElementById('view-subtitle');
  const viewBody      = document.getElementById('view-body');
  const viewEditBtn   = document.getElementById('view-edit-btn');

  // ─── HELPERS ────────────────────────────────────────────────────────────────
  function escHtml(s){ return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function escAttr(s){ return escHtml(s); }
  function autoSlug(text) {
    return String(text || '').toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g,'')
      .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
  }

  function categoryLabel(cat) {
    return (typeof Helpers !== 'undefined' && Helpers.categoryLabel) ? Helpers.categoryLabel(cat) : cat;
  }
  function fmtDate(d) {
    return (typeof Helpers !== 'undefined' && Helpers.formatDate) ? Helpers.formatDate(d) : (d ? new Date(d).toLocaleDateString('pt-BR') : '—');
  }

  // ─── LIST ───────────────────────────────────────────────────────────────────
  async function loadList() {
    tbody.innerHTML = `<tr><td colspan="7" class="table-empty">
      <span class="loader-ring"></span> &nbsp;Carregando projetos...
    </td></tr>`;
    try {
      const params = new URLSearchParams({ page: currentPage, limit: PER_PAGE });
      if (searchQuery) params.set('search', searchQuery);
      if (filterFeatured) params.set('isFeatured', 'true');
      if (filterPublishedOnly) params.set('isPublished', 'true');
      if (filterCategory && filterCategory !== 'all') params.set('category', filterCategory);

      const res = await API.get(`/projects?${params.toString()}`);
      projects = res.data || [];
      currentTotal = res.pagination?.total ?? projects.length;
      totalPages   = res.pagination?.totalPages ?? 1;
      renderTable();
      renderPagination();
    } catch (err) {
      console.error(err);
      Toast.error('Erro ao carregar projetos');
      tbody.innerHTML = `<tr><td colspan="7" class="table-empty text-muted">Erro ao carregar</td></tr>`;
    }
  }

  async function loadStats() {
    try {
      const res = await API.get('/projects/stats');
      const s = res.data;
      if (sTotal) sTotal.textContent = s.total;
      if (sPub)   sPub.textContent   = s.published;
      if (sFeat)  sFeat.textContent  = s.featured;
      if (sDraft) sDraft.textContent = Math.max(0, s.total - s.published);
    } catch (err) { console.warn('stats:', err.message); }
  }

  async function loadClients() {
    try {
      const res = await API.get('/clients?limit=100');
      clientsCache = res.data || [];
      if (!fClient) return;
      const current = fClient.value;
      const opts = ['<option value="">— Sem cliente —</option>']
        .concat(clientsCache.map(c => `<option value="${c.id}">${escHtml(c.name)}${c.company ? ' · ' + escHtml(c.company) : ''}</option>`));
      fClient.innerHTML = opts.join('');
      if (current) fClient.value = current;
    } catch (err) { console.warn('clients:', err.message); }
  }

  // ─── RENDER ─────────────────────────────────────────────────────────────────
  function renderTable() {
    if (!projects.length) {
      tbody.innerHTML = `
        <tr><td colspan="7">
          <div class="state-block">
            <div class="state-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            </div>
            <div class="state-title">Nenhum projeto encontrado</div>
            <div class="state-text">Ajuste os filtros ou crie um novo projeto para o portfólio.</div>
            <button class="btn btn-primary" type="button" id="empty-new">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Novo Projeto
            </button>
          </div>
        </td></tr>`;
      document.getElementById('empty-new')?.addEventListener('click', () => openModal());
      return;
    }

    tbody.innerHTML = projects.map(p => {
      const thumb = p.thumbnail
        ? `<img src="${escAttr(p.thumbnail)}" alt="" onerror="this.replaceWith(Object.assign(document.createElement('span'),{textContent:'${escAttr(p.title.slice(0,2).toUpperCase())}'}))"/>`
        : `<span>${escHtml(p.title.slice(0,2).toUpperCase())}</span>`;
      const tags = (p.tags || []).slice(0, 3).map(t => `<span class="tag">${escHtml(t)}</span>`).join('');
      const statusBadge = p.isPublished
        ? `<span class="badge badge-green"><span class="badge-dot"></span>Publicado</span>`
        : `<span class="badge badge-grey"><span class="badge-dot"></span>Rascunho</span>`;
      const featBadge = p.isFeatured
        ? ` <span class="badge badge-gold" title="Em destaque">★ Destaque</span>`
        : '';
      return `
        <tr>
          <td>
            <div class="project-title-cell">
              <div class="project-thumb">${thumb}</div>
              <div style="min-width:0">
                <div class="title">${escHtml(p.title)}</div>
                <div class="slug truncate">/${escHtml(p.slug)}</div>
              </div>
            </div>
          </td>
          <td><span class="badge">${escHtml(categoryLabel(p.category))}</span></td>
          <td>${p.clientName ? escHtml(p.clientName) : '<span class="text-muted">—</span>'}</td>
          <td>${tags || '<span class="text-muted">—</span>'}</td>
          <td>${statusBadge}${featBadge}</td>
          <td class="text-muted text-sm">${fmtDate(p.projectDate || p.createdAt)}</td>
          <td>
            <div class="flex gap-1 justify-end">
              <button class="btn btn-ghost btn-icon" data-action="view" data-id="${p.id}" title="Visualizar" type="button">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
              <button class="btn btn-ghost btn-icon" data-action="edit" data-id="${p.id}" title="Editar" type="button">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="btn btn-ghost btn-icon" data-action="delete" data-id="${p.id}" data-title="${escAttr(p.title)}" title="Excluir" type="button" style="color:var(--red)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
              </button>
            </div>
          </td>
        </tr>`;
    }).join('');
  }

  function renderPagination() {
    if (pgInfo) {
      const start = currentTotal ? (currentPage - 1) * PER_PAGE + 1 : 0;
      const end   = Math.min(currentPage * PER_PAGE, currentTotal);
      pgInfo.textContent = currentTotal ? `Mostrando ${start}–${end} de ${currentTotal}` : 'Nenhum resultado';
    }
    if (!pgBtns) return;
    pgBtns.innerHTML = '';
    if (totalPages <= 1) return;
    const mk = (lbl, p, disabled) => {
      const b = document.createElement('button');
      b.className = `btn btn-secondary btn-sm${p === currentPage ? ' active' : ''}`;
      b.textContent = lbl;
      b.disabled = disabled || p === currentPage;
      b.onclick = () => { currentPage = p; loadList(); };
      pgBtns.appendChild(b);
    };
    mk('‹', currentPage - 1, currentPage === 1);
    for (let i = 1; i <= totalPages; i++) mk(i, i, false);
    mk('›', currentPage + 1, currentPage === totalPages);
  }

  // ─── MODAL: criar / editar ──────────────────────────────────────────────────
  function openModal(p) {
    editingId = p ? p.id : null;
    modalTitle.textContent = p ? 'Editar Projeto' : 'Novo Projeto';
    fId.value          = p?.id          || '';
    fTitle.value       = p?.title       || '';
    fSlug.value        = p?.slug        || '';
    fSlug.dataset.auto = p ? '0' : '1';
    if (fSlugPreview) fSlugPreview.textContent = fSlug.value || 'slug';
    fCategory.value    = p?.category    || '';
    fThumbnail.value   = p?.thumbnail   || '';
    fDescription.value = p?.description || '';
    fTags.value        = (p?.tags || []).join(', ');
    fDate.value        = p?.projectDate ? p.projectDate.slice(0,10) : '';
    fPublished.checked = p ? !!p.isPublished : true;
    fFeatured.checked  = p ? !!p.isFeatured  : false;
    fClient.value      = p?.clientId    || '';
    updateThumbPreview();
    Modal.open('modal-project');
    setTimeout(() => fTitle.focus(), 100);
  }

  function updateThumbPreview() {
    const url = (fThumbnail.value || '').trim();
    if (!url) {
      thumbPreview.innerHTML = '<span>sem prévia</span>';
      thumbPrevInfo.textContent = 'Cole uma URL acima para ver a prévia. Tamanho ideal: 1200×800.';
      return;
    }
    thumbPreview.innerHTML = `<img src="${escAttr(url)}" alt="preview" onerror="this.parentElement.innerHTML='<span style=color:var(--red)>erro</span>';document.getElementById('thumb-preview-info').textContent='Não foi possível carregar essa URL — confira se está pública.'"/>`;
    thumbPrevInfo.textContent = 'Prévia carregada. Confira o enquadramento antes de publicar.';
  }

  function buildPayload() {
    const tags = fTags.value.split(',').map(t => t.trim()).filter(Boolean);
    return {
      title:       fTitle.value.trim(),
      slug:        fSlug.value.trim(),
      description: fDescription.value.trim(),
      category:    fCategory.value,
      thumbnail:   fThumbnail.value.trim() || '',
      tags,
      isPublished: fPublished.checked,
      isFeatured:  fFeatured.checked,
      projectDate: fDate.value || null,
      clientId:    fClient.value || null,
    };
  }

  async function save() {
    const payload = buildPayload();
    if (!payload.title)    return Toast.error('Título é obrigatório');
    if (!payload.slug)     return Toast.error('Slug é obrigatório');
    if (!payload.category) return Toast.error('Categoria é obrigatória');

    Helpers.setButtonLoading(btnSave, true);
    try {
      if (editingId) {
        await API.put(`/projects/${editingId}`, payload);
        Toast.success('Projeto atualizado');
      } else {
        await API.post('/projects', payload);
        Toast.success('Projeto criado');
      }
      Modal.close('modal-project');
      await Promise.all([loadStats(), loadList()]);
    } catch (err) {
      Toast.error(err.message || 'Erro ao salvar');
    } finally {
      Helpers.setButtonLoading(btnSave, false);
    }
  }

  async function remove(id, title) {
    const ok = await Helpers.confirmDialog(`Excluir o projeto "${title}"? Essa ação não pode ser desfeita.`);
    if (!ok) return;
    try {
      await API.delete(`/projects/${id}`);
      Toast.success('Projeto excluído');
      await Promise.all([loadStats(), loadList()]);
    } catch (err) {
      Toast.error(err.message || 'Erro ao excluir');
    }
  }

  async function startEdit(id) {
    try {
      const res = await API.get(`/projects/${id}`);
      openModal(res.data);
    } catch (err) {
      Toast.error(err.message || 'Erro ao carregar projeto');
    }
  }

  // ─── MODAL: visualizar (premium) ────────────────────────────────────────────
  async function openView(id) {
    try {
      const res = await API.get(`/projects/${id}`);
      const p = res.data;
      if (!p) return;
      viewTitle.textContent    = p.title;
      viewSubtitle.textContent = '/' + p.slug;
      const hero = p.thumbnail
        ? `<img src="${escAttr(p.thumbnail)}" alt="${escAttr(p.title)}" onerror="this.parentElement.innerHTML='${escAttr(p.title.slice(0,2).toUpperCase())}'"/>`
        : escHtml(p.title.slice(0,2).toUpperCase());
      const statusBadge = p.isPublished
        ? `<span class="badge badge-green"><span class="badge-dot"></span>Publicado</span>`
        : `<span class="badge badge-grey"><span class="badge-dot"></span>Rascunho</span>`;
      const featBadge = p.isFeatured ? `<span class="badge badge-gold">★ Destaque</span>` : '';
      const tagsHtml = (p.tags || []).length
        ? `<div class="pv-tags">${p.tags.map(t => `<span class="tag">${escHtml(t)}</span>`).join('')}</div>`
        : '<span class="text-muted">—</span>';
      viewBody.innerHTML = `
        <div class="pv-hero">${hero}</div>
        <div style="display:flex;gap:.5rem;margin-top:1rem;flex-wrap:wrap">${statusBadge}${featBadge}</div>
        <div class="pv-meta">
          <div class="pv-meta-item"><div class="lbl">Categoria</div><div class="val">${escHtml(categoryLabel(p.category))}</div></div>
          <div class="pv-meta-item"><div class="lbl">Cliente</div><div class="val">${p.clientName ? escHtml(p.clientName) : '<span class="text-muted">—</span>'}</div></div>
          <div class="pv-meta-item"><div class="lbl">Data</div><div class="val">${fmtDate(p.projectDate || p.createdAt)}</div></div>
        </div>
        <div class="pv-section">
          <h4>Descrição</h4>
          <p>${p.description ? escHtml(p.description) : '<span class="text-muted">Sem descrição.</span>'}</p>
        </div>
        <div class="pv-section">
          <h4>Tags</h4>
          ${tagsHtml}
        </div>`;
      viewEditBtn.onclick = () => { Modal.close('modal-view'); startEdit(p.id); };
      Modal.open('modal-view');
    } catch (err) {
      Toast.error(err.message || 'Erro ao carregar projeto');
    }
  }

  // ─── BIND ───────────────────────────────────────────────────────────────────
  btnNew?.addEventListener('click', () => openModal());
  btnRefresh?.addEventListener('click', () => Promise.all([loadStats(), loadList(), loadClients()]));
  btnSave?.addEventListener('click', save);

  // Auto-slug ao digitar título + slug preview ao vivo
  fTitle?.addEventListener('input', () => {
    if (!editingId && (!fSlug.value || fSlug.dataset.auto === '1')) {
      fSlug.value = autoSlug(fTitle.value);
      fSlug.dataset.auto = '1';
      if (fSlugPreview) fSlugPreview.textContent = fSlug.value || 'slug';
    }
  });
  fSlug?.addEventListener('input', () => {
    fSlug.dataset.auto = '0';
    if (fSlugPreview) fSlugPreview.textContent = fSlug.value || 'slug';
  });

  // Preview thumbnail
  fThumbnail?.addEventListener('input', Helpers.debounce(updateThumbPreview, 350));

  filterSearch?.addEventListener('input', Helpers.debounce(() => {
    searchQuery = filterSearch.value.trim();
    currentPage = 1;
    loadList();
  }, 350));

  filterFeat?.addEventListener('change', () => {
    filterFeatured = filterFeat.checked;
    currentPage = 1;
    loadList();
  });
  filterPub?.addEventListener('change', () => {
    filterPublishedOnly = filterPub.checked;
    currentPage = 1;
    loadList();
  });

  // Filtros de categoria
  document.querySelectorAll('.filter-btn[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn[data-filter]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filterCategory = btn.dataset.filter || 'all';
      currentPage = 1;
      loadList();
    });
  });

  // Limpar filtros
  btnClearFilters?.addEventListener('click', () => {
    filterCategory = 'all';
    filterFeatured = false;
    filterPublishedOnly = false;
    searchQuery = '';
    if (filterSearch) filterSearch.value = '';
    if (filterFeat) filterFeat.checked = false;
    if (filterPub)  filterPub.checked  = false;
    document.querySelectorAll('.filter-btn[data-filter]').forEach(b => b.classList.toggle('active', b.dataset.filter === 'all'));
    currentPage = 1;
    loadList();
  });

  // Delegação de cliques na tabela
  tbody?.addEventListener('click', e => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const id = btn.dataset.id;
    if (btn.dataset.action === 'view')   openView(id);
    if (btn.dataset.action === 'edit')   startEdit(id);
    if (btn.dataset.action === 'delete') remove(id, btn.dataset.title);
  });

  // ─── INIT ───────────────────────────────────────────────────────────────────
  Promise.all([loadClients(), loadStats(), loadList()]);
})();

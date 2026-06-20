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
  let searchQuery = '';
  let editingId = null;
  let deletingId = null;

  // ─── DOM ────────────────────────────────────────────────────────────────────
  const tbody         = document.getElementById('projects-tbody');
  const sTotal        = document.getElementById('s-total');
  const sPub          = document.getElementById('s-pub');
  const sFeat         = document.getElementById('s-feat');
  const sDraft        = document.getElementById('s-draft');
  const btnNew        = document.getElementById('btn-new');
  const btnRefresh    = document.getElementById('btn-refresh');
  const filterSearch  = document.getElementById('filter-search');
  const filterFeat    = document.getElementById('filter-featured');
  const pgInfo        = document.getElementById('pagination-info');
  const pgBtns        = document.getElementById('pagination-btns');
  const btnSave       = document.getElementById('btn-save');
  const fId           = document.getElementById('f-id');
  const fTitle        = document.getElementById('f-title');
  const fSlug         = document.getElementById('f-slug');
  const fCategory     = document.getElementById('f-category');
  const fThumbnail    = document.getElementById('f-thumbnail');
  const fDescription  = document.getElementById('f-description');
  const fTags         = document.getElementById('f-tags');
  const fDate         = document.getElementById('f-date');
  const fPublished    = document.getElementById('f-published');
  const fFeatured     = document.getElementById('f-featured');
  const fClient       = document.getElementById('f-client');
  const modalTitle    = document.getElementById('modal-project-title');

  // ─── LIST ───────────────────────────────────────────────────────────────────
  async function loadList() {
    tbody.innerHTML = `<tr><td colspan="8" class="table-empty">
      <span class="loader-ring" style="display:inline-block;width:16px;height:16px;border-width:2px;"></span>
      &nbsp;Carregando projetos…</td></tr>`;
    try {
      const params = new URLSearchParams({
        page: currentPage,
        limit: PER_PAGE,
      });
      if (searchQuery) params.set('search', searchQuery);
      if (filterFeatured) params.set('isFeatured', 'true');

      const res = await API.get(`/projects?${params.toString()}`);
      projects = res.data || [];
      currentTotal = res.pagination?.total ?? projects.length;
      totalPages   = res.pagination?.totalPages ?? 1;
      renderTable();
      renderPagination();
    } catch (err) {
      console.error(err);
      Toast.error('Erro ao carregar projetos');
      tbody.innerHTML = `<tr><td colspan="8" class="table-empty text-muted">Erro ao carregar</td></tr>`;
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
      const opts = ['<option value="">— Sem cliente —</option>']
        .concat(clientsCache.map(c => `<option value="${c.id}">${escHtml(c.name)}${c.company ? ' · ' + escHtml(c.company) : ''}</option>`));
      fClient.innerHTML = opts.join('');
    } catch (err) { console.warn('clients:', err.message); }
  }

  // ─── RENDER ─────────────────────────────────────────────────────────────────
  function renderTable() {
    if (!projects.length) {
      tbody.innerHTML = `<tr><td colspan="8" class="table-empty">Nenhum projeto encontrado</td></tr>`;
      return;
    }

    tbody.innerHTML = projects.map(p => {
      const thumb = p.thumbnail
        ? `<img src="${escHtml(p.thumbnail)}" alt="" onerror="this.style.display='none'"/>`
        : `${(p.title || '?').slice(0,2).toUpperCase()}`;
      const tags = (p.tags || []).slice(0, 3).map(t => `<span class="tag">${escHtml(t)}</span>`).join('');
      const status = p.isPublished
        ? `<span class="badge badge-green"><span class="badge-dot"></span>Publicado</span>`
        : `<span class="badge badge-grey"><span class="badge-dot"></span>Rascunho</span>`;
      const featured = p.isFeatured ? ' <span class="badge badge-yellow">★</span>' : '';
      return `
        <tr>
          <td><div class="project-thumb">${thumb}</div></td>
          <td>
            <div class="table-user-name">${escHtml(p.title)}${featured}</div>
            <div class="table-user-email" style="font-family:var(--mono);font-size:.7rem">${escHtml(p.slug)}</div>
          </td>
          <td><span class="cat-pill">${Helpers.categoryLabel(p.category)}</span></td>
          <td>${tags || '<span class="text-muted">—</span>'}</td>
          <td>${status}</td>
          <td>${p.clientName ? escHtml(p.clientName) : '<span class="text-muted">—</span>'}</td>
          <td class="text-muted text-sm">${Helpers.formatDate(p.projectDate || p.createdAt)}</td>
          <td>
            <div style="display:flex;gap:.3rem;justify-content:flex-end">
              <button class="btn btn-secondary btn-sm" data-action="edit" data-id="${p.id}" title="Editar">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="btn btn-secondary btn-sm" data-action="delete" data-id="${p.id}" data-title="${escHtml(p.title)}" title="Excluir" style="color:var(--red)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
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

  // ─── MODAL CRUD ─────────────────────────────────────────────────────────────
  function openModal(p) {
    editingId = p ? p.id : null;
    modalTitle.textContent = p ? 'Editar Projeto' : 'Novo Projeto';
    fId.value          = p?.id          || '';
    fTitle.value       = p?.title       || '';
    fSlug.value        = p?.slug        || '';
    fCategory.value    = p?.category    || '';
    fThumbnail.value   = p?.thumbnail   || '';
    fDescription.value = p?.description || '';
    fTags.value        = (p?.tags || []).join(', ');
    fDate.value        = p?.projectDate ? p.projectDate.slice(0,10) : '';
    fPublished.checked = p ? !!p.isPublished : true;
    fFeatured.checked  = p ? !!p.isFeatured  : false;
    fClient.value      = p?.clientId    || '';
    Modal.open('modal-project');
    setTimeout(() => fTitle.focus(), 100);
  }

  function buildPayload() {
    const tags = fTags.value
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);
    const payload = {
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
    return payload;
  }

  async function save() {
    const payload = buildPayload();
    if (!payload.title)    { Toast.error('Título é obrigatório'); return; }
    if (!payload.slug)     { Toast.error('Slug é obrigatório'); return; }
    if (!payload.category) { Toast.error('Categoria é obrigatória'); return; }

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
    const ok = await Helpers.confirmDialog(`Excluir o projeto "${title}"?`);
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

  // ─── UTILS ──────────────────────────────────────────────────────────────────
  function escHtml(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function autoSlug(text) {
    return String(text || '').toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  // ─── BIND ───────────────────────────────────────────────────────────────────
  btnNew?.addEventListener('click', () => openModal());
  btnRefresh?.addEventListener('click', () => Promise.all([loadStats(), loadList()]));
  btnSave?.addEventListener('click', save);

  // Auto-slug ao digitar título (só se slug ainda estiver vazio ou em modo "novo")
  fTitle?.addEventListener('input', () => {
    if (!editingId && (!fSlug.value || fSlug.dataset.auto === '1')) {
      fSlug.value = autoSlug(fTitle.value);
      fSlug.dataset.auto = '1';
    }
  });
  fSlug?.addEventListener('input', () => { fSlug.dataset.auto = '0'; });

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

  tbody?.addEventListener('click', e => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const id = btn.dataset.id;
    if (btn.dataset.action === 'edit')   startEdit(id);
    if (btn.dataset.action === 'delete') remove(id, btn.dataset.title);
  });

  // ─── INIT ───────────────────────────────────────────────────────────────────
  Promise.all([loadClients(), loadStats(), loadList()]);
})();

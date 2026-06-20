/* ============================================================
   FABIOARTS ADMIN — services.js  (CRUD de Serviços)
   ============================================================ */

(function () {
  'use strict';

  if (typeof Auth === 'undefined' || !Auth.requireAuth()) return;

  let services = [];
  let editingId = null;
  let currentPage = 1, totalCount = 0, totalPages = 1;
  const PER_PAGE = 20;

  const tbody        = document.getElementById('services-tbody');
  const btnNew       = document.getElementById('btn-new');
  const btnRefresh   = document.getElementById('btn-refresh');
  const btnSave      = document.getElementById('btn-save');
  const filterSearch = document.getElementById('filter-search');
  const filterActive = document.getElementById('filter-active');
  const pgInfo       = document.getElementById('pagination-info');
  const pgBtns       = document.getElementById('pagination-btns');
  const modalTitle   = document.getElementById('modal-title');
  const fId          = document.getElementById('f-id');
  const fName        = document.getElementById('f-name');
  const fDescription = document.getElementById('f-description');
  const fPrice       = document.getElementById('f-price');
  const fOrder       = document.getElementById('f-order');
  const fImage       = document.getElementById('f-image');
  const fActive      = document.getElementById('f-active');
  const fFeatured    = document.getElementById('f-featured');

  function escHtml(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  async function load() {
    try {
      const params = new URLSearchParams({ page: currentPage, limit: PER_PAGE });
      if (filterSearch.value.trim()) params.set('search', filterSearch.value.trim());
      if (filterActive.checked) params.set('isActive', 'true');

      const res = await API.get(`/services?${params.toString()}`);
      services   = res.data?.data ?? res.data ?? [];
      const pg   = res.data?.pagination ?? res.pagination ?? {};
      totalCount = pg.total ?? services.length;
      totalPages = pg.totalPages ?? 1;
      render();
    } catch (err) {
      console.error(err);
      Toast.error('Erro ao carregar serviços');
      tbody.innerHTML = `<tr><td colspan="6" class="table-empty text-muted">Erro</td></tr>`;
    }
  }

  function render() {
    if (!services.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="table-empty">Nenhum serviço cadastrado</td></tr>`;
    } else {
      tbody.innerHTML = services.map(s => `
        <tr>
          <td>
            <div class="table-user-name">${escHtml(s.name)}${s.isFeatured ? ' <span class="badge badge-yellow">★</span>' : ''}</div>
          </td>
          <td><span class="text-muted text-sm">${escHtml(Helpers.truncate(s.description, 80))}</span></td>
          <td>${s.startingPrice != null ? Helpers.formatCurrency(s.startingPrice) : '<span class="text-muted">—</span>'}</td>
          <td><span class="text-muted">${s.order}</span></td>
          <td>${s.isActive
              ? '<span class="badge badge-green"><span class="badge-dot"></span>Ativo</span>'
              : '<span class="badge badge-grey"><span class="badge-dot"></span>Inativo</span>'}</td>
          <td>
            <div style="display:flex;gap:.3rem;justify-content:flex-end">
              <button class="btn btn-secondary btn-sm" data-action="edit" data-id="${s.id}" title="Editar">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="btn btn-secondary btn-sm" data-action="delete" data-id="${s.id}" data-name="${escHtml(s.name)}" title="Excluir" style="color:var(--red)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
              </button>
            </div>
          </td>
        </tr>
      `).join('');
    }

    if (pgInfo) {
      const start = totalCount ? (currentPage - 1) * PER_PAGE + 1 : 0;
      const end   = Math.min(currentPage * PER_PAGE, totalCount);
      pgInfo.textContent = totalCount ? `Mostrando ${start}–${end} de ${totalCount}` : 'Nenhum resultado';
    }
    if (pgBtns) {
      pgBtns.innerHTML = '';
      if (totalPages > 1) {
        for (let i = 1; i <= totalPages; i++) {
          const b = document.createElement('button');
          b.className = `btn btn-secondary btn-sm${i === currentPage ? ' active' : ''}`;
          b.textContent = i;
          b.disabled = i === currentPage;
          b.onclick = () => { currentPage = i; load(); };
          pgBtns.appendChild(b);
        }
      }
    }
  }

  function openModal(s) {
    editingId = s ? s.id : null;
    modalTitle.textContent = s ? 'Editar Serviço' : 'Novo Serviço';
    fId.value          = s?.id          ?? '';
    fName.value        = s?.name        ?? '';
    fDescription.value = s?.description ?? '';
    fPrice.value       = s?.startingPrice ?? '';
    fOrder.value       = s?.order ?? 0;
    fImage.value       = s?.image ?? '';
    fActive.checked    = s ? !!s.isActive : true;
    fFeatured.checked  = s ? !!s.isFeatured : false;
    Modal.open('modal-service');
    setTimeout(() => fName.focus(), 80);
  }

  async function save() {
    const payload = {
      name:          fName.value.trim(),
      description:   fDescription.value.trim(),
      startingPrice: fPrice.value === '' ? null : Number(fPrice.value),
      order:         fOrder.value === '' ? 0 : Number(fOrder.value),
      image:         fImage.value.trim() || null,
      isActive:      fActive.checked,
      isFeatured:    fFeatured.checked,
    };
    if (!payload.name)        return Toast.error('Nome é obrigatório');
    if (!payload.description) return Toast.error('Descrição é obrigatória');

    Helpers.setButtonLoading(btnSave, true);
    try {
      if (editingId) {
        await API.put(`/services/${editingId}`, payload);
        Toast.success('Serviço atualizado');
      } else {
        await API.post('/services', payload);
        Toast.success('Serviço criado');
      }
      Modal.close('modal-service');
      await load();
    } catch (err) {
      Toast.error(err.message || 'Erro ao salvar');
    } finally {
      Helpers.setButtonLoading(btnSave, false);
    }
  }

  async function remove(id, name) {
    const ok = await Helpers.confirmDialog(`Excluir o serviço "${name}"?`);
    if (!ok) return;
    try {
      await API.delete(`/services/${id}`);
      Toast.success('Serviço excluído');
      await load();
    } catch (err) {
      Toast.error(err.message || 'Erro ao excluir');
    }
  }

  btnNew?.addEventListener('click', () => openModal());
  btnRefresh?.addEventListener('click', load);
  btnSave?.addEventListener('click', save);
  filterSearch?.addEventListener('input', Helpers.debounce(() => { currentPage = 1; load(); }, 350));
  filterActive?.addEventListener('change', () => { currentPage = 1; load(); });

  tbody?.addEventListener('click', async e => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const id = btn.dataset.id;
    if (btn.dataset.action === 'edit') {
      try {
        const res = await API.get(`/services/${id}`);
        openModal(res.data);
      } catch (err) { Toast.error(err.message || 'Erro ao carregar'); }
    }
    if (btn.dataset.action === 'delete') remove(id, btn.dataset.name);
  });

  load();
})();

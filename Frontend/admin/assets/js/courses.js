/* ============================================================
   FABIOARTS ADMIN — courses.js  (CRUD de Cursos)
   ============================================================ */

(function () {
  'use strict';

  if (typeof Auth === 'undefined' || !Auth.requireAuth()) return;

  const LEVEL_LABEL = { BEGINNER: 'Iniciante', INTERMEDIATE: 'Intermediário', ADVANCED: 'Avançado' };
  const LEVEL_BADGE = { BEGINNER: 'badge-green', INTERMEDIATE: 'badge-yellow', ADVANCED: 'badge-red' };

  let items = [];
  let editingId = null;
  let filterLevel = 'all';
  let filterFeatured = false;
  let filterActive = false;
  let searchQuery = '';

  const tbody       = document.getElementById('crud-tbody');
  const btnNew      = document.getElementById('btn-new');
  const btnRefresh  = document.getElementById('btn-refresh');
  const btnSave     = document.getElementById('btn-save');
  const filterFeat  = document.getElementById('filter-featured');
  const filterAct   = document.getElementById('filter-active');
  const filterSearch = document.getElementById('filter-search');
  const modalTitle  = document.getElementById('modal-title');
  const f = id => document.getElementById('f-' + id);

  function escHtml(s){ return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  async function loadList() {
    tbody.innerHTML = `<tr><td colspan="7" class="table-empty"><span class="loader-ring"></span> &nbsp;Carregando...</td></tr>`;
    try {
      const params = new URLSearchParams();
      if (filterLevel !== 'all') params.set('level', filterLevel);
      if (filterFeatured) params.set('isFeatured', 'true');
      if (filterActive)   params.set('isActive', 'true');
      if (searchQuery)    params.set('search', searchQuery);
      const url = '/courses' + (params.toString() ? '?' + params.toString() : '');
      const res = await API.get(url);
      items = res.data || [];
      render();
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="7" class="table-empty text-muted">Erro: ${escHtml(err.message)}</td></tr>`;
    }
  }

  function render() {
    if (!items.length) {
      tbody.innerHTML = `
        <tr><td colspan="7">
          <div class="state-block">
            <div class="state-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>
            </div>
            <div class="state-title">Nenhum curso cadastrado</div>
            <div class="state-text">Adicione cursos para exibir na vitrine pública.</div>
          </div>
        </td></tr>`;
      return;
    }

    tbody.innerHTML = items.map(c => {
      const thumb = c.image
        ? `<img src="${escHtml(c.image)}" alt="" onerror="this.parentElement.innerHTML='${escHtml(c.label||c.title.slice(0,3).toUpperCase())}'"/>`
        : `<span>${escHtml(c.label || c.title.slice(0,3).toUpperCase())}</span>`;
      const featBadge = c.isFeatured ? ' <span class="badge badge-gold">★</span>' : '';
      return `
        <tr>
          <td>
            <div class="flex gap-1 items-center" style="gap:.75rem">
              <div class="course-thumb">${thumb}</div>
              <div style="min-width:0">
                <div style="font-weight:600;color:var(--txt);font-size:.85rem">${escHtml(c.title)}${featBadge}</div>
                <div class="text-muted text-sm truncate" style="max-width:280px">${escHtml((c.description||'').slice(0,70))}${(c.description||'').length>70?'...':''}</div>
              </div>
            </div>
          </td>
          <td><span class="badge">${escHtml(c.category)}</span></td>
          <td><span class="badge ${LEVEL_BADGE[c.level]||''}">${LEVEL_LABEL[c.level]||c.level}</span></td>
          <td class="text-muted text-sm">${escHtml(c.duration || '—')}</td>
          <td><span class="text-gold" style="font-weight:600">${escHtml(c.price || '—')}</span></td>
          <td>${c.isActive
              ? '<span class="badge badge-green"><span class="badge-dot"></span>Ativo</span>'
              : '<span class="badge badge-grey"><span class="badge-dot"></span>Inativo</span>'}</td>
          <td>
            <div class="flex gap-1 justify-end">
              <button class="btn btn-ghost btn-icon" data-action="edit" data-id="${c.id}" title="Editar" type="button">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="btn btn-ghost btn-icon" data-action="delete" data-id="${c.id}" data-title="${escHtml(c.title)}" title="Excluir" type="button" style="color:var(--red)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
              </button>
            </div>
          </td>
        </tr>`;
    }).join('');
  }

  function openModal(c) {
    editingId = c ? c.id : null;
    modalTitle.textContent = c ? 'Editar curso' : 'Novo curso';
    f('title').value       = c?.title       || '';
    f('category').value    = c?.category    || '';
    f('description').value = c?.description || '';
    f('level').value       = c?.level       || 'BEGINNER';
    f('duration').value    = c?.duration    || '';
    f('price').value       = c?.price       || '';
    f('label').value       = c?.label       || '';
    f('externalUrl').value = c?.externalUrl || '';
    f('image').value       = c?.image       || '';
    f('isActive').checked  = c ? !!c.isActive   : true;
    f('isFeatured').checked = c ? !!c.isFeatured : false;
    f('order').value       = c?.order != null ? c.order : 0;
    Modal.open('course-modal');
    setTimeout(() => f('title').focus(), 80);
  }

  function buildPayload() {
    return {
      title:       f('title').value.trim(),
      category:    f('category').value.trim(),
      description: f('description').value.trim(),
      level:       f('level').value,
      duration:    f('duration').value.trim() || null,
      price:       f('price').value.trim()    || null,
      label:       f('label').value.trim()    || null,
      externalUrl: f('externalUrl').value.trim() || null,
      image:       f('image').value.trim()    || null,
      isActive:    f('isActive').checked,
      isFeatured:  f('isFeatured').checked,
      order:       f('order').value === '' ? 0 : Number(f('order').value),
    };
  }

  async function save() {
    const payload = buildPayload();
    if (!payload.title)       return Toast.error('Título é obrigatório');
    if (!payload.category)    return Toast.error('Categoria é obrigatória');
    if (!payload.description) return Toast.error('Descrição é obrigatória');

    Helpers.setButtonLoading(btnSave, true);
    try {
      if (editingId) {
        await API.put(`/courses/${editingId}`, payload);
        Toast.success('Curso atualizado');
      } else {
        await API.post('/courses', payload);
        Toast.success('Curso criado');
      }
      Modal.close('course-modal');
      await loadList();
    } catch (err) {
      Toast.error(err.message || 'Erro ao salvar');
    } finally {
      Helpers.setButtonLoading(btnSave, false);
    }
  }

  async function remove(id, title) {
    const ok = await Helpers.confirmDialog(`Excluir o curso "${title}"?`);
    if (!ok) return;
    try {
      await API.delete(`/courses/${id}`);
      Toast.success('Curso excluído');
      await loadList();
    } catch (err) {
      Toast.error(err.message || 'Erro ao excluir');
    }
  }

  async function startEdit(id) {
    try {
      const res = await API.get(`/courses/${id}`);
      openModal(res.data);
    } catch (err) {
      Toast.error(err.message || 'Erro ao carregar curso');
    }
  }

  // Bind
  btnNew?.addEventListener('click', () => openModal());
  btnRefresh?.addEventListener('click', loadList);
  btnSave?.addEventListener('click', save);

  document.querySelectorAll('.filter-btn[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn[data-filter]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filterLevel = btn.dataset.filter || 'all';
      loadList();
    });
  });
  filterFeat?.addEventListener('change', () => { filterFeatured = filterFeat.checked; loadList(); });
  filterAct?.addEventListener('change',  () => { filterActive   = filterAct.checked;   loadList(); });
  filterSearch?.addEventListener('input', Helpers.debounce(() => {
    searchQuery = filterSearch.value.trim();
    loadList();
  }, 300));

  tbody?.addEventListener('click', e => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    if (btn.dataset.action === 'edit')   startEdit(btn.dataset.id);
    if (btn.dataset.action === 'delete') remove(btn.dataset.id, btn.dataset.title);
  });

  loadList();
})();

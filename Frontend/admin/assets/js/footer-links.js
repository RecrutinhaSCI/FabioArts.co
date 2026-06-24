/* ============================================================
   FABIOARTS ADMIN — footer-links.js
   Gerencia FooterColumn + FooterLink em uma única página.
   GET /footer-columns devolve include de links via Prisma include.
   ============================================================ */

(function () {
  'use strict';

  if (typeof Auth === 'undefined' || !Auth.requireAuth()) return;

  let columns = [];
  let editingColumnId = null;
  let editingLinkId   = null;

  const wrap = document.getElementById('columns-wrap');

  const colTitle    = document.getElementById('col-title');
  const colOrder    = document.getElementById('col-order');
  const colActive   = document.getElementById('col-isActive');
  const colModalTtl = document.getElementById('column-modal-title');
  const btnColSave  = document.getElementById('btn-col-save');
  const btnNewCol   = document.getElementById('btn-new-column');
  const btnRefresh  = document.getElementById('btn-refresh');

  const lnkCol      = document.getElementById('lnk-columnId');
  const lnkLabel    = document.getElementById('lnk-label');
  const lnkUrl      = document.getElementById('lnk-url');
  const lnkOrder    = document.getElementById('lnk-order');
  const lnkExternal = document.getElementById('lnk-isExternal');
  const lnkActive   = document.getElementById('lnk-isActive');
  const lnkModalTtl = document.getElementById('link-modal-title');
  const btnLnkSave  = document.getElementById('btn-lnk-save');

  function escHtml(s) { return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  // ─── Load ───────────────────────────────────────────────────────────────────
  async function loadAll() {
    wrap.innerHTML = `<div class="card"><div class="table-empty"><span class="loader-ring"></span> &nbsp;Carregando...</div></div>`;
    try {
      const res = await API.get('/footer-columns');
      columns = res.data || [];
      render();
      populateColumnSelect();
    } catch (err) {
      wrap.innerHTML = `<div class="card"><div class="table-empty text-muted">Erro: ${escHtml(err.message)}</div></div>`;
    }
  }

  function populateColumnSelect() {
    lnkCol.innerHTML = columns.length
      ? columns.map(c => `<option value="${c.id}">${escHtml(c.title)}${c.isActive ? '' : ' (inativa)'}</option>`).join('')
      : '<option value="">Crie uma coluna primeiro</option>';
  }

  // ─── Render ─────────────────────────────────────────────────────────────────
  function render() {
    if (!columns.length) {
      wrap.innerHTML = `
        <div class="card">
          <div class="state-block">
            <div class="state-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/></svg>
            </div>
            <div class="state-title">Sem colunas ainda</div>
            <div class="state-text">Crie uma coluna para organizar os links do footer.</div>
            <button class="btn btn-primary" type="button" id="empty-new">Criar primeira coluna</button>
          </div>
        </div>`;
      document.getElementById('empty-new')?.addEventListener('click', () => openColumnModal());
      return;
    }

    wrap.innerHTML = columns.map(col => `
      <div class="card col-card">
        <div class="col-card-head">
          <div class="col-card-title">
            ${escHtml(col.title)}
            ${col.isActive
              ? '<span class="badge badge-green" style="margin-left:.45rem"><span class="badge-dot"></span>Ativa</span>'
              : '<span class="badge badge-grey" style="margin-left:.45rem"><span class="badge-dot"></span>Inativa</span>'}
            <span class="text-muted text-sm" style="margin-left:.5rem">ordem ${col.order}</span>
          </div>
          <div class="flex gap-1">
            <button class="btn btn-secondary btn-sm" data-act="add-link" data-id="${col.id}" type="button">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Link
            </button>
            <button class="btn btn-ghost btn-icon" data-act="edit-col" data-id="${col.id}" type="button" title="Editar coluna">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="btn btn-ghost btn-icon" data-act="del-col" data-id="${col.id}" data-title="${escHtml(col.title)}" type="button" title="Excluir coluna" style="color:var(--red)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
            </button>
          </div>
        </div>
        <div class="links-list">
          ${(col.links || []).length
            ? (col.links.map(l => `
                <div class="link-row">
                  <span class="lbl">${escHtml(l.label)}</span>
                  <span class="url">${escHtml(l.url)}</span>
                  ${l.isExternal ? '<span class="badge badge-blue" style="margin-left:.5rem">externo</span>' : ''}
                  ${l.isActive ? '' : '<span class="badge badge-grey" style="margin-left:.5rem">inativo</span>'}
                  <span class="text-muted text-sm">#${l.order}</span>
                  <div class="acts">
                    <button class="btn btn-ghost btn-icon" data-act="edit-link" data-id="${l.id}" type="button" title="Editar link">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button class="btn btn-ghost btn-icon" data-act="del-link" data-id="${l.id}" data-label="${escHtml(l.label)}" type="button" title="Excluir link" style="color:var(--red)">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                    </button>
                  </div>
                </div>`).join(''))
            : '<div class="text-muted text-sm" style="padding:.5rem .25rem">Sem links nesta coluna.</div>'
          }
        </div>
      </div>
    `).join('');
  }

  // ─── Column modal ──────────────────────────────────────────────────────────
  function openColumnModal(col) {
    editingColumnId = col ? col.id : null;
    colModalTtl.textContent = col ? 'Editar coluna' : 'Nova coluna';
    colTitle.value  = col?.title || '';
    colOrder.value  = col?.order != null ? col.order : 0;
    colActive.checked = col ? !!col.isActive : true;
    Modal.open('column-modal');
    setTimeout(() => colTitle.focus(), 80);
  }

  async function saveColumn() {
    const payload = {
      title:    colTitle.value.trim(),
      order:    colOrder.value === '' ? 0 : Number(colOrder.value),
      isActive: colActive.checked,
    };
    if (!payload.title) return Toast.error('Título é obrigatório');
    Helpers.setButtonLoading(btnColSave, true);
    try {
      if (editingColumnId) {
        await API.put(`/footer-columns/${editingColumnId}`, payload);
        Toast.success('Coluna atualizada');
      } else {
        await API.post('/footer-columns', payload);
        Toast.success('Coluna criada');
      }
      Modal.close('column-modal');
      await loadAll();
    } catch (err) {
      Toast.error(err.message || 'Erro ao salvar coluna');
    } finally {
      Helpers.setButtonLoading(btnColSave, false);
    }
  }

  async function deleteColumn(id, title) {
    const ok = await Helpers.confirmDialog(`Excluir a coluna "${title}" e TODOS os links dentro dela?`);
    if (!ok) return;
    try {
      await API.delete(`/footer-columns/${id}`);
      Toast.success('Coluna excluída');
      await loadAll();
    } catch (err) {
      Toast.error(err.message || 'Erro ao excluir');
    }
  }

  // ─── Link modal ────────────────────────────────────────────────────────────
  function openLinkModal(link, presetColumnId) {
    editingLinkId = link ? link.id : null;
    lnkModalTtl.textContent = link ? 'Editar link' : 'Novo link';
    lnkCol.value      = link?.columnId || presetColumnId || (columns[0]?.id || '');
    lnkLabel.value    = link?.label || '';
    lnkUrl.value      = link?.url || '';
    lnkOrder.value    = link?.order != null ? link.order : 0;
    lnkExternal.checked = link ? !!link.isExternal : false;
    lnkActive.checked   = link ? !!link.isActive   : true;
    Modal.open('link-modal');
    setTimeout(() => lnkLabel.focus(), 80);
  }

  async function saveLink() {
    const payload = {
      columnId:   lnkCol.value,
      label:      lnkLabel.value.trim(),
      url:        lnkUrl.value.trim(),
      order:      lnkOrder.value === '' ? 0 : Number(lnkOrder.value),
      isExternal: lnkExternal.checked,
      isActive:   lnkActive.checked,
    };
    if (!payload.columnId) return Toast.error('Selecione uma coluna');
    if (!payload.label)    return Toast.error('Label é obrigatório');
    if (!payload.url)      return Toast.error('URL é obrigatória');

    Helpers.setButtonLoading(btnLnkSave, true);
    try {
      if (editingLinkId) {
        await API.put(`/footer-links/${editingLinkId}`, payload);
        Toast.success('Link atualizado');
      } else {
        await API.post('/footer-links', payload);
        Toast.success('Link criado');
      }
      Modal.close('link-modal');
      await loadAll();
    } catch (err) {
      Toast.error(err.message || 'Erro ao salvar link');
    } finally {
      Helpers.setButtonLoading(btnLnkSave, false);
    }
  }

  async function deleteLink(id, label) {
    const ok = await Helpers.confirmDialog(`Excluir o link "${label}"?`);
    if (!ok) return;
    try {
      await API.delete(`/footer-links/${id}`);
      Toast.success('Link excluído');
      await loadAll();
    } catch (err) {
      Toast.error(err.message || 'Erro ao excluir');
    }
  }

  // ─── Lookups locais (já temos `columns` em memória) ────────────────────────
  function findColumn(id) { return columns.find(c => c.id === id); }
  function findLink(id)   { for (const c of columns) for (const l of (c.links||[])) if (l.id === id) return l; }

  // ─── Bind ──────────────────────────────────────────────────────────────────
  btnNewCol?.addEventListener('click', () => openColumnModal());
  btnRefresh?.addEventListener('click', loadAll);
  btnColSave?.addEventListener('click', saveColumn);
  btnLnkSave?.addEventListener('click', saveLink);

  wrap.addEventListener('click', e => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const id = btn.dataset.id;
    switch (btn.dataset.act) {
      case 'add-link':   openLinkModal(null, id); break;
      case 'edit-col':   openColumnModal(findColumn(id)); break;
      case 'del-col':    deleteColumn(id, btn.dataset.title); break;
      case 'edit-link':  openLinkModal(findLink(id)); break;
      case 'del-link':   deleteLink(id, btn.dataset.label); break;
    }
  });

  loadAll();
})();

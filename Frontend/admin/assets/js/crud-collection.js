/* ============================================================
   FABIOARTS ADMIN — crud-collection.js
   Helper genérico para CRUDs de coleções simples (about-stats,
   mentorship-features, process-steps, cta-buttons, etc).
   Cada página define `window.__CRUD_CONFIG__ = { ... }` antes de
   carregar este script; aqui montamos handlers e ligamos no DOM.
   ============================================================ */

(function () {
  'use strict';

  if (typeof Auth === 'undefined' || !Auth.requireAuth()) return;

  const cfg = window.__CRUD_CONFIG__;
  if (!cfg) { console.warn('crud-collection: __CRUD_CONFIG__ ausente'); return; }

  /* cfg shape:
     endpoint:      '/about-stats'         (path da API)
     itemSingular:  'estatística'
     itemPlural:    'estatísticas'
     fields:        [{ name, label, type, required?, placeholder?, options?, hint? }]
     tableColumns:  [{ key, label, render?(item) -> string|html }]
     orderBy:       (optional) 'order'   — default
     defaults:      (optional) { isActive: true, order: 0 }
     // Para CTAButton com upsert por key:
     upsertMode:    (boolean) usa PUT / em vez de POST + PUT/:id; id é a `key`
  */

  const ENDPOINT     = cfg.endpoint;
  const SINGULAR     = cfg.itemSingular || 'item';
  const FIELDS       = cfg.fields;
  const TABLE_COLS   = cfg.tableColumns;
  const DEFAULTS     = cfg.defaults || {};
  const UPSERT       = !!cfg.upsertMode;
  const IDENT        = UPSERT ? 'key' : 'id';

  // ─── State ──────────────────────────────────────────────────────────────────
  let items = [];
  let editingId = null;
  let lastSearch = '';

  // ─── DOM ────────────────────────────────────────────────────────────────────
  const tbody       = document.getElementById('crud-tbody');
  const btnNew      = document.getElementById('btn-new');
  const btnRefresh  = document.getElementById('btn-refresh');
  const btnSave     = document.getElementById('btn-save');
  const modalEl     = document.getElementById('crud-modal');
  const modalTitle  = document.getElementById('modal-title');
  const modalBody   = document.getElementById('modal-body');
  const filterSearch = document.getElementById('filter-search');
  const filterActive = document.getElementById('filter-active');

  // ─── Helpers ────────────────────────────────────────────────────────────────
  function escHtml(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function fieldId(name) { return 'f-' + name; }
  function getFieldValue(field) {
    const el = document.getElementById(fieldId(field.name));
    if (!el) return undefined;
    if (field.type === 'checkbox') return el.checked;
    if (field.type === 'number')   return el.value === '' ? null : Number(el.value);
    const raw = el.value.trim();
    return raw === '' ? null : raw;
  }
  function setFieldValue(field, value) {
    const el = document.getElementById(fieldId(field.name));
    if (!el) return;
    if (field.type === 'checkbox') {
      el.checked = !!value;
    } else if (field.type === 'number') {
      el.value = value == null ? '' : String(value);
    } else {
      el.value = value == null ? '' : String(value);
    }
  }

  // ─── Render do form (modal) ─────────────────────────────────────────────────
  function buildFormHtml() {
    return FIELDS.map(f => {
      if (f.type === 'checkbox') {
        return `
          <div class="form-group">
            <label class="check-pill" style="cursor:pointer">
              <input type="checkbox" id="${fieldId(f.name)}"/> ${escHtml(f.label)}
            </label>
            ${f.hint ? `<div class="form-hint">${escHtml(f.hint)}</div>` : ''}
          </div>`;
      }
      if (f.type === 'select') {
        const opts = (f.options || []).map(o =>
          `<option value="${escHtml(o.value)}">${escHtml(o.label)}</option>`
        ).join('');
        return `
          <div class="form-group">
            <label class="form-label">${escHtml(f.label)}${f.required ? ' <span class="req">*</span>' : ''}</label>
            <select class="form-control" id="${fieldId(f.name)}">${opts}</select>
            ${f.hint ? `<div class="form-hint">${escHtml(f.hint)}</div>` : ''}
          </div>`;
      }
      if (f.type === 'textarea') {
        return `
          <div class="form-group">
            <label class="form-label">${escHtml(f.label)}${f.required ? ' <span class="req">*</span>' : ''}</label>
            <textarea class="form-control" id="${fieldId(f.name)}" rows="${f.rows || 3}" placeholder="${escHtml(f.placeholder || '')}"></textarea>
            ${f.hint ? `<div class="form-hint">${escHtml(f.hint)}</div>` : ''}
          </div>`;
      }
      // text / number / url
      const inputType = f.type === 'number' ? 'number' : (f.type === 'url' ? 'url' : 'text');
      const minAttr   = f.type === 'number' && f.min != null ? ` min="${f.min}"` : '';
      return `
        <div class="form-group">
          <label class="form-label">${escHtml(f.label)}${f.required ? ' <span class="req">*</span>' : ''}</label>
          <input type="${inputType}"${minAttr} class="form-control" id="${fieldId(f.name)}" placeholder="${escHtml(f.placeholder || '')}"/>
          ${f.hint ? `<div class="form-hint">${escHtml(f.hint)}</div>` : ''}
        </div>`;
    }).join('');
  }

  // ─── Render da tabela ───────────────────────────────────────────────────────
  function renderTable() {
    if (!items.length) {
      const colSpan = TABLE_COLS.length + 1; // + ações
      tbody.innerHTML = `
        <tr><td colspan="${colSpan}">
          <div class="state-block">
            <div class="state-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
            <div class="state-title">Nenhum ${SINGULAR} cadastrado</div>
            <div class="state-text">Clique em "Novo" para começar.</div>
          </div>
        </td></tr>`;
      return;
    }

    tbody.innerHTML = items.map(item => {
      const cells = TABLE_COLS.map(col => {
        if (col.render) return `<td>${col.render(item)}</td>`;
        return `<td>${escHtml(item[col.key] ?? '—')}</td>`;
      }).join('');
      const idAttr = encodeURIComponent(item[IDENT]);
      return `
        <tr>
          ${cells}
          <td>
            <div class="flex gap-1 justify-end">
              <button class="btn btn-ghost btn-icon" data-action="edit" data-id="${escHtml(idAttr)}" title="Editar" type="button">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="btn btn-ghost btn-icon" data-action="delete" data-id="${escHtml(idAttr)}" data-label="${escHtml(item.label || item.title || item.text || item[IDENT])}" title="Excluir" type="button" style="color:var(--red)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
              </button>
            </div>
          </td>
        </tr>`;
    }).join('');
  }

  // ─── Load ───────────────────────────────────────────────────────────────────
  async function loadList() {
    const colSpan = TABLE_COLS.length + 1;
    tbody.innerHTML = `<tr><td colspan="${colSpan}" class="table-empty">
      <span class="loader-ring"></span> &nbsp;Carregando...
    </td></tr>`;
    try {
      const params = new URLSearchParams();
      if (filterActive?.checked) params.set('isActive', 'true');
      const url = ENDPOINT + (params.toString() ? '?' + params.toString() : '');
      const res = await API.get(url);
      let list = res.data || [];
      if (lastSearch) {
        const q = lastSearch.toLowerCase();
        list = list.filter(it => JSON.stringify(it).toLowerCase().includes(q));
      }
      items = list;
      renderTable();
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="${colSpan}" class="table-empty text-muted">Erro: ${escHtml(err.message)}</td></tr>`;
    }
  }

  // ─── Modal ──────────────────────────────────────────────────────────────────
  function openModal(item) {
    editingId = item ? item[IDENT] : null;
    modalTitle.textContent = item ? `Editar ${SINGULAR}` : `Novo ${SINGULAR}`;
    modalBody.innerHTML = buildFormHtml();
    FIELDS.forEach(f => {
      const val = item ? item[f.name] : (DEFAULTS[f.name] !== undefined ? DEFAULTS[f.name] : (f.type === 'checkbox' ? false : ''));
      setFieldValue(f, val);
    });
    // Em modo upsert, desabilita edição do campo `key` quando editando
    if (UPSERT && editingId) {
      const keyEl = document.getElementById(fieldId('key'));
      if (keyEl) { keyEl.disabled = true; }
    }
    Modal.open('crud-modal');
    setTimeout(() => modalBody.querySelector('input,select,textarea')?.focus(), 80);
  }

  function buildPayload() {
    const payload = {};
    FIELDS.forEach(f => {
      const v = getFieldValue(f);
      if (v !== undefined) payload[f.name] = v;
    });
    return payload;
  }

  async function save() {
    const payload = buildPayload();
    // Required validation
    for (const f of FIELDS) {
      if (f.required) {
        const v = payload[f.name];
        if (v == null || v === '' || (typeof v === 'string' && !v.trim())) {
          return Toast.error(`${f.label} é obrigatório`);
        }
      }
    }

    Helpers.setButtonLoading(btnSave, true);
    try {
      if (UPSERT) {
        // PUT no endpoint base; o backend faz upsert por key
        await API.put(ENDPOINT, payload);
        Toast.success(editingId ? `${SINGULAR} atualizado` : `${SINGULAR} criado`);
      } else if (editingId) {
        await API.put(`${ENDPOINT}/${encodeURIComponent(editingId)}`, payload);
        Toast.success(`${SINGULAR} atualizado`);
      } else {
        await API.post(ENDPOINT, payload);
        Toast.success(`${SINGULAR} criado`);
      }
      Modal.close('crud-modal');
      await loadList();
    } catch (err) {
      Toast.error(err.message || 'Erro ao salvar');
    } finally {
      Helpers.setButtonLoading(btnSave, false);
    }
  }

  async function remove(id, label) {
    const ok = await Helpers.confirmDialog(`Excluir "${label}"?`);
    if (!ok) return;
    try {
      await API.delete(`${ENDPOINT}/${encodeURIComponent(id)}`);
      Toast.success(`${SINGULAR} excluído`);
      await loadList();
    } catch (err) {
      Toast.error(err.message || 'Erro ao excluir');
    }
  }

  async function startEdit(id) {
    try {
      // /:id ou /:key
      const res = await API.get(`${ENDPOINT}/${encodeURIComponent(id)}`);
      openModal(res.data);
    } catch (err) {
      Toast.error(err.message || `Erro ao carregar ${SINGULAR}`);
    }
  }

  // ─── Bind ───────────────────────────────────────────────────────────────────
  btnNew?.addEventListener('click', () => openModal());
  btnRefresh?.addEventListener('click', loadList);
  btnSave?.addEventListener('click', save);
  filterSearch?.addEventListener('input', Helpers.debounce(() => {
    lastSearch = filterSearch.value.trim();
    loadList();
  }, 250));
  filterActive?.addEventListener('change', loadList);

  tbody?.addEventListener('click', e => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const id = decodeURIComponent(btn.dataset.id);
    if (btn.dataset.action === 'edit')   startEdit(id);
    if (btn.dataset.action === 'delete') remove(id, btn.dataset.label);
  });

  // Expose para casos especiais (debug, refresh externo)
  window.CrudCollection = { loadList, openModal };

  loadList();
})();

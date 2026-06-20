// clients.js
// FABIOARTS.CO — Módulo Clientes
// Requer: admin.js carregado antes (para showToast, API_BASE, etc.)

(function () {
  'use strict';

  if (typeof Auth === 'undefined' || !Auth.requireAuth()) return;

  // ─── CONFIG ────────────────────────────────────────────────────────────────
  const ENDPOINT = '/clients';

  // ─── STATE ──────────────────────────────────────────────────────────────────
  let clients = [];
  let editingId = null;

  // ─── DOM REFS ────────────────────────────────────────────────────────────────
  const tableBody       = document.getElementById('clients-tbody');
  const emptyState      = document.getElementById('clients-empty');
  const loadingState    = document.getElementById('clients-loading');
  const totalCount      = document.getElementById('clients-total');
  const searchInput     = document.getElementById('clients-search');
  const btnNew          = document.getElementById('btn-new-client');

  // Modal Criar/Editar
  const modal           = document.getElementById('client-modal');
  const modalTitle      = document.getElementById('modal-title');
  const modalForm       = document.getElementById('client-form');
  const btnCloseModal   = document.querySelectorAll('[data-close-modal]');
  const btnSave         = document.getElementById('btn-save-client');
  const btnSaveText     = document.getElementById('btn-save-text');
  const btnSaveSpinner  = document.getElementById('btn-save-spinner');

  // Modal Confirmar Delete
  const deleteModal     = document.getElementById('delete-modal');
  const deleteClientName= document.getElementById('delete-client-name');
  const btnConfirmDel   = document.getElementById('btn-confirm-delete');
  const btnCancelDel    = document.getElementById('btn-cancel-delete');
  const btnCloseDelModal= document.querySelectorAll('[data-close-delete-modal]');

  // Form Fields
  const fieldName       = document.getElementById('field-name');
  const fieldCompany    = document.getElementById('field-company');
  const fieldInstagram  = document.getElementById('field-instagram');
  const fieldWebsite    = document.getElementById('field-website');
  const fieldTestimonial= document.getElementById('field-testimonial');
  const fieldLogo       = document.getElementById('field-logo');
  const fieldErrors     = document.querySelectorAll('.field-error');

  // ─── TOAST ──────────────────────────────────────────────────────────────────
  // Delega para Toast global do admin.js (mantém fallback para Toasts antigos)
  function toast(msg, type = 'success') {
    if (typeof Toast !== 'undefined') {
      const map = { success: 'success', error: 'error', info: 'info', warning: 'warning' };
      Toast.show(msg, map[type] || 'info');
      return;
    }
    if (typeof window.showToast === 'function') window.showToast(msg, type);
  }

  // ─── API (adapter para o cliente compartilhado) ────────────────────────────
  // Mantém assinatura legada apiFetch(path, {method, body}) → usa API.* do admin.js
  async function apiFetch(pathOrUrl, options = {}) {
    // Aceita URL absoluta antiga ou path "/clients/..." — normaliza para path
    const path = pathOrUrl.replace(/^https?:\/\/[^/]+\/api/, '');
    const method = (options.method || 'GET').toUpperCase();
    const body = options.body ? JSON.parse(options.body) : null;

    switch (method) {
      case 'GET':    return API.get(path);
      case 'POST':   return API.post(path, body);
      case 'PUT':    return API.put(path, body);
      case 'PATCH':  return API.patch(path, body);
      case 'DELETE': return API.delete(path);
      default:       throw new Error(`Método HTTP não suportado: ${method}`);
    }
  }

  // ─── LIST ────────────────────────────────────────────────────────────────────
  async function loadClients() {
    setTableLoading(true);
    try {
      const data = await apiFetch(ENDPOINT);
      clients = data.data || data;
      renderTable(clients);
    } catch (err) {
      toast(`Erro ao carregar clientes: ${err.message}`, 'error');
      renderTable([]);
    } finally {
      setTableLoading(false);
    }
  }

  function setTableLoading(on) {
    if (loadingState) loadingState.style.display = on ? 'flex' : 'none';
    if (tableBody)    tableBody.style.opacity    = on ? '0.4' : '1';
  }

  function renderTable(list) {
    if (!tableBody) return;
    tableBody.innerHTML = '';

    const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const filtered = query
      ? list.filter(c =>
          (c.name    || '').toLowerCase().includes(query) ||
          (c.company || '').toLowerCase().includes(query)
        )
      : list;

    if (totalCount) totalCount.textContent = filtered.length;

    if (!filtered.length) {
      if (emptyState) emptyState.style.display = 'flex';
      return;
    }
    if (emptyState) emptyState.style.display = 'none';

    filtered.forEach(client => {
      const tr = document.createElement('tr');
      tr.className = 'fa-table__row';
      tr.dataset.id = client.id;

      const logoHtml = client.logo
        ? `<img src="${escHtml(client.logo)}" alt="${escHtml(client.name)}" class="client-logo-thumb" onerror="this.style.display='none'">`
        : `<div class="client-logo-placeholder">${getInitials(client.name)}</div>`;

      const instagramHtml = client.instagram
        ? `<a href="https://instagram.com/${escHtml(client.instagram.replace('@',''))}" target="_blank" class="fa-link">@${escHtml(client.instagram.replace('@',''))}</a>`
        : '<span class="fa-muted">—</span>';

      const websiteHtml = client.website
        ? `<a href="${escHtml(client.website)}" target="_blank" class="fa-link">${escHtml(shortenUrl(client.website))}</a>`
        : '<span class="fa-muted">—</span>';

      tr.innerHTML = `
        <td class="td-logo">${logoHtml}</td>
        <td class="td-name">
          <span class="client-name">${escHtml(client.name)}</span>
          ${client.company ? `<span class="client-company">${escHtml(client.company)}</span>` : ''}
        </td>
        <td class="td-instagram">${instagramHtml}</td>
        <td class="td-website">${websiteHtml}</td>
        <td class="td-testimonial">
          ${client.testimonial
            ? `<span class="testimonial-preview" title="${escHtml(client.testimonial)}">${escHtml(truncate(client.testimonial, 60))}</span>`
            : '<span class="fa-muted">—</span>'}
        </td>
        <td class="td-actions">
          <button class="fa-btn fa-btn--icon fa-btn--ghost btn-edit" data-id="${client.id}" title="Editar">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
          </button>
          <button class="fa-btn fa-btn--icon fa-btn--ghost fa-btn--danger btn-delete" data-id="${client.id}" data-name="${escHtml(client.name)}" title="Excluir">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>
        </td>
      `;
      tableBody.appendChild(tr);
    });
  }

  // ─── MODAL CRIAR/EDITAR ─────────────────────────────────────────────────────
  function openModal(client = null) {
    editingId = client ? client.id : null;
    clearFormErrors();
    if (modalTitle) modalTitle.textContent = client ? 'Editar Cliente' : 'Novo Cliente';

    fieldName.value        = client ? (client.name        || '') : '';
    fieldCompany.value     = client ? (client.company     || '') : '';
    fieldInstagram.value   = client ? (client.instagram   || '') : '';
    fieldWebsite.value     = client ? (client.website     || '') : '';
    fieldTestimonial.value = client ? (client.testimonial || '') : '';
    fieldLogo.value        = client ? (client.logo        || '') : '';

    modal.classList.add('is-open');
    document.body.classList.add('modal-open');
    setTimeout(() => fieldName.focus(), 100);
  }

  function closeModal() {
    modal.classList.remove('is-open');
    document.body.classList.remove('modal-open');
    editingId = null;
    clearFormErrors();
  }

  function clearFormErrors() {
    fieldErrors.forEach(el => { el.textContent = ''; el.style.display = 'none'; });
    [fieldName, fieldCompany, fieldInstagram, fieldWebsite, fieldTestimonial, fieldLogo]
      .forEach(f => f && f.classList.remove('is-invalid'));
  }

  function showFieldError(field, message) {
    field.classList.add('is-invalid');
    const errEl = field.parentElement.querySelector('.field-error');
    if (errEl) { errEl.textContent = message; errEl.style.display = 'block'; }
  }

  function validateForm() {
    clearFormErrors();
    let valid = true;
    if (!fieldName.value.trim()) {
      showFieldError(fieldName, 'Nome é obrigatório.');
      valid = false;
    }
    return valid;
  }

  function setSaveLoading(on) {
    if (btnSaveText)    btnSaveText.style.display    = on ? 'none'  : 'inline';
    if (btnSaveSpinner) btnSaveSpinner.style.display = on ? 'inline': 'none';
    if (btnSave)        btnSave.disabled             = on;
  }

  async function saveClient() {
    if (!validateForm()) return;

    const payload = {
      name:        fieldName.value.trim(),
      company:     fieldCompany.value.trim()     || null,
      instagram:   fieldInstagram.value.trim()   || null,
      website:     fieldWebsite.value.trim()     || null,
      testimonial: fieldTestimonial.value.trim() || null,
      logo:        fieldLogo.value.trim()        || null,
    };

    setSaveLoading(true);
    try {
      if (editingId) {
        await apiFetch(`${ENDPOINT}/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) });
        toast('Cliente atualizado com sucesso!', 'success');
      } else {
        await apiFetch(ENDPOINT, { method: 'POST', body: JSON.stringify(payload) });
        toast('Cliente criado com sucesso!', 'success');
      }
      closeModal();
      await loadClients();
    } catch (err) {
      toast(`Erro: ${err.message}`, 'error');
    } finally {
      setSaveLoading(false);
    }
  }

  // ─── MODAL DELETE ────────────────────────────────────────────────────────────
  let pendingDeleteId = null;

  function openDeleteModal(id, name) {
    pendingDeleteId = id;
    if (deleteClientName) deleteClientName.textContent = name;
    deleteModal.classList.add('is-open');
    document.body.classList.add('modal-open');
  }

  function closeDeleteModal() {
    deleteModal.classList.remove('is-open');
    document.body.classList.remove('modal-open');
    pendingDeleteId = null;
  }

  async function confirmDelete() {
    if (!pendingDeleteId) return;
    btnConfirmDel.disabled = true;
    btnConfirmDel.textContent = 'Removendo...';
    try {
      await apiFetch(`${ENDPOINT}/${pendingDeleteId}`, { method: 'DELETE' });
      toast('Cliente removido com sucesso.', 'success');
      closeDeleteModal();
      await loadClients();
    } catch (err) {
      toast(`Erro: ${err.message}`, 'error');
    } finally {
      btnConfirmDel.disabled = false;
      btnConfirmDel.textContent = 'Sim, remover';
    }
  }

  // ─── UTILS ───────────────────────────────────────────────────────────────────
  function escHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function truncate(str, len) {
    if (!str) return '';
    return str.length > len ? str.slice(0, len) + '…' : str;
  }

  function shortenUrl(url) {
    return url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
  }

  function getInitials(name) {
    if (!name) return '?';
    return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  }

  // ─── EVENT LISTENERS ─────────────────────────────────────────────────────────
  if (btnNew) btnNew.addEventListener('click', () => openModal());

  if (btnSave) btnSave.addEventListener('click', saveClient);

  // Submit via Enter
  if (modalForm) {
    modalForm.addEventListener('keydown', e => {
      if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        saveClient();
      }
    });
  }

  // Fechar modais
  btnCloseModal.forEach(btn => btn.addEventListener('click', closeModal));
  btnCloseDelModal.forEach(btn => btn.addEventListener('click', closeDeleteModal));
  if (btnCancelDel) btnCancelDel.addEventListener('click', closeDeleteModal);
  if (btnConfirmDel) btnConfirmDel.addEventListener('click', confirmDelete);

  // Click fora do modal fecha
  if (modal) modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
  if (deleteModal) deleteModal.addEventListener('click', e => { if (e.target === deleteModal) closeDeleteModal(); });

  // ESC fecha
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (modal && modal.classList.contains('is-open')) closeModal();
      if (deleteModal && deleteModal.classList.contains('is-open')) closeDeleteModal();
    }
  });

  // Delegação — editar / deletar na tabela
  if (tableBody) {
    tableBody.addEventListener('click', async e => {
      const editBtn   = e.target.closest('.btn-edit');
      const deleteBtn = e.target.closest('.btn-delete');

      if (editBtn) {
        const id = editBtn.dataset.id;
        try {
          const data = await apiFetch(`${ENDPOINT}/${id}`);
          openModal(data.data || data);
        } catch (err) {
          toast(`Erro ao carregar cliente: ${err.message}`, 'error');
        }
      }

      if (deleteBtn) {
        openDeleteModal(deleteBtn.dataset.id, deleteBtn.dataset.name);
      }
    });
  }

  // Busca em tempo real
  if (searchInput) {
    searchInput.addEventListener('input', () => renderTable(clients));
  }

  // ─── INIT ────────────────────────────────────────────────────────────────────
  loadClients();

})();
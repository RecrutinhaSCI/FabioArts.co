/* ============================================================
   FABIOARTS ADMIN — admin.js
   Utilitários globais: auth, sidebar, topbar, toast, api
   ============================================================ */

'use strict';

// ─── CONFIG ──────────────────────────────────────────────────────────────────

const CONFIG = {
  API_BASE: (typeof window !== 'undefined' && window.__FA_API_BASE__) || 'http://localhost:3333/api',
  TOKEN_KEY: 'fabioarts_access_token',
  REFRESH_KEY: 'fabioarts_refresh_token',
  USER_KEY: 'fabioarts_user',
};

// ─── TOKEN STORAGE ────────────────────────────────────────────────────────────

const Auth = {
  // "Lembrar acesso": marcado → localStorage (persiste ao fechar o navegador);
  // desmarcado → sessionStorage (termina com a sessão do navegador).
  _get(key) {
    return sessionStorage.getItem(key) || localStorage.getItem(key);
  },
  _store() {
    return sessionStorage.getItem(CONFIG.TOKEN_KEY) ? sessionStorage : localStorage;
  },
  getToken() {
    return this._get(CONFIG.TOKEN_KEY);
  },
  getRefreshToken() {
    return this._get(CONFIG.REFRESH_KEY);
  },
  getUser() {
    try {
      return JSON.parse(this._get(CONFIG.USER_KEY) || 'null');
    } catch {
      return null;
    }
  },
  setSession(data, remember = true) {
    this.clearSession();
    const store = remember ? localStorage : sessionStorage;
    store.setItem(CONFIG.TOKEN_KEY, data.accessToken);
    store.setItem(CONFIG.REFRESH_KEY, data.refreshToken);
    store.setItem(CONFIG.USER_KEY, JSON.stringify(data.user));
  },
  updateTokens(accessToken, refreshToken) {
    const store = this._store();
    store.setItem(CONFIG.TOKEN_KEY, accessToken);
    store.setItem(CONFIG.REFRESH_KEY, refreshToken);
  },
  clearSession() {
    [localStorage, sessionStorage].forEach(st => {
      st.removeItem(CONFIG.TOKEN_KEY);
      st.removeItem(CONFIG.REFRESH_KEY);
      st.removeItem(CONFIG.USER_KEY);
    });
  },
  isAuthenticated() {
    return !!this.getToken();
  },
  requireAuth() {
    if (!this.isAuthenticated()) {
      window.location.href = 'login.html';
      return false;
    }
    return true;
  },
};

// ─── API CLIENT ───────────────────────────────────────────────────────────────

const API = {
  async request(method, endpoint, body = null, isFormData = false) {
    const token = Auth.getToken();
    const headers = { Authorization: `Bearer ${token}` };
    if (!isFormData) headers['Content-Type'] = 'application/json';

    const options = { method, headers };
    if (body) options.body = isFormData ? body : JSON.stringify(body);

    let res = await fetch(`${CONFIG.API_BASE}${endpoint}`, options);

    // Tenta renovar token se expirado
    if (res.status === 401 && Auth.getRefreshToken()) {
      const renewed = await this.refreshToken();
      if (renewed) {
        headers.Authorization = `Bearer ${Auth.getToken()}`;
        res = await fetch(`${CONFIG.API_BASE}${endpoint}`, { ...options, headers });
      } else {
        Auth.clearSession();
        window.location.href = 'login.html';
        return null;
      }
    }

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new APIError(data.message || 'Erro na requisição', res.status, data.errors);
    }

    return data;
  },

  async refreshToken() {
    try {
      const res = await fetch(`${CONFIG.API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: Auth.getRefreshToken() }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      Auth.updateTokens(data.data.accessToken, data.data.refreshToken);
      return true;
    } catch {
      return false;
    }
  },

  get(endpoint)          { return this.request('GET',    endpoint); },
  post(endpoint, body)   { return this.request('POST',   endpoint, body); },
  put(endpoint, body)    { return this.request('PUT',    endpoint, body); },
  patch(endpoint, body)  { return this.request('PATCH',  endpoint, body); },
  delete(endpoint)       { return this.request('DELETE', endpoint); },
  upload(endpoint, form) { return this.request('POST',   endpoint, form, true); },
  uploadPut(endpoint, form) { return this.request('PUT', endpoint, form, true); },
};

class APIError extends Error {
  constructor(message, status, errors) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

// ─── TOAST ────────────────────────────────────────────────────────────────────

const Toast = {
  container: null,

  init() {
    this.container = document.getElementById('toast-container');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'toast-container';
      this.container.id = 'toast-container';
      document.body.appendChild(this.container);
    }
  },

  show(message, type = 'info', duration = 3500) {
    const icons = {
      success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
      error:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
      warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
      info:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || icons.info}</span>
      <span>${message}</span>
    `;

    this.container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('removing');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  success(msg, d) { this.show(msg, 'success', d); },
  error(msg, d)   { this.show(msg, 'error',   d); },
  warning(msg, d) { this.show(msg, 'warning', d); },
  info(msg, d)    { this.show(msg, 'info',    d); },
};

// ─── MODAL ────────────────────────────────────────────────────────────────────

const Modal = {
  open(id) {
    const el = document.getElementById(id);
    if (el) {
      el.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
  },
  close(id) {
    const el = document.getElementById(id);
    if (el) {
      el.classList.remove('open');
      document.body.style.overflow = '';
    }
  },
  closeAll() {
    document.querySelectorAll('.modal-overlay.open').forEach(el => {
      el.classList.remove('open');
    });
    document.body.style.overflow = '';
  },
};

// Fecha modal ao clicar no overlay
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) Modal.closeAll();
});

// Fecha modal ao clicar no X
document.addEventListener('click', e => {
  const closeBtn = e.target.closest('[data-modal-close]');
  if (closeBtn) {
    const target = closeBtn.dataset.modalClose;
    target ? Modal.close(target) : Modal.closeAll();
  }
});

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────

const Sidebar = {
  sidebar: null,
  overlay: null,
  toggleBtn: null,
  isCollapsed: false,
  isMobileOpen: false,

  init() {
    this.sidebar   = document.getElementById('sidebar');
    this.overlay   = document.getElementById('sidebar-overlay');
    this.toggleBtn = document.getElementById('sidebar-toggle');
    const menuBtn  = document.getElementById('topbar-menu-btn');

    if (!this.sidebar) return;

    // Restaura estado colapsado
    this.isCollapsed = localStorage.getItem('sidebar_collapsed') === 'true';
    if (this.isCollapsed) this.sidebar.classList.add('collapsed');

    this.toggleBtn?.addEventListener('click', () => this.toggle());
    menuBtn?.addEventListener('click', () => this.toggleMobile());
    this.overlay?.addEventListener('click', () => this.closeMobile());

    // Marca nav item ativo
    this.setActiveNav();
  },

  toggle() {
    this.isCollapsed = !this.isCollapsed;
    this.sidebar.classList.toggle('collapsed', this.isCollapsed);
    localStorage.setItem('sidebar_collapsed', this.isCollapsed);
  },

  toggleMobile() {
    this.isMobileOpen = !this.isMobileOpen;
    this.sidebar.classList.toggle('mobile-open', this.isMobileOpen);
    this.overlay?.classList.toggle('visible', this.isMobileOpen);
  },

  closeMobile() {
    this.isMobileOpen = false;
    this.sidebar.classList.remove('mobile-open');
    this.overlay?.classList.remove('visible');
  },

  setActiveNav() {
    const currentPage = window.location.pathname.split('/').pop() || 'dashboard.html';
    document.querySelectorAll('.nav-item').forEach(item => {
      const href = item.getAttribute('href') || '';
      if (href && currentPage.includes(href.replace('.html', ''))) {
        item.classList.add('active');
      }
    });
  },
};

// ─── TOPBAR ───────────────────────────────────────────────────────────────────

const Topbar = {
  init() {
    this.renderUserInfo();
    this.startClock();
    this.bindLogout();
  },

  renderUserInfo() {
    const user = Auth.getUser();
    if (!user) return;

    const initials = user.name
      ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
      : 'FA';

    // Topbar
    const nameEl  = document.getElementById('topbar-user-name');
    const roleEl  = document.getElementById('topbar-user-role');
    const avatarEl = document.getElementById('topbar-avatar');

    if (nameEl)  nameEl.textContent  = user.name  || 'Admin';
    if (roleEl)  roleEl.textContent  = user.role  || 'ADMIN';
    if (avatarEl) {
      if (user.avatar) {
        avatarEl.innerHTML = `<img src="${user.avatar}" alt="${user.name}">`;
      } else {
        avatarEl.textContent = initials;
      }
    }

    // Sidebar
    const sNameEl   = document.getElementById('sidebar-user-name');
    const sRoleEl   = document.getElementById('sidebar-user-role');
    const sAvatarEl = document.getElementById('sidebar-avatar');

    if (sNameEl)   sNameEl.textContent   = user.name || 'Admin';
    if (sRoleEl)   sRoleEl.textContent   = user.role || 'ADMIN';
    if (sAvatarEl) {
      if (user.avatar) {
        sAvatarEl.innerHTML = `<img src="${user.avatar}" alt="${user.name}">`;
      } else {
        sAvatarEl.textContent = initials;
      }
    }
  },

  startClock() {
    const el = document.getElementById('topbar-clock');
    if (!el) return;

    const update = () => {
      const now = new Date();
      const time = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const date = now.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
      el.textContent = `${date} · ${time}`;
    };

    update();
    setInterval(update, 1000);
  },

  bindLogout() {
    document.querySelectorAll('[data-action="logout"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        try {
          await API.post('/auth/logout', { refreshToken: Auth.getRefreshToken() });
        } catch {}
        Auth.clearSession();
        window.location.href = 'login.html';
      });
    });
  },
};

// ─── CATÁLOGO (fonte única do painel) ────────────────────────────────────────
// Espelha Backend/src/constants/catalog.ts — o teste tests/unit.test.ts garante
// que as listas são iguais. Nenhuma página deve ter lista própria de categorias.

const Catalog = {
  categories: [
    { code: 'AUTOMOTIVE', label: 'Design Automotivo' },
    { code: 'TSHIRT', label: 'Camiseta' },
    { code: 'STICKER', label: 'Adesivo' },
    { code: 'BRANDING', label: 'Identidade Visual' },
    { code: 'COMBO', label: 'Combos' },
    { code: 'OTHER', label: 'Outros' },
  ],
  // Só para exibir registros antigos — nunca oferecidas em novos cadastros
  legacyCategories: [
    { code: 'SOCIAL_MEDIA', label: 'Social Media' },
    { code: 'LOGO', label: 'Logo' },
    { code: 'PACKAGING', label: 'Embalagem' },
    { code: 'ILLUSTRATION', label: 'Ilustração' },
  ],
  workStatuses: [
    { code: 'NOT_STARTED', label: 'Não iniciado' },
    { code: 'IN_PROGRESS', label: 'Em andamento' },
    { code: 'COMPLETED', label: 'Concluído' },
    { code: 'CANCELLED', label: 'Cancelado' },
  ],
  financialStatuses: [
    { code: 'PENDING', label: 'Pendente' },
    { code: 'PARTIAL', label: 'Parcialmente pago' },
    { code: 'PAID', label: 'Pago' },
  ],
  paymentMethods: [
    { code: 'PIX', label: 'Pix' },
    { code: 'CARTAO', label: 'Cartão' },
    { code: 'BOLETO', label: 'Boleto' },
  ],

  WORK_BADGE: { NOT_STARTED: 'badge-grey', IN_PROGRESS: 'badge-blue', COMPLETED: 'badge-green', CANCELLED: 'badge-red' },
  FIN_BADGE:  { PENDING: 'badge-yellow', PARTIAL: 'badge-blue', PAID: 'badge-green', CANCELLED: 'badge-grey' },

  // Textos antigos de Orçamento (formulário do site antes da padronização)
  LEGACY_QUOTE_TYPES: {
    'Design Automotivo': 'AUTOMOTIVE', 'Camiseta / Streetwear': 'TSHIRT', 'Adesivos': 'STICKER',
    'Identidade Visual': 'BRANDING', 'Outro': 'OTHER',
  },

  _label(list, code) {
    const item = list.find(x => x.code === code);
    return item ? item.label : (code || '—');
  },
  categoryLabel(code) {
    return this._label([...this.categories, ...this.legacyCategories], code);
  },
  /** Código de categoria a partir de um projectType de orçamento (código ou texto antigo). */
  quoteTypeCode(value) {
    if (!value) return '';
    if ([...this.categories, ...this.legacyCategories].some(c => c.code === value)) return value;
    return this.LEGACY_QUOTE_TYPES[value] || '';
  },
  quoteTypeLabel(value) {
    const code = this.quoteTypeCode(value);
    return code ? this.categoryLabel(code) : (value || '—');
  },
  workStatusLabel(code)      { return code === 'CANCELLED' ? 'Cancelado' : this._label(this.workStatuses, code); },
  financialStatusLabel(code) { return code === 'CANCELLED' ? 'Cancelado' : this._label(this.financialStatuses, code); },
  paymentLabel(code) {
    if (!code) return '—';
    const m = this.paymentMethods.find(x => x.code === String(code).toUpperCase());
    return m ? m.label : code;
  },
  workStatusBadge(code) {
    return `<span class="badge ${this.WORK_BADGE[code] || 'badge-grey'}"><span class="badge-dot"></span>${this.workStatusLabel(code)}</span>`;
  },
  financialStatusBadge(code) {
    if (!code) return '<span class="text-muted">—</span>';
    return `<span class="badge ${this.FIN_BADGE[code] || 'badge-grey'}"><span class="badge-dot"></span>${this.financialStatusLabel(code)}</span>`;
  },

  /**
   * <option>s de um select a partir de uma lista do catálogo.
   * Se `current` for um código legado (ex.: SOCIAL_MEDIA num projeto antigo),
   * ele aparece como opção extra só para não perder o valor na edição.
   */
  options(list, current, { placeholder, legacy } = {}) {
    const esc = v => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
    const opts = list.map(x => `<option value="${esc(x.code)}"${x.code === current ? ' selected' : ''}>${esc(x.label)}</option>`);
    if (current && !list.some(x => x.code === current)) {
      const label = legacy ? legacy(current) : current;
      opts.push(`<option value="${esc(current)}" selected>${esc(label)} (antigo)</option>`);
    }
    if (placeholder) opts.unshift(`<option value="">${esc(placeholder)}</option>`);
    return opts.join('');
  },
  categoryOptions(current, placeholder = 'Selecione...') {
    return this.options(this.categories, current, { placeholder, legacy: c => this.categoryLabel(c) });
  },
};

// ─── DATAS SEM HORA ("YYYY-MM-DD") ───────────────────────────────────────────
// Datas de entrega são só dia: formatar sem passar por Date evita o bug de
// "voltar um dia" no fuso do Brasil.

const DateOnly = {
  today() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  },
  of(value) {
    if (!value) return '';
    const s = String(value);
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    // coluna DATE serializada (meia-noite UTC) → o próprio dia, sem converter fuso
    const midnight = s.match(/^(\d{4}-\d{2}-\d{2})T00:00:00(?:\.0+)?Z$/);
    if (midnight) return midnight[1];
    // timestamp gravado ao meio-dia UTC (ou ISO) → dia local
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  },
  format(value, short = false) {
    const iso = this.of(value);
    if (!iso) return '—';
    const [y, m, d] = iso.split('-');
    return short ? `${d}/${m}` : `${d}/${m}/${y}`;
  },
  diffDays(iso, from = this.today()) {
    const a = Date.UTC(...from.split('-').map((n, i) => i === 1 ? n - 1 : +n));
    const b = Date.UTC(...iso.split('-').map((n, i) => i === 1 ? n - 1 : +n));
    return Math.round((b - a) / 86400000);
  },
  /** Situação da entrega: atrasada só se o trabalho ainda está em aberto. */
  delivery(deliveryDate, workStatus) {
    const iso = this.of(deliveryDate);
    if (!iso) return { state: 'none', text: 'Sem data de entrega' };
    const open = workStatus === 'NOT_STARTED' || workStatus === 'IN_PROGRESS';
    const diff = this.diffDays(iso);
    const date = this.format(iso);
    if (!open) return { state: 'closed', text: `Entrega: ${date}` };
    if (diff < 0)  return { state: 'late',  text: `Entrega atrasada — prevista para ${date}` };
    if (diff === 0) return { state: 'today', text: `Entrega hoje — ${date}` };
    return { state: 'ok', text: `Entrega prevista: ${date}` };
  },
};

// ─── MODO PRIVACIDADE (ocultar valores) ──────────────────────────────────────
// Recurso de APRESENTAÇÃO (Stories, gravações, demos): esconde valores
// monetários na interface. Não altera API nem banco.
//
// Uso nas páginas:
//   Privacy.html(850)               → <span class="money" data-mid="7">R$ 850,00</span>
//   Privacy.html('R$ 1,00', true)   → texto livre (ex.: estimatedBudget)
//   Privacy.text(850)               → string pura (tooltips de gráfico etc.)
// O valor real fica só na memória (Map), nunca em atributo do HTML; com o
// modo ativo o DOM recebe apenas "R$ ****". Inputs monetários marcados com
// data-money-input viram type=password enquanto o modo estiver ativo.
// Preferência salva no localStorage (por navegador) e sincronizada entre abas.

const Privacy = {
  KEY:  'fabioarts_privacy_mode',
  MASK: 'R$ ****',
  _values: new Map(),
  _seq: 0,

  isOn() {
    try { return localStorage.getItem(this.KEY) === '1'; } catch { return !!this._memory; }
  },

  set(on) {
    try { localStorage.setItem(this.KEY, on ? '1' : '0'); } catch { /* sem storage: vale só nesta página */ this._memory = on; }
    this.apply();
    document.dispatchEvent(new CustomEvent('privacychange', { detail: { on: !!on } }));
  },

  toggle() { this.set(!this.isOn()); },

  /** Formata número em BRL (sem considerar o modo). */
  formatBRL(value) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0);
  },

  /** Texto já respeitando o modo — para tooltips, legendas e eixos. */
  text(value, isRawText = false) {
    if (this.isOn()) return this.MASK;
    return isRawText ? String(value ?? '') : this.formatBRL(value);
  },

  /** Span atualizável ao alternar o modo. Não coloca o valor real em atributos. */
  html(value, isRawText = false) {
    const id = ++this._seq;
    const real = isRawText ? String(value ?? '') : this.formatBRL(value);
    this._values.set(String(id), real);
    const shown = this.isOn() ? this.MASK : real;
    const esc = String(shown).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `<span class="money" data-mid="${id}">${esc}</span>`;
  },

  /** Reaplica o modo em toda a página (spans, inputs e botão da topbar). */
  apply() {
    const on = this.isOn();
    document.documentElement.classList.toggle('privacy-on', on);
    document.querySelectorAll('.money[data-mid]').forEach(el => {
      const real = this._values.get(el.dataset.mid);
      if (real !== undefined) el.textContent = on ? this.MASK : real;
    });
    document.querySelectorAll('input[data-money-input]').forEach(inp => {
      if (!inp.dataset.moneyType) inp.dataset.moneyType = inp.type || 'text';
      inp.type = on ? 'password' : inp.dataset.moneyType;
    });
    document.querySelectorAll('[data-action="toggle-privacy"]').forEach(btn => {
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      btn.title = on ? 'Mostrar valores' : 'Ocultar valores';
      btn.setAttribute('aria-label', btn.title);
      const lbl = btn.querySelector('.privacy-label');
      if (lbl) lbl.textContent = btn.title;
    });
  },
};

// Botão da topbar (layout.js) e sincronização entre abas abertas
document.addEventListener('click', e => {
  if (e.target.closest('[data-action="toggle-privacy"]')) Privacy.toggle();
});
window.addEventListener('storage', e => {
  if (e.key === Privacy.KEY) {
    Privacy.apply();
    document.dispatchEvent(new CustomEvent('privacychange', { detail: { on: Privacy.isOn() } }));
  }
});
// Inputs/elementos que aparecem depois (modais) também respeitam o modo
document.addEventListener('DOMContentLoaded', () => Privacy.apply());

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const Helpers = {
  // Respeita o Modo Privacidade. Para HTML que precisa atualizar ao alternar
  // o modo, prefira Privacy.html(value).
  formatCurrency(value) {
    return Privacy.text(value || 0);
  },

  formatDate(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  },

  formatDateRelative(dateStr) {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    const now  = new Date();
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60)     return 'agora';
    if (diff < 3600)   return `${Math.floor(diff / 60)}min atrás`;
    if (diff < 86400)  return `${Math.floor(diff / 3600)}h atrás`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d atrás`;
    return this.formatDate(dateStr);
  },

  truncate(str, n = 60) {
    if (!str) return '—';
    return str.length > n ? str.slice(0, n) + '...' : str;
  },

  initials(name) {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  },

  // Acompanhamento do orçamento (negociação) — não é status financeiro.
  QUOTE_STATUS: {
    PENDING:   { cls: 'badge-yellow', label: 'Novo'       },
    REPLIED:   { cls: 'badge-blue',   label: 'Respondido' },
    CLOSED:    { cls: 'badge-green',  label: 'Fechado'    },
    CANCELLED: { cls: 'badge-grey',   label: 'Cancelado'  },
  },

  quoteStatusBadge(status) {
    const s = this.QUOTE_STATUS[status] || { cls: 'badge-grey', label: status };
    return `<span class="badge ${s.cls}"><span class="badge-dot"></span>${s.label}</span>`;
  },

  categoryLabel(cat) {
    return Catalog.categoryLabel(cat);
  },

  showPageLoader() {
    const el = document.getElementById('page-loader');
    if (el) el.classList.remove('hide');
  },

  hidePageLoader() {
    const el = document.getElementById('page-loader');
    if (el) el.classList.add('hide');
    setTimeout(() => el?.remove(), 500);
  },

  debounce(fn, delay = 400) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), delay);
    };
  },

  confirmDialog(message = 'Tem certeza?') {
    return new Promise(resolve => {
      const overlay = document.getElementById('confirm-modal');
      if (!overlay) {
        resolve(window.confirm(message));
        return;
      }
      document.getElementById('confirm-message').textContent = message;
      Modal.open('confirm-modal');

      const onConfirm = () => {
        Modal.close('confirm-modal');
        cleanup();
        resolve(true);
      };
      const onCancel = () => {
        Modal.close('confirm-modal');
        cleanup();
        resolve(false);
      };
      const cleanup = () => {
        document.getElementById('confirm-ok')?.removeEventListener('click', onConfirm);
        document.getElementById('confirm-cancel')?.removeEventListener('click', onCancel);
      };

      document.getElementById('confirm-ok')?.addEventListener('click', onConfirm);
      document.getElementById('confirm-cancel')?.addEventListener('click', onCancel);
    });
  },

  setButtonLoading(btn, loading) {
    if (!btn) return;
    if (loading) {
      btn.dataset.originalText = btn.innerHTML;
      btn.innerHTML = `<span class="loader-ring" style="width:16px;height:16px;border-width:2px;"></span> Aguarde...`;
      btn.disabled = true;
    } else {
      btn.innerHTML = btn.dataset.originalText || btn.innerHTML;
      btn.disabled  = false;
    }
  },
};

// ─── INIT ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  Toast.init();
  Sidebar.init();
  Topbar.init();
  Helpers.hidePageLoader();
});

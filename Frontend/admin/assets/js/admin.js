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
  getToken() {
    return localStorage.getItem(CONFIG.TOKEN_KEY);
  },
  getRefreshToken() {
    return localStorage.getItem(CONFIG.REFRESH_KEY);
  },
  getUser() {
    try {
      return JSON.parse(localStorage.getItem(CONFIG.USER_KEY) || 'null');
    } catch {
      return null;
    }
  },
  setSession(data) {
    localStorage.setItem(CONFIG.TOKEN_KEY, data.accessToken);
    localStorage.setItem(CONFIG.REFRESH_KEY, data.refreshToken);
    localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(data.user));
  },
  clearSession() {
    localStorage.removeItem(CONFIG.TOKEN_KEY);
    localStorage.removeItem(CONFIG.REFRESH_KEY);
    localStorage.removeItem(CONFIG.USER_KEY);
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
      localStorage.setItem(CONFIG.TOKEN_KEY, data.data.accessToken);
      localStorage.setItem(CONFIG.REFRESH_KEY, data.data.refreshToken);
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

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const Helpers = {
  formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value || 0);
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

  quoteStatusBadge(status) {
    const map = {
      PENDING:   { cls: 'badge-yellow', label: 'Pendente'    },
      REPLIED:   { cls: 'badge-blue',   label: 'Respondido'  },
      CLOSED:    { cls: 'badge-green',  label: 'Fechado'     },
      CANCELLED: { cls: 'badge-grey',   label: 'Cancelado'   },
    };
    const s = map[status] || { cls: 'badge-grey', label: status };
    return `<span class="badge ${s.cls}"><span class="badge-dot"></span>${s.label}</span>`;
  },

  categoryLabel(cat) {
    const map = {
      AUTOMOTIVE:   'Automotivo',
      TSHIRT:       'Camiseta',
      STICKER:      'Adesivo',
      BRANDING:     'Branding',
      SOCIAL_MEDIA: 'Social Media',
      LOGO:         'Logo',
      PACKAGING:    'Embalagem',
      ILLUSTRATION: 'Ilustração',
      OTHER:        'Outro',
    };
    return map[cat] || cat;
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

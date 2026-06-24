/* ============================================================
   FABIOARTS ADMIN — layout.js  (shell único)
   Preenche sidebar + topbar (com dropdowns) em páginas com
   placeholders vazios. Carregar ANTES de admin.js.
   ============================================================ */

(function () {
  'use strict';

  // ─── NAV ────────────────────────────────────────────────────────────────────
  const NAV = [
    { section: 'Principal' },
    { href: 'dashboard.html',   label: 'Dashboard',     icon: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z' },
    { href: 'clients.html',     label: 'Clientes',      icon: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8z' },
    { href: 'projects.html',    label: 'Projetos',      icon: 'M3 3h18v18H3zM3 15l5-5 13 13' },
    { href: 'orcamentos.html',  label: 'Orçamentos',    icon: 'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z' },
    { section: 'Financeiro' },
    { href: 'finances.html',    label: 'Financeiro',    icon: 'M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6' },
    { section: 'Conteúdo do site' },
    { href: 'about-stats.html',          label: 'Sobre',     icon: 'M21 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75M7 21v-2a4 4 0 014-4h2a4 4 0 014 4v2M12 11a4 4 0 100-8 4 4 0 000 8z' },
    { href: 'mentorship-features.html',  label: 'Mentoria',  icon: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8z' },
    { href: 'courses.html',              label: 'Cursos',    icon: 'M2 3h20v14H2zM2 21h20M8 17v4M16 17v4' },
    { href: 'process-steps.html',        label: 'Processo',  icon: 'M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3' },
    { href: 'footer-links.html',         label: 'Footer',    icon: 'M3 3h18v18H3zM3 16h18' },
    { href: 'cta-buttons.html',          label: 'CTAs',      icon: 'M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11' },
    { section: 'Sistema' },
    { href: 'services.html',    label: 'Serviços',      icon: 'M12 9a3 3 0 100 6 3 3 0 000-6zM19 5a10 10 0 010 14M5 5a10 10 0 000 14' },
    { href: 'settings.html',    label: 'Configurações', icon: 'M12 9a3 3 0 100 6 3 3 0 000-6z' },
  ];

  function currentFile() {
    return (location.pathname.split('/').pop() || 'dashboard.html').toLowerCase();
  }
  function pageTitle() {
    const titles = {
      'dashboard.html':            'Dashboard',
      'clients.html':              'Clientes',
      'projects.html':             'Projetos',
      'orcamentos.html':           'Orçamentos',
      'services.html':             'Serviços',
      'finances.html':             'Financeiro',
      'settings.html':             'Configurações',
      'about-stats.html':          'Sobre',
      'mentorship-features.html':  'Mentoria',
      'courses.html':              'Cursos',
      'process-steps.html':        'Processo',
      'footer-links.html':         'Footer',
      'cta-buttons.html':          'CTAs',
    };
    return titles[currentFile()] || 'Admin';
  }

  // ─── SIDEBAR ────────────────────────────────────────────────────────────────
  function renderSidebar() {
    const el = document.getElementById('sidebar');
    if (!el || el.children.length) return; // já preenchido manualmente
    const cur = currentFile();

    const navHtml = NAV.map(item => {
      if (item.section) return `<div class="nav-section-label">${item.section}</div>`;
      const active = cur === item.href.toLowerCase() ? ' active' : '';
      return `<a href="${item.href}" class="nav-item${active}">
        <span class="nav-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="${item.icon}"/>
          </svg>
        </span>
        <span class="nav-label">${item.label}</span>
      </a>`;
    }).join('');

    el.innerHTML = `
      <div class="sidebar-logo">
        <div class="sidebar-logo-mark">FA</div>
        <div class="sidebar-logo-text">FabioArts<span class="sidebar-logo-sub">Admin Panel</span></div>
      </div>
      <button class="sidebar-toggle" id="sidebar-toggle" title="Recolher sidebar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <nav class="sidebar-nav">${navHtml}</nav>
      <div class="sidebar-footer">
        <div class="sidebar-user">
          <div class="sidebar-avatar" id="sidebar-avatar">FA</div>
          <div class="sidebar-user-info">
            <div class="sidebar-user-name" id="sidebar-user-name">Carregando...</div>
            <div class="sidebar-user-role" id="sidebar-user-role">Admin</div>
          </div>
        </div>
        <button class="nav-item" style="width:100%;text-align:left;" data-action="logout">
          <span class="nav-icon" style="color:var(--red)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
              <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </span>
          <span class="nav-label" style="color:var(--red)">Sair</span>
        </button>
      </div>`;
  }

  // ─── TOPBAR ─────────────────────────────────────────────────────────────────
  function renderTopbar() {
    const el = document.getElementById('topbar');
    if (!el || el.children.length) return;
    const title = pageTitle();
    el.innerHTML = `
      <div class="topbar-left">
        <button class="topbar-btn topbar-menu-btn" id="topbar-menu-btn" aria-label="Abrir menu">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="6"  x2="21" y2="6"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
        <div>
          <div class="topbar-page-title">${title}</div>
          <div class="topbar-breadcrumb">
            <span>FabioArts</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
            ${title}
          </div>
        </div>
      </div>
      <div class="topbar-right">
        <div class="topbar-clock" id="topbar-clock"></div>

        <!-- Notificações -->
        <div class="topbar-dropdown-wrap">
          <button class="topbar-btn" id="notif-btn" title="Notificações" aria-haspopup="true" aria-expanded="false">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 01-3.46 0"/>
            </svg>
            <span class="topbar-notif-dot" id="notif-dot" style="display:none"></span>
          </button>
          <div class="topbar-dropdown" id="notif-dropdown" role="menu">
            <div class="topbar-dropdown-header">
              Notificações
              <span class="topbar-dropdown-sub" id="notif-count">0 pendentes</span>
            </div>
            <div class="topbar-dropdown-body" id="notif-body">
              <div class="topbar-dropdown-empty">Carregando...</div>
            </div>
            <a href="orcamentos.html" class="topbar-dropdown-footer">Ver todos os orçamentos →</a>
          </div>
        </div>

        <div class="topbar-divider"></div>

        <!-- Perfil -->
        <div class="topbar-dropdown-wrap">
          <button class="topbar-user-btn" id="profile-btn" aria-haspopup="true" aria-expanded="false">
            <div class="topbar-avatar" id="topbar-avatar">FA</div>
            <div class="topbar-user-text">
              <div class="topbar-user-name" id="topbar-user-name">Carregando...</div>
              <div class="topbar-user-role" id="topbar-user-role">Admin</div>
            </div>
            <svg class="topbar-user-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <div class="topbar-dropdown profile-dropdown" id="profile-dropdown" role="menu">
            <div class="profile-info">
              <div class="profile-avatar" id="profile-avatar">FA</div>
              <div>
                <div class="profile-name" id="profile-name">—</div>
                <div class="profile-email" id="profile-email">—</div>
              </div>
            </div>
            <div class="topbar-dropdown-sep"></div>
            <button class="profile-item" data-action="open-profile">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              Minha conta
            </button>
            <a href="settings.html" class="profile-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
              Configurações
            </a>
            <div class="topbar-dropdown-sep"></div>
            <button class="profile-item profile-item-danger" data-action="logout">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              Sair
            </button>
          </div>
        </div>
      </div>`;
  }

  // ─── DROPDOWN BEHAVIOR ──────────────────────────────────────────────────────
  function setupDropdowns() {
    const closeAll = () => {
      document.querySelectorAll('.topbar-dropdown.open').forEach(d => d.classList.remove('open'));
      document.querySelectorAll('[aria-haspopup="true"]').forEach(b => b.setAttribute('aria-expanded', 'false'));
    };
    const wireBtn = (btnId, dropId) => {
      const btn = document.getElementById(btnId);
      const drop = document.getElementById(dropId);
      if (!btn || !drop) return;
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const isOpen = drop.classList.contains('open');
        closeAll();
        if (!isOpen) {
          drop.classList.add('open');
          btn.setAttribute('aria-expanded', 'true');
        }
      });
    };
    wireBtn('notif-btn', 'notif-dropdown');
    wireBtn('profile-btn', 'profile-dropdown');

    // clique fora fecha
    document.addEventListener('click', e => {
      if (!e.target.closest('.topbar-dropdown-wrap')) closeAll();
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeAll(); });
  }

  // ─── NOTIFICATIONS LOADER ───────────────────────────────────────────────────
  async function loadNotifications() {
    const body = document.getElementById('notif-body');
    const dot  = document.getElementById('notif-dot');
    const cnt  = document.getElementById('notif-count');
    if (!body) return;
    try {
      if (typeof API === 'undefined') {
        body.innerHTML = '<div class="topbar-dropdown-empty">—</div>';
        return;
      }
      const res = await API.get('/quotes?status=PENDING&limit=5');
      const items = res.data?.data ?? res.data ?? [];
      const total = res.data?.pagination?.total ?? res.pagination?.total ?? items.length;
      if (cnt) cnt.textContent = `${total} pendente${total === 1 ? '' : 's'}`;
      if (dot) dot.style.display = total > 0 ? 'block' : 'none';
      if (!items.length) {
        body.innerHTML = '<div class="topbar-dropdown-empty">Nenhuma notificação nova</div>';
        return;
      }
      const fmt = d => d ? new Date(d).toLocaleDateString('pt-BR', {day:'2-digit', month:'short'}) : '';
      body.innerHTML = items.map(q => `
        <a href="orcamentos.html" class="notif-item">
          <div class="notif-item-avatar">${(q.name||'?').split(' ').map(x=>x[0]).join('').slice(0,2).toUpperCase()}</div>
          <div class="notif-item-text">
            <div class="notif-item-title">${q.name || '—'} <span class="notif-item-badge">novo</span></div>
            <div class="notif-item-sub">${q.projectType || ''} · ${fmt(q.createdAt)}</div>
          </div>
        </a>
      `).join('');
    } catch {
      body.innerHTML = '<div class="topbar-dropdown-empty">Sem acesso (faça login)</div>';
    }
  }

  // ─── PROFILE LOADER ─────────────────────────────────────────────────────────
  function loadProfile() {
    if (typeof Auth === 'undefined') return;
    const user = Auth.getUser();
    if (!user) return;
    const initials = (user.name || 'FA').split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('profile-name',  user.name  || 'Admin');
    set('profile-email', user.email || '—');
    set('profile-avatar', initials);
  }

  // Modal "Minha conta" — criado on-demand
  function openProfileModal() {
    if (typeof Auth === 'undefined') return;
    const user = Auth.getUser() || {};
    let modal = document.getElementById('profile-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'profile-modal';
      modal.className = 'modal-overlay';
      modal.innerHTML = `
        <div class="modal modal-md">
          <div class="modal-header">
            <div class="modal-title">Minha conta</div>
            <button class="modal-close" data-modal-close="profile-modal">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="modal-body">
            <div style="display:flex;gap:1rem;align-items:center;margin-bottom:1.2rem">
              <div class="profile-avatar" style="width:56px;height:56px;font-size:1.1rem">${(user.name||'FA').split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}</div>
              <div>
                <div style="font-weight:600;font-size:1rem;color:var(--txt)">${user.name || '—'}</div>
                <div style="font-size:.8rem;color:var(--txt-2)">${user.email || '—'}</div>
                <div style="margin-top:.3rem;font-size:.7rem;color:var(--gold);font-weight:600;letter-spacing:.1em">${user.role || 'ADMIN'}</div>
              </div>
            </div>
            <p style="font-size:.82rem;color:var(--txt-2);line-height:1.55">
              Para editar nome, e-mail, avatar ou senha, use a página de
              <a href="settings.html" style="color:var(--gold);text-decoration:underline">Configurações</a>.
            </p>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" data-modal-close="profile-modal">Fechar</button>
            <a href="settings.html" class="btn btn-primary">Abrir configurações</a>
          </div>
        </div>`;
      document.body.appendChild(modal);
    }
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  // ─── HAMBURGER (mobile + desktop collapse) ──────────────────────────────────
  // Mobile (<1024px): toggle .mobile-open na sidebar (slide-in lateral) + overlay.
  // Desktop (>=1024px): toggle .collapsed (sidebar 240→72px só ícones), persiste em localStorage.
  function setupHamburger() {
    const btn      = document.getElementById('topbar-menu-btn');
    const sidebar  = document.getElementById('sidebar');
    const overlay  = document.getElementById('sidebar-overlay');
    const toggleIn = document.getElementById('sidebar-toggle'); // chevron interno do sidebar
    if (!btn || !sidebar) return;

    const isMobile = () => window.matchMedia('(max-width: 1023px)').matches;

    // Estado inicial (desktop): respeita preferência salva
    if (!isMobile() && localStorage.getItem('fabioarts_sidebar_collapsed') === '1') {
      sidebar.classList.add('collapsed');
      document.body.classList.add('sidebar-collapsed');
    }

    const closeMobile = () => {
      sidebar.classList.remove('mobile-open');
      overlay?.classList.remove('visible');
    };

    const onHamburger = () => {
      if (isMobile()) {
        const opening = !sidebar.classList.contains('mobile-open');
        sidebar.classList.toggle('mobile-open');
        overlay?.classList.toggle('visible', opening);
      } else {
        const collapsed = sidebar.classList.toggle('collapsed');
        document.body.classList.toggle('sidebar-collapsed', collapsed);
        localStorage.setItem('fabioarts_sidebar_collapsed', collapsed ? '1' : '0');
      }
    };

    btn.addEventListener('click', onHamburger);
    toggleIn?.addEventListener('click', onHamburger);
    overlay?.addEventListener('click', closeMobile);

    // Fechar mobile-open ao clicar em qualquer link da nav
    sidebar.addEventListener('click', e => {
      if (e.target.closest('.nav-item') && isMobile()) closeMobile();
    });

    // Ao redimensionar para desktop, sempre limpa estado mobile
    window.addEventListener('resize', () => {
      if (!isMobile()) closeMobile();
    });

    // Esc fecha sidebar mobile
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && isMobile()) closeMobile();
    });
  }

  // ─── EVENT DELEGATION ──────────────────────────────────────────────────────
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-action]');
    if (!t) return;
    if (t.dataset.action === 'open-profile') {
      e.preventDefault();
      openProfileModal();
    }
  });

  // ─── INIT ───────────────────────────────────────────────────────────────────
  renderSidebar();
  renderTopbar();
  setupDropdowns();
  setupHamburger();

  // user + notifications precisam esperar Auth/API (carregados por admin.js depois)
  document.addEventListener('DOMContentLoaded', () => {
    loadProfile();
    loadNotifications();
  });
})();

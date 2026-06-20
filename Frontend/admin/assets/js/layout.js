/* ============================================================
   FABIOARTS ADMIN — layout.js
   Preenche sidebar + topbar em páginas com placeholders vazios.
   Carregar ANTES de admin.js (admin.js depende dos ids dos elementos).
   ============================================================ */

(function () {
  'use strict';

  const NAV = [
    { section: 'Principal' },
    { href: 'dashboard.html',   label: 'Dashboard',     icon: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z' },
    { href: 'clients.html',     label: 'Clientes',      icon: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8z' },
    { href: 'projects.html',    label: 'Projetos',      icon: 'M3 3h18v18H3zM3 15l5-5 13 13' },
    { href: 'orcamentos.html',  label: 'Orçamentos',    icon: 'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z' },
    { section: 'Sistema' },
    { href: 'services.html',    label: 'Serviços',      icon: 'M12 9a3 3 0 100 6 3 3 0 000-6zM19 5a10 10 0 010 14M5 5a10 10 0 000 14' },
    { href: 'settings.html',    label: 'Configurações', icon: 'M12 9a3 3 0 100 6 3 3 0 000-6z' },
  ];

  function pageTitle() {
    const f = (location.pathname.split('/').pop() || 'dashboard.html').replace('.html','');
    const titles = {
      dashboard: 'Dashboard', clients: 'Clientes', projects: 'Projetos',
      orcamentos: 'Orçamentos', services: 'Serviços', settings: 'Configurações',
    };
    return titles[f] || 'Admin';
  }

  function renderSidebar() {
    const el = document.getElementById('sidebar');
    if (!el || el.children.length) return; // já preenchido manualmente
    const currentFile = (location.pathname.split('/').pop() || 'dashboard.html');

    const navHtml = NAV.map(item => {
      if (item.section) return `<div class="nav-section-label">${item.section}</div>`;
      const active = currentFile === item.href ? ' active' : '';
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

  function renderTopbar() {
    const el = document.getElementById('topbar');
    if (!el || el.children.length) return;
    const title = pageTitle();
    el.innerHTML = `
      <div class="topbar-left">
        <button class="topbar-btn topbar-menu-btn" id="topbar-menu-btn">
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
        <div class="topbar-divider"></div>
        <div class="topbar-user" id="topbar-user">
          <div class="topbar-avatar" id="topbar-avatar">FA</div>
          <div>
            <div class="topbar-user-name" id="topbar-user-name">Carregando...</div>
            <div class="topbar-user-role" id="topbar-user-role">Admin</div>
          </div>
        </div>
        <button class="topbar-btn" data-action="logout" title="Sair">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
            <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </button>
      </div>`;
  }

  // Roda IMEDIATAMENTE (síncrono) — admin.js DOMContentLoaded ainda não disparou.
  renderSidebar();
  renderTopbar();
})();

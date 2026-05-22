/**
 * sidebar.js — Shared sidebar navigation for FoldrIQ
 * Injects the sidebar into #sidebar-container on every app page.
 * Must be loaded AFTER config.js and branding.js.
 */
(function () {
  'use strict';

  var PAGE = location.pathname.split('/').pop() || 'index.html';

  // SVG icons
  var ICONS = {
    checklists: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',
    history:    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    reports:    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
    admin:      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M12 2l2.09 6.26L20 10l-5 4.6 1.18 6.4L12 18l-4.18 3-1.18-6.4L2 10l5.91-1.74z"/></svg>',
    settings:   '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    help:       '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  };

  var NAV_ITEMS = [
    { href: 'index.html',    label: 'Checklists',   icon: ICONS.checklists, pages: ['index.html', ''] },
    { href: 'history.html',  label: 'Geschiedenis',  icon: ICONS.history,    pages: ['history.html'] },
    { href: 'reports.html',  label: 'Rapporten',     icon: ICONS.reports,    pages: ['reports.html'] },
    { href: 'admin.html',    label: 'Admin',         icon: ICONS.admin,      pages: ['admin.html'],      adminOnly: true },
    { href: 'settings.html', label: 'Instellingen',  icon: ICONS.settings,   pages: ['settings.html'] },
    { href: 'help.html',     label: 'Help',          icon: ICONS.help,       pages: ['help.html'] },
  ];

  function buildSidebar() {
    // Logo: branding override or default foldriq-logo.png
    var b = (typeof getBranding === 'function') ? getBranding() : {};
    var logoSrc = b.logo || 'foldriq-logo.png';
    var logoAlt = b.companyName || 'FoldrIQ';

    var navHtml = NAV_ITEMS.map(function (item) {
      var isActive = item.pages.indexOf(PAGE) !== -1;
      var adminAttr = item.adminOnly ? ' data-admin-only' : '';
      var cls = 'sb-nav-item' + (isActive ? ' active' : '');
      return '<a href="' + item.href + '" class="' + cls + '"' + adminAttr + '>'
        + '<span class="sb-nav-icon">' + item.icon + '</span>'
        + '<span>' + item.label + '</span>'
        + '</a>';
    }).join('');

    return ''
      + '<aside class="sidebar">'
      + '<div class="sb-logo"><a href="index.html">'
      + '<img src="' + logoSrc + '" alt="' + logoAlt + '" class="sb-logo-img"'
      + ' onerror="this.style.display=\'none\';document.getElementById(\'sb-logo-text\').style.display=\'block\'">'
      + '<span id="sb-logo-text" style="display:none;font-size:17px;font-weight:700;color:#fff">' + logoAlt + '</span>'
      + '</a></div>'
      + '<nav class="sb-nav">' + navHtml + '</nav>'
      + '<div class="sb-footer"><div id="user-pill"></div></div>'
      + '</aside>';
  }

  function inject() {
    var c = document.getElementById('sidebar-container');
    if (c) c.innerHTML = buildSidebar();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }
})();

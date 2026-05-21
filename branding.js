/**
 * branding.js — shared branding helper
 * Loaded on every page; exposes getBranding(), saveBranding(), hexToRgb(),
 * lightenHex(), and applyBranding() as globals.
 */
(function () {
  'use strict';

  var BRANDING_KEY = 'appBranding';

  var DEF = {
    companyName: '',
    accentHex: '#2D5A3D',
    logo: null,     // base64 data URL or null
    favicon: null   // base64 data URL or null
  };

  function getBranding() {
    try {
      var stored = localStorage.getItem(BRANDING_KEY);
      if (stored) return Object.assign({}, DEF, JSON.parse(stored));
    } catch (e) {}
    return Object.assign({}, DEF);
  }

  function saveBranding(b) {
    try { localStorage.setItem(BRANDING_KEY, JSON.stringify(b)); } catch (e) {}
  }

  /** hex → [r, g, b] */
  function hexToRgb(hex) {
    hex = (hex || '#2D5A3D').replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(function (c) { return c + c; }).join('');
    var n = parseInt(hex, 16);
    if (isNaN(n)) return [45, 90, 61];
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  /** Mix hex color with white. ratio 0 = original, 1 = white */
  function lightenHex(hex, ratio) {
    var rgb = hexToRgb(hex);
    return '#' + rgb.map(function (v) {
      return Math.round(v + (255 - v) * ratio).toString(16).padStart(2, '0');
    }).join('');
  }

  /** Apply saved branding to the current page (CSS vars, favicon, header logo). */
  function applyBranding() {
    var b = getBranding();
    var root = document.documentElement;

    // CSS custom properties
    root.style.setProperty('--accent', b.accentHex);
    root.style.setProperty('--accent-mid', lightenHex(b.accentHex, 0.25));
    root.style.setProperty('--accent-bg',  lightenHex(b.accentHex, 0.85));

    // Logo dots
    document.querySelectorAll('.logo-dot').forEach(function (d) {
      d.style.background = b.accentHex;
    });

    // Favicon
    var faviconHref = b.favicon || 'favicon.png';
    var link = document.querySelector('link[rel="icon"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      link.type = 'image/png';
      document.head.appendChild(link);
    }
    link.href = faviconHref;

    // Header logo image
    document.querySelectorAll('.logo').forEach(function (logoEl) {
      // Remove any previously injected brand image
      var existing = logoEl.querySelector('.brand-logo-img');
      if (existing) existing.remove();

      var dot = logoEl.querySelector('.logo-dot');

      // Hide / show any hardcoded default <img> that isn't the brand logo
      logoEl.querySelectorAll('img:not(.brand-logo-img)').forEach(function (existing) {
        existing.style.display = b.logo ? 'none' : '';
      });

      if (b.logo) {
        var img = document.createElement('img');
        img.className = 'brand-logo-img';
        img.src = b.logo;
        img.alt = b.companyName || 'Logo';
        img.style.cssText = 'height:32px;max-width:140px;object-fit:contain;border-radius:3px;flex-shrink:0';
        if (dot) dot.style.display = 'none';
        logoEl.insertBefore(img, logoEl.firstChild);
      } else {
        if (dot) dot.style.display = '';
      }

      // Update company name text node
      if (b.companyName) {
        for (var i = 0; i < logoEl.childNodes.length; i++) {
          var node = logoEl.childNodes[i];
          if (node.nodeType === 3 && node.textContent.trim()) {
            node.textContent = ' ' + b.companyName;
            break;
          }
        }
      }
    });
  }

  // Auto-apply on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyBranding);
  } else {
    applyBranding();
  }

  // Expose globals
  window.getBranding    = getBranding;
  window.saveBranding   = saveBranding;
  window.hexToRgb       = hexToRgb;
  window.lightenHex     = lightenHex;
  window.applyBranding  = applyBranding;
  window.BRANDING_KEY   = BRANDING_KEY;
})();

/**
 * auth.js — Shared authentication module
 * Load AFTER: supabase cdn, config.js
 *
 * Sets window.sb synchronously so any inline script can use it immediately.
 * Exposes the AUTH object with init(), signOut(), isAdmin(), etc.
 *
 * SECURITY: role is always read from user_profiles table (protected by RLS),
 * never from user_metadata (which users can write themselves).
 */

// Create the shared Supabase client immediately at parse time (synchronous)
window.sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

const AUTH = (() => {
  'use strict';

  let _user    = null;
  let _profile = null;

  /**
   * Call on every protected page, awaiting the result.
   *
   * opts.requireAuth  = true  (default) → redirect to login.html if no session
   * opts.requireAdmin = false (default) → redirect to index.html if not admin
   *
   * Returns the profile object on success, null when redirecting away.
   */
  async function init(opts) {
    opts = Object.assign({ requireAuth: true, requireAdmin: false }, opts || {});

    const { data: { session } } = await window.sb.auth.getSession();

    if (!session) {
      if (opts.requireAuth) {
        const returnTo = encodeURIComponent(location.pathname + location.search);
        location.href = 'login.html?redirect=' + returnTo;
      }
      return null;
    }

    _user = session.user;

    // IMPORTANT: read role from user_profiles — never from user_metadata
    // user_metadata is writable by the user; user_profiles is protected by RLS
    const { data: prof, error } = await window.sb
      .from('user_profiles')
      .select('*')
      .eq('id', _user.id)
      .single();

    if (error || !prof) {
      // No profile row → account not fully set up or deleted
      console.warn('AUTH: profile not found for', _user.email, error?.message || '');
      await signOut();
      return null;
    }

    _profile = prof;

    if (!_profile.is_active) {
      // Account deactivated by admin
      await signOut();
      return null;
    }

    if (opts.requireAdmin && _profile.role !== 'admin') {
      location.href = 'index.html';
      return null;
    }

    _renderPill();
    return _profile;
  }

  /** Render the user-pill widget into #user-pill (if it exists on the page) */
  function _renderPill() {
    const el = document.getElementById('user-pill');
    if (!el || !_profile) return;

    const initials = (_profile.full_name || _profile.email || '?')
      .split(/\s+/)
      .map(w => w[0] || '')
      .join('')
      .toUpperCase()
      .slice(0, 2);

    const roleLabel = { admin: 'Admin', technician: 'Technieker', viewer: 'Viewer' }[_profile.role] || _profile.role;

    el.innerHTML = `
      <div class="user-pill">
        <div class="user-avatar">${initials}</div>
        <div style="display:flex;flex-direction:column;line-height:1.3">
          <span class="user-name">${_esc(_profile.full_name || _profile.email)}</span>
          <span class="user-role-badge">${roleLabel}</span>
        </div>
        <button class="user-logout" title="Uitloggen" onclick="AUTH.signOut()">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </button>
      </div>`;
  }

  async function signOut() {
    await window.sb.auth.signOut();
    location.href = 'login.html';
  }

  function isAdmin()   { return _profile?.role === 'admin'; }
  function getUserId() { return _user?.id || null; }
  function getEmail()  { return _user?.email || ''; }

  // Tiny HTML escaper for user-supplied strings in the pill
  function _esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  return {
    init,
    signOut,
    isAdmin,
    getUserId,
    getEmail,
    _renderPill,
    get profile() { return _profile; },
    get user()    { return _user; },
  };
})();

// ============================================================
//  auth.js — Shared authentication guard
//  Include this script on every protected page AFTER config.js
//  and the Supabase CDN script.
// ============================================================

const AUTH = (() => {
  let _session = null;
  let _user = null;
  let _isAdmin = false;
  let _sb = null;

  async function init() {
    // Create a fresh client — Supabase JS v2 auto-loads session from localStorage
    _sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
    const { data: { session } } = await _sb.auth.getSession();

    if (!session) {
      // Not logged in — redirect to login with return URL
      const returnTo = encodeURIComponent(location.pathname + location.search);
      location.href = 'login.html?redirect=' + returnTo;
      return null;
    }

    _session = session;
    _user = session.user;
    _isAdmin = _user?.user_metadata?.role === 'admin';

    // Render user pill in header if #user-pill exists
    const pill = document.getElementById('user-pill');
    if (pill) {
      const name = _user.user_metadata?.full_name || _user.email.split('@')[0];
      pill.innerHTML = `
        <div class="user-pill">
          <div class="user-avatar">${name.charAt(0).toUpperCase()}</div>
          <span class="user-name">${escHtml(name)}</span>
          ${_isAdmin ? '<span class="user-role-badge">Admin</span>' : ''}
          <button class="user-logout" onclick="AUTH.logout()" title="Uitloggen">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>`;
    }

    return { session, user: _user, isAdmin: _isAdmin, sb: _sb };
  }

  async function logout() {
    const s = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
    await s.auth.signOut();
    location.href = 'login.html';
  }

  function getUser()    { return _user; }
  function getUserId()  { return _user?.id || null; }
  function getEmail()   { return _user?.email || ''; }
  function isAdmin()    { return _isAdmin; }
  function getClient()  { return _sb; }

  function escHtml(s) {
    return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  return { init, logout, getUser, getUserId, getEmail, isAdmin, getClient };
})();

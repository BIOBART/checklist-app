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
  let _pwResolve = null;

  /**
   * Call on every protected page, awaiting the result.
   * opts.requireAuth  = true  (default) → redirect to login.html if no session
   * opts.requireAdmin = false (default) → redirect to index.html if not admin
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
    console.log('AUTH: session ok for', _user.email);

    // IMPORTANT: read role from user_profiles — never from user_metadata
    const { data: prof, error } = await window.sb
      .from('user_profiles')
      .select('*')
      .eq('id', _user.id)
      .single();

    console.log('AUTH: profile query →', prof ? 'ok' : 'null', error?.message || '');

    if (error || !prof) {
      console.error('AUTH: profile not found, signing out.', error?.message || '');
      await signOut();
      return null;
    }

    _profile = prof;

    // Fetch role details separately — graceful fallback if roles table not yet migrated
    let roleRow = null;
    try {
      const { data, error: roleErr } = await window.sb
        .from('roles')
        .select('label, is_admin')
        .eq('id', prof.role)
        .maybeSingle();
      if (roleErr) console.warn('AUTH: roles lookup failed (fallback active):', roleErr.message);
      else roleRow = data;
    } catch (e) {
      console.warn('AUTH: roles fetch threw (fallback active):', e.message);
    }

    // Fall back to role === 'admin' if roles table not ready yet
    _profile.roles = roleRow || { label: prof.role, is_admin: prof.role === 'admin' };
    console.log('AUTH: role =', prof.role, '| is_admin =', _profile.roles.is_admin);

    if (!_profile.is_active) {
      await signOut();
      return null;
    }

    if (opts.requireAdmin && !_profile.roles?.is_admin) {
      location.href = 'index.html';
      return null;
    }

    // Force password change on first login
    if (_profile.must_change_password) {
      await _showPasswordChangeOverlay();
    }

    _renderPill();
    _applyNavVisibility();
    return _profile;
  }

  // ── Forced password change overlay ────────────────────────────────
  function _showPasswordChangeOverlay() {
    return new Promise(resolve => {
      _pwResolve = resolve;

      // Inject scoped CSS once
      if (!document.getElementById('auth-pw-style')) {
        const s = document.createElement('style');
        s.id = 'auth-pw-style';
        s.textContent = `
          #auth-pw-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.78);z-index:10000;display:flex;align-items:center;justify-content:center;padding:1rem}
          #auth-pw-card{background:#fff;border-radius:16px;padding:2rem;width:100%;max-width:400px;box-shadow:0 20px 60px rgba(0,0,0,0.3)}
          #auth-pw-card h2{font-family:'DM Serif Display',serif;font-size:22px;margin-bottom:6px}
          #auth-pw-card .sub{font-size:13px;color:#7A7168;margin-bottom:1.5rem;line-height:1.6}
          .auth-pw-field{margin-bottom:1rem}
          .auth-pw-field label{display:block;font-size:12px;font-weight:500;color:#7A7168;margin-bottom:4px}
          .auth-pw-field input{width:100%;padding:10px 12px;border:1.5px solid #E0DDD5;border-radius:10px;font-family:inherit;font-size:14px;outline:none;background:#F6F4EF;color:#1A1714;box-sizing:border-box;transition:border-color 0.15s}
          .auth-pw-field input:focus{border-color:var(--accent,#2D5A3D);background:#fff}
          #auth-pw-error{font-size:13px;color:#C0392B;margin-bottom:12px;padding:8px 12px;background:#FDECEA;border-radius:8px;display:none}
          #auth-pw-strength{font-size:12px;margin-top:4px;height:14px}
          #auth-pw-btn{width:100%;padding:11px;background:var(--accent,#2D5A3D);color:#fff;border:none;border-radius:10px;font-family:inherit;font-size:15px;font-weight:500;cursor:pointer;margin-top:4px;transition:opacity 0.15s}
          #auth-pw-btn:hover{opacity:0.88}
          #auth-pw-btn:disabled{opacity:0.55;cursor:not-allowed}
        `;
        document.head.appendChild(s);
      }

      const overlay = document.createElement('div');
      overlay.id = 'auth-pw-overlay';
      overlay.innerHTML = `
        <div id="auth-pw-card">
          <h2>Wachtwoord instellen</h2>
          <p class="sub">Je logt voor het eerst in. Stel een persoonlijk wachtwoord in om verder te gaan.</p>
          <div id="auth-pw-error"></div>
          <div class="auth-pw-field">
            <label>Nieuw wachtwoord</label>
            <input type="password" id="auth-pw-new" placeholder="Minimum 8 tekens" autocomplete="new-password">
            <div id="auth-pw-strength"></div>
          </div>
          <div class="auth-pw-field">
            <label>Wachtwoord bevestigen</label>
            <input type="password" id="auth-pw-confirm" placeholder="Herhaal wachtwoord" autocomplete="new-password">
          </div>
          <button id="auth-pw-btn">Wachtwoord opslaan</button>
        </div>`;
      document.body.appendChild(overlay);

      // Password strength indicator
      document.getElementById('auth-pw-new').addEventListener('input', function () {
        const v = this.value;
        const el = document.getElementById('auth-pw-strength');
        if (!v) { el.textContent = ''; return; }
        if (v.length < 8) { el.style.color = '#C0392B'; el.textContent = 'Te kort (min. 8 tekens)'; }
        else if (v.length < 12) { el.style.color = '#D4860A'; el.textContent = 'Matig wachtwoord'; }
        else { el.style.color = '#2D5A3D'; el.textContent = 'Sterk wachtwoord ✓'; }
      });

      async function doSave() {
        const newPw    = document.getElementById('auth-pw-new').value;
        const confirm  = document.getElementById('auth-pw-confirm').value;
        const errEl    = document.getElementById('auth-pw-error');
        const btn      = document.getElementById('auth-pw-btn');

        errEl.style.display = 'none';
        if (newPw.length < 8)    { errEl.textContent = 'Minimum 8 tekens vereist.'; errEl.style.display = 'block'; return; }
        if (newPw !== confirm)    { errEl.textContent = 'Wachtwoorden komen niet overeen.'; errEl.style.display = 'block'; return; }

        btn.disabled = true; btn.textContent = 'Opslaan…';

        const { error } = await window.sb.auth.updateUser({ password: newPw });
        if (error) {
          btn.disabled = false; btn.textContent = 'Wachtwoord opslaan';
          errEl.textContent = error.message; errEl.style.display = 'block';
          return;
        }

        // Clear the flag in the profile
        await window.sb.from('user_profiles')
          .update({ must_change_password: false })
          .eq('id', _user.id);
        _profile.must_change_password = false;

        overlay.remove();
        if (_pwResolve) { _pwResolve(); _pwResolve = null; }
      }

      document.getElementById('auth-pw-btn').addEventListener('click', doSave);
      overlay.querySelectorAll('input').forEach(inp => {
        inp.addEventListener('keydown', e => { if (e.key === 'Enter') doSave(); });
      });
    });
  }

  // ── User pill ────────────────────────────────────────────────────
  function _renderPill() {
    const el = document.getElementById('user-pill');
    if (!el || !_profile) return;

    const initials = (_profile.full_name || _profile.email || '?')
      .split(/\s+/).map(w => w[0] || '').join('').toUpperCase().slice(0, 2);

    const roleLabel = _profile.roles?.label || _profile.role || '?';

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

  // Hide nav links that require admin for non-admin users
  function _applyNavVisibility() {
    if (!_profile) return;
    if (!isAdmin()) {
      document.querySelectorAll('[data-admin-only]').forEach(el => {
        el.style.display = 'none';
      });
    }
  }

  async function signOut() {
    await window.sb.auth.signOut();
    location.href = 'login.html';
  }

  function isAdmin()   { return _profile?.roles?.is_admin === true; }
  function getUserId() { return _user?.id || null; }
  function getEmail()  { return _user?.email || ''; }

  function _esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  return {
    init, signOut, isAdmin, getUserId, getEmail,
    _renderPill, _applyNavVisibility,
    get profile() { return _profile; },
    get user()    { return _user; },
  };
})();

/* === Auth Bridge — Login viejo + Supabase v64 === */
(function(){
  const $ = (s, r=document) => r.querySelector(s);
  function escapeHtml(v=''){ return String(v ?? '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch])); }
  function toast(type, title, message=''){
    let wrap = $('#wtToastWrap');
    if(!wrap){ wrap = document.createElement('div'); wrap.id='wtToastWrap'; wrap.className='wt-toast-wrap'; document.body.appendChild(wrap); }
    const item = document.createElement('div');
    item.className = `wt-toast ${type || 'info'}`;
    item.innerHTML = `<strong>${escapeHtml(title)}</strong>${message ? `<span>${escapeHtml(message)}</span>` : ''}`;
    wrap.appendChild(item);
    setTimeout(() => item.classList.add('show'), 20);
    setTimeout(() => { item.classList.remove('show'); setTimeout(() => item.remove(), 260); }, 3600);
  }
  function roleLabel(role){
    const r = String(role || '').toLowerCase();
    if(r === 'superadmin') return 'Super Admin';
    if(r === 'admin') return 'Admin';
    return 'Usuario';
  }
  async function refreshSupabaseVisuals(){
    if(!window.WTDB?.enabled()) return;
    const user = await window.WTDB.getUser();
    const profile = await window.WTDB.getProfile();
    if(profile?.photo_url && $('#heroForumPhoto')) $('#heroForumPhoto').src = profile.photo_url;
    if(profile?.role && $('#heroForumRole')){
      const el = $('#heroForumRole');
      el.textContent = roleLabel(profile.role);
      el.className = `role-badge role-${String(profile.role).toLowerCase()}`;
      el.hidden = false;
    }
    if(profile && ['admin','superadmin'].includes(profile.role)){
      $('#heroAdminBtn') && ($('#heroAdminBtn').style.display = 'inline-flex');
      $('#adminNavLink') && ($('#adminNavLink').style.display = 'inline-flex');
    }
    return { user, profile };
  }
  async function trySupabaseLogin(email, password, showMessage=false){
    if(!window.WTDB?.enabled() || !email || !password) return false;
    const current = await window.WTDB.getUser();
    if(current?.email && current.email.toLowerCase() === email.toLowerCase()){
      await refreshSupabaseVisuals();
      return true;
    }
    const { error } = await window.WTDB.client().auth.signInWithPassword({ email, password });
    if(error){
      if(showMessage) toast('info', 'Login viejo activo', 'Entraste al sistema anterior. Supabase no aceptó esa contraseña.');
      return false;
    }
    await refreshSupabaseVisuals();
    window.dispatchEvent(new CustomEvent('wt:supabase-login'));
    if(showMessage) toast('success', 'Supabase conectado', 'También se inició sesión en Supabase.');
    return true;
  }
  document.addEventListener('submit', (event) => {
    const form = event.target;
    if(form?.id !== 'loginForm') return;
    const email = (form.querySelector('[name="email"]')?.value || '').trim();
    const password = (form.querySelector('[name="password"]')?.value || '').trim();
    setTimeout(() => trySupabaseLogin(email, password, false), 900);
    setTimeout(() => trySupabaseLogin(email, password, true), 1800);
  }, false);
  document.addEventListener('DOMContentLoaded', refreshSupabaseVisuals);
  setTimeout(refreshSupabaseVisuals, 1200);
  window.WTHybridAuth = { trySupabaseLogin, refreshSupabaseVisuals, toast };
})();

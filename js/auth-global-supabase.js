/* === Auth Global Supabase — v63 === */
(function(){
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

  function ensureToast(){
    let wrap = $('#wtToastWrap');
    if(!wrap){
      wrap = document.createElement('div');
      wrap.id = 'wtToastWrap';
      wrap.className = 'wt-toast-wrap';
      document.body.appendChild(wrap);
    }
    return wrap;
  }

  function toast(type, title, message=''){
    const wrap = ensureToast();
    const item = document.createElement('div');
    item.className = `wt-toast ${type || 'info'}`;
    item.innerHTML = `<strong>${escapeHtml(title)}</strong>${message ? `<span>${escapeHtml(message)}</span>` : ''}`;
    wrap.appendChild(item);
    setTimeout(() => item.classList.add('show'), 20);
    setTimeout(() => {
      item.classList.remove('show');
      setTimeout(() => item.remove(), 260);
    }, 3600);
  }

  function escapeHtml(v=''){
    return String(v ?? '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  }

  function setMessage(type, text){
    const box = $('#authMessage');
    if(box){
      box.className = 'auth-message show ' + (type || 'info');
      box.textContent = text || '';
    }
  }

  function switchTab(tab){
    $$('.auth-tab').forEach(b => b.classList.toggle('active', b.dataset.authTab === tab));
    $$('.auth-panel').forEach(p => p.classList.toggle('active', p.dataset.authPanel === tab));
    const title = $('#authTitle');
    if(title) title.textContent = tab === 'register' ? 'Crear cuenta' : tab === 'recover' ? 'Recuperar contraseña' : tab === 'profile' ? 'Mi perfil' : 'Iniciar sesión';
  }

  function openModal(tab='login'){
    const modal = $('#authModal');
    if(!modal) return;
    modal.hidden = false;
    switchTab(tab);
    setTimeout(() => modal.querySelector('input')?.focus(), 100);
  }

  function closeModal(){
    const modal = $('#authModal');
    if(modal) modal.hidden = true;
  }

  async function getProfile(){
    if(!window.WTDB?.enabled()) return { user:null, profile:null };
    const user = await window.WTDB.getUser();
    const profile = await window.WTDB.getProfile();
    return { user, profile };
  }

  function roleLabel(role){
    const r = String(role || '').toLowerCase();
    if(r === 'superadmin') return 'Super Admin';
    if(r === 'admin') return 'Admin';
    return 'Usuario';
  }

  async function refreshGlobalAuthUI(){
    const { user, profile } = await getProfile();
    const logged = !!user;
    $('#openLoginBtn') && ($('#openLoginBtn').style.display = logged ? 'none' : 'inline-flex');
    $('#openProfileBtn') && ($('#openProfileBtn').style.display = logged ? 'inline-flex' : 'none');
    $('#heroAdminBtn') && ($('#heroAdminBtn').style.display = profile && ['admin','superadmin'].includes(profile.role) ? 'inline-flex' : 'none');
    $('#adminNavLink') && ($('#adminNavLink').style.display = profile && ['admin','superadmin'].includes(profile.role) ? 'inline-flex' : 'none');

    $('#profileName') && ($('#profileName').textContent = profile?.full_name || user?.email || 'Usuario');
    $('#profileEmail') && ($('#profileEmail').textContent = user?.email || '');
    $('#modalProfileNameInput') && ($('#modalProfileNameInput').value = profile?.full_name || '');

    const preview = $('#profilePreview');
    if(preview) preview.src = profile?.photo_url || './images/logo.png';

    const forumPhoto = $('#heroForumPhoto');
    if(forumPhoto) forumPhoto.src = profile?.photo_url || './images/logo.png';

    const forumTitle = $('#heroForumTitle');
    if(forumTitle && logged) forumTitle.textContent = `Bienvenido, ${profile?.full_name || user.email}`;

    const roleEl = $('#heroForumRole');
    if(roleEl && logged) {
      roleEl.textContent = roleLabel(profile?.role);
      roleEl.className = `role-badge role-${String(profile?.role || 'user').toLowerCase()}`;
      roleEl.hidden = false;
    }
  }

  async function signIn(form){
    const email = (form.querySelector('[name="email"]')?.value || '').trim();
    const password = (form.querySelector('[name="password"]')?.value || '').trim();
    if(!email || !password) throw new Error('Escribe correo y contraseña.');
    const { error } = await window.WTDB.client().auth.signInWithPassword({ email, password });
    if(error) throw error;
    await refreshGlobalAuthUI();
    closeModal();
    toast('success', 'Sesión iniciada', 'Ya estás conectado con Supabase.');
  }

  async function signUp(form){
    const email = (form.querySelector('[name="email"]')?.value || '').trim();
    const password = (form.querySelector('[name="password"]')?.value || '').trim();
    const name = (form.querySelector('[name="name"]')?.value || '').trim();
    if(!email || !password) throw new Error('Escribe correo y contraseña.');
    const { error } = await window.WTDB.client().auth.signUp({
      email,
      password,
      options: { data: { full_name: name || email.split('@')[0] } }
    });
    if(error) throw error;
    toast('success', 'Cuenta creada', 'Si requiere verificación, revisa tu correo. Luego inicia sesión.');
    switchTab('login');
  }

  async function recover(form){
    const email = (form.querySelector('[name="email"]')?.value || '').trim();
    if(!email) throw new Error('Escribe tu correo.');
    const redirectTo = location.origin + location.pathname;
    const { error } = await window.WTDB.client().auth.resetPasswordForEmail(email, { redirectTo });
    if(error) throw error;
    toast('success', 'Revisa tu correo', 'Supabase envió instrucciones de recuperación.');
  }

  async function saveProfile(form){
    const { user } = await getProfile();
    if(!user) throw new Error('Debes iniciar sesión.');
    const name = (form.querySelector('[name="name"]')?.value || '').trim();
    const { error } = await window.WTDB.client().from('user_profiles').update({ full_name: name }).eq('id', user.id);
    if(error) throw error;
    await refreshGlobalAuthUI();
    toast('success', 'Perfil actualizado');
  }

  document.addEventListener('click', async event => {
    const openLogin = event.target.closest?.('#openLoginBtn, .js-open-supabase-login');
    const openProfile = event.target.closest?.('#openProfileBtn');
    if(openLogin){
      event.preventDefault();
      event.stopPropagation();
      if(event.stopImmediatePropagation) event.stopImmediatePropagation();
      openModal('login');
      return false;
    }
    if(openProfile){
      event.preventDefault();
      event.stopPropagation();
      if(event.stopImmediatePropagation) event.stopImmediatePropagation();
      openModal('profile');
      return false;
    }
    if(event.target?.id === 'authClose') {
      event.preventDefault();
      closeModal();
    }
    if(event.target?.classList?.contains('auth-tab')) {
      event.preventDefault();
      switchTab(event.target.dataset.authTab);
    }
  }, true);

  document.addEventListener('submit', async event => {
    const form = event.target;
    if(!['loginForm','registerForm','recoverForm','profileForm'].includes(form.id)) return;
    event.preventDefault();
    event.stopPropagation();
    if(event.stopImmediatePropagation) event.stopImmediatePropagation();

    try {
      if(!window.WTDB?.enabled()) throw new Error('Supabase no está activo.');
      if(form.id === 'loginForm') await signIn(form);
      if(form.id === 'registerForm') await signUp(form);
      if(form.id === 'recoverForm') await recover(form);
      if(form.id === 'profileForm') await saveProfile(form);
    } catch(err) {
      setMessage('error', err.message || String(err));
      toast('error', 'No se pudo completar', err.message || String(err));
    }
    return false;
  }, true);

  document.addEventListener('DOMContentLoaded', refreshGlobalAuthUI);
  setTimeout(refreshGlobalAuthUI, 700);

  window.WTGlobalSupabaseAuth = { openModal, refreshGlobalAuthUI, toast };
})();

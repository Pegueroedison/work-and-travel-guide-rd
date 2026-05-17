/* === AUTH PAGES — login, registro, recuperación y perfil === */
(function(){
  const CONFIG = window.WT_CONFIG || {};
  const $ = (s, r=document)=>r.querySelector(s);
  const state = { token: localStorage.getItem('wt_session') || '', user: JSON.parse(localStorage.getItem('wt_user') || 'null') };
  const params = new URLSearchParams(location.search);
  const redirect = params.get('redirect') || 'foro.html';
  function msg(type, text){ const box = $('#authPageMessage'); if(!box) return; box.className = `auth-message show ${type}`; box.textContent = text; }
  function data(form){ return Object.fromEntries(new FormData(form).entries()); }
  async function apiPost(payload){ if(!CONFIG.USERS_API_URL) throw new Error('Falta configurar USERS_API_URL en js/config.js.'); const res = await fetch(CONFIG.USERS_API_URL, { method:'POST', headers:{'Content-Type':'text/plain;charset=utf-8'}, body:JSON.stringify(payload)}); const json = await res.json(); if(json.ok===false) throw new Error(json.message || 'Error'); return json; }
  async function fileToBase64(file){ return new Promise((resolve,reject)=>{ const r = new FileReader(); r.onload=()=>resolve(String(r.result).split(',')[1]); r.onerror=reject; r.readAsDataURL(file); }); }
  function updateAdminLinks(){
    const role = String(state.user?.role || '').toLowerCase();
    const show = Boolean(state.token && ['admin','superadmin'].includes(role));
    ['#adminNavLink','#adminMobileLink'].forEach(sel => { const el = $(sel); if(el) el.style.display = show ? 'inline-flex' : 'none'; });
  }
  function driveThumbUrl(fileId){ return fileId ? `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w400` : ''; }
  function withCacheBust(url){ if(!url) return ''; return url + (url.includes('?') ? '&' : '?') + 'v=' + Date.now(); }
  function updateProfile(){
    if(!state.user) { updateAdminLinks(); return; }
    $('#profilePageName') && ($('#profilePageName').textContent = state.user.name || 'Usuario');
    $('#profilePageEmail') && ($('#profilePageEmail').textContent = state.user.email || '');
    const photoEl = $('#profilePagePhoto');
    const photoUrl = state.user.photo_url || driveThumbUrl(state.user.photo_file_id);
    if(photoUrl && photoEl) {
      photoEl.src = withCacheBust(photoUrl);
      photoEl.onerror = () => { photoEl.src = './images/logo.png'; };
    }
    updateAdminLinks();
  }

  function setVerifyEmail(email){
    const cleanEmail = String(email || '').trim();
    const hidden = $('#verifyEmailHidden') || $('#verifyPageForm input[name="email"]');
    const card = $('#verifyEmailCard');
    const text = $('#verifyEmailText');

    if(hidden) hidden.value = cleanEmail;
    if(text) text.textContent = cleanEmail;

    if(card){
      card.hidden = !cleanEmail;
      card.style.display = cleanEmail ? 'flex' : 'none';
    }

    if(cleanEmail) localStorage.setItem('wt_pending_verify_email', cleanEmail);
  }

  function getVerifyEmail(form){
    const formData = data(form);
    const email = String(formData.email || localStorage.getItem('wt_pending_verify_email') || '').trim();

    if(!email){
      throw new Error('Primero crea tu cuenta para recibir el código de verificación.');
    }

    return { ...formData, email };
  }

  function initVerifyEmail(){
    const registerEmail = $('#registerPageForm input[name="email"]');
    const pendingEmail = localStorage.getItem('wt_pending_verify_email') || '';
    if(pendingEmail) setVerifyEmail(pendingEmail);

    if(registerEmail){
      registerEmail.addEventListener('input', () => {
        const hidden = $('#verifyEmailHidden') || $('#verifyPageForm input[name="email"]');
        if(hidden && !hidden.value) setVerifyEmail(registerEmail.value);
      });
    }
  }

  async function refreshSession(){
    if(!state.token) { updateProfile(); return; }
    try{
      const r = await apiPost({ action:'checkSession', token:state.token });
      const freshUser = r.user || r.data?.user;
      if(freshUser){
        state.user = { ...(state.user || {}), ...freshUser };
        localStorage.setItem('wt_user', JSON.stringify(state.user));
      }
    }catch(err){ /* No cerramos sesión aquí para evitar sacar al usuario por fallos temporales. */ }
    updateProfile();
  }

  document.addEventListener('submit', async (e)=>{
    const form = e.target;
    if(form.id === 'loginPageForm'){
      e.preventDefault(); try{ const r = await apiPost({ action:'login', ...data(form) }); const user = r.user || r.data?.user; const token = r.token || r.data?.token; localStorage.setItem('wt_user', JSON.stringify(user)); localStorage.setItem('wt_session', token); msg('success','Sesión iniciada correctamente.'); setTimeout(()=>{ location.href = './' + redirect.replace(/^\.\//,''); }, 500); }catch(err){ msg('error', err.message); }
    }
    if(form.id === 'registerPageForm'){
      e.preventDefault();
      const formData = data(form);
      try{
        await apiPost({ action:'register', ...formData });
        setVerifyEmail(formData.email);
        msg('success','Cuenta creada. Revisa tu correo y coloca el código de verificación.');
        const codeInput = $('#verifyPageForm input[name="code"]');
        if(codeInput) codeInput.focus();
      }catch(err){ msg('error', err.message); }
    }
    if(form.id === 'verifyPageForm'){
      e.preventDefault();
      try{
        await apiPost({ action:'verifyEmail', ...getVerifyEmail(form) });
        localStorage.removeItem('wt_pending_verify_email');
        msg('success','Correo verificado. Ya puedes iniciar sesión.');
        setTimeout(()=>{ location.href = './login.html?redirect=' + encodeURIComponent(redirect); }, 800);
      }catch(err){ msg('error', err.message); }
    }
    if(form.id === 'recoverPageForm'){
      e.preventDefault(); try{ await apiPost({ action:'requestPasswordReset', ...data(form) }); msg('success','Si el correo existe, recibirás un código de recuperación.'); $('#resetPageForm input[name="email"]') && ($('#resetPageForm input[name="email"]').value = form.email.value); }catch(err){ msg('error', err.message); }
    }
    if(form.id === 'resetPageForm'){
      e.preventDefault(); try{ await apiPost({ action:'resetPassword', ...data(form) }); msg('success','Contraseña actualizada. Ya puedes iniciar sesión.'); }catch(err){ msg('error', err.message); }
    }
    if(form.id === 'profilePageForm'){
      e.preventDefault(); if(!state.token) return msg('error','Debes iniciar sesión primero.'); const file = form.photo.files[0]; if(!file) return msg('info','Selecciona una foto.'); if(file.size > (CONFIG.MAX_PROFILE_PHOTO_MB || 2)*1024*1024) return msg('error','La foto no puede pasar de 2 MB.'); if(!['image/jpeg','image/png','image/webp'].includes(file.type)) return msg('error','Solo se permite JPG, JPEG, PNG o WEBP.'); try{ const base64 = await fileToBase64(file); const r = await apiPost({ action:'uploadProfilePhoto', token:state.token, file_name:file.name, mime_type:file.type, size:file.size, base64 }); const newPhotoUrl = r.photo_url || r.data?.photo_url || driveThumbUrl(r.file_id || r.data?.file_id); state.user = { ...(state.user || {}), photo_url:newPhotoUrl, photo_file_id:r.file_id || r.data?.file_id || state.user?.photo_file_id }; localStorage.setItem('wt_user', JSON.stringify(state.user)); updateProfile(); form.reset(); msg('success','Foto actualizada correctamente.'); }catch(err){ msg('error', err.message); }
    }
  });
  document.addEventListener('click', (e)=>{
    if(e.target?.id === 'logoutPageBtn'){
      e.preventDefault();
      localStorage.removeItem('wt_user');
      localStorage.removeItem('wt_session');
      location.href = './login.html';
    }

    if(e.target?.id === 'changeVerifyEmailBtn'){
      e.preventDefault();
      const registerEmail = $('#registerPageForm input[name="email"]');
      if(registerEmail){
        registerEmail.focus();
        registerEmail.select();
        msg('info','Corrige el correo arriba y vuelve a presionar Crear cuenta.');
      }
    }
  });
  initVerifyEmail();
  if(document.body.dataset.authPage === 'perfil' && !state.token) msg('error','Debes iniciar sesión para editar tu perfil.');
  refreshSession();
})();

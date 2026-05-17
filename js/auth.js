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
  function updateProfile(){ if(!state.user) { updateAdminLinks(); return; } $('#profilePageName') && ($('#profilePageName').textContent = state.user.name || 'Usuario'); $('#profilePageEmail') && ($('#profilePageEmail').textContent = state.user.email || ''); if(state.user.photo_url && $('#profilePagePhoto')) $('#profilePagePhoto').src = state.user.photo_url; updateAdminLinks(); }

  document.addEventListener('submit', async (e)=>{
    const form = e.target;
    if(form.id === 'loginPageForm'){
      e.preventDefault(); try{ const r = await apiPost({ action:'login', ...data(form) }); const user = r.user || r.data?.user; const token = r.token || r.data?.token; localStorage.setItem('wt_user', JSON.stringify(user)); localStorage.setItem('wt_session', token); msg('success','Sesión iniciada correctamente.'); setTimeout(()=>{ location.href = './' + redirect.replace(/^\.\//,''); }, 500); }catch(err){ msg('error', err.message); }
    }
    if(form.id === 'registerPageForm'){
      e.preventDefault(); try{ await apiPost({ action:'register', ...data(form) }); msg('success','Cuenta creada. Revisa tu correo y coloca el código de verificación.'); $('#verifyPageForm input[name="email"]') && ($('#verifyPageForm input[name="email"]').value = form.email.value); }catch(err){ msg('error', err.message); }
    }
    if(form.id === 'verifyPageForm'){
      e.preventDefault(); try{ await apiPost({ action:'verifyEmail', ...data(form) }); msg('success','Correo verificado. Ya puedes iniciar sesión.'); setTimeout(()=>{ location.href = './login.html?redirect=' + encodeURIComponent(redirect); }, 800); }catch(err){ msg('error', err.message); }
    }
    if(form.id === 'recoverPageForm'){
      e.preventDefault(); try{ await apiPost({ action:'requestPasswordReset', ...data(form) }); msg('success','Si el correo existe, recibirás un código de recuperación.'); $('#resetPageForm input[name="email"]') && ($('#resetPageForm input[name="email"]').value = form.email.value); }catch(err){ msg('error', err.message); }
    }
    if(form.id === 'resetPageForm'){
      e.preventDefault(); try{ await apiPost({ action:'resetPassword', ...data(form) }); msg('success','Contraseña actualizada. Ya puedes iniciar sesión.'); }catch(err){ msg('error', err.message); }
    }
    if(form.id === 'profilePageForm'){
      e.preventDefault(); if(!state.token) return msg('error','Debes iniciar sesión primero.'); const file = form.photo.files[0]; if(!file) return msg('info','Selecciona una foto.'); if(file.size > (CONFIG.MAX_PROFILE_PHOTO_MB || 2)*1024*1024) return msg('error','La foto no puede pasar de 2 MB.'); if(!['image/jpeg','image/png','image/webp'].includes(file.type)) return msg('error','Solo se permite JPG, JPEG, PNG o WEBP.'); try{ const base64 = await fileToBase64(file); const r = await apiPost({ action:'uploadProfilePhoto', token:state.token, file_name:file.name, mime_type:file.type, size:file.size, base64 }); state.user.photo_url = r.photo_url || r.data?.photo_url; localStorage.setItem('wt_user', JSON.stringify(state.user)); updateProfile(); msg('success','Foto actualizada correctamente.'); }catch(err){ msg('error', err.message); }
    }
  });
  document.addEventListener('click', (e)=>{ if(e.target?.id === 'logoutPageBtn'){ e.preventDefault(); localStorage.removeItem('wt_user'); localStorage.removeItem('wt_session'); location.href = './login.html'; } });
  if(document.body.dataset.authPage === 'perfil' && !state.token) msg('error','Debes iniciar sesión para editar tu perfil.');
  updateProfile();
})();

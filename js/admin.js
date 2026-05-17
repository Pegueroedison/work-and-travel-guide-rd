/* === PANEL ADMIN WEB — GitHub Pages + Web Apps === */
(function(){
  const CONFIG = window.WT_CONFIG || {};
  const $ = (s,r=document)=>r.querySelector(s);
  const $$ = (s,r=document)=>Array.from(r.querySelectorAll(s));
  const escapeHtml = (v='') => String(v ?? '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  const state = { token: localStorage.getItem('wt_session') || '', user: JSON.parse(localStorage.getItem('wt_user') || 'null'), content:null, users:[], forum:null };

  function setMsg(type, text){ const el=$('#adminMessage'); if(!el) return; el.className = 'admin-message ' + (type || 'info'); el.textContent = text; }
  function apiUrl(baseUrl, params={}){ const u = new URL(baseUrl); Object.entries(params).forEach(([k,v])=>u.searchParams.set(k,v)); return u.toString(); }
  async function apiGet(baseUrl, params={}, label='API'){ if(!baseUrl) throw new Error(`Falta configurar ${label} en js/config.js.`); const res=await fetch(apiUrl(baseUrl, params)); const data=await res.json(); if(data.ok===false) throw new Error(data.message || 'Error'); return data; }
  async function apiPost(baseUrl, payload={}, label='API'){ if(!baseUrl) throw new Error(`Falta configurar ${label} en js/config.js.`); const res=await fetch(baseUrl,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(payload)}); const data=await res.json(); if(data.ok===false) throw new Error(data.message || 'Error'); return data; }
  function isAdmin(user){ return ['admin','superadmin'].includes(String(user?.role || '').toLowerCase()); }
  function isSuper(user){ return String(user?.role || '').toLowerCase() === 'superadmin'; }
  function short(v, n=80){ v = String(v ?? ''); return v.length > n ? v.slice(0,n) + '…' : v; }

  function driveThumbUrl(fileId){ return fileId ? `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w600` : ''; }
  function normalizeImageUrl(url, fileId){
    const byId = driveThumbUrl(fileId);
    if(byId) return byId;
    return url || '';
  }
  function fileToBase64(file){
    return new Promise((resolve, reject)=>{
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
  function imageFolderForSheet(sheetName){
    if(sheetName === 'Anuncios') return 'Anuncios';
    if(sheetName === 'ServiciosJ1') return 'Servicios';
    if(sheetName === 'CursoIngles') return 'Curso de ingles';
    return 'Contenido';
  }

  async function checkAccess(){
    $('#cfgContent') && ($('#cfgContent').textContent = CONFIG.CONTENT_API_URL || 'No configurado');
    $('#cfgUsers') && ($('#cfgUsers').textContent = CONFIG.USERS_API_URL || 'No configurado');
    $('#cfgForum') && ($('#cfgForum').textContent = CONFIG.FORUM_API_URL || 'No configurado');
    if(!state.token){ showLocked('Debes iniciar sesión con una cuenta admin o superadmin.'); return false; }
    try{
      const data = await apiPost(CONFIG.USERS_API_URL, { action:'checkSession', token:state.token }, 'USERS_API_URL');
      state.user = data.user || data.data?.user || state.user;
      localStorage.setItem('wt_user', JSON.stringify(state.user));
      if(!isAdmin(state.user)){ showLocked('No tienes permiso para acceder al panel administrativo.'); return false; }
      $('#adminLocked').hidden = true; $('#adminDashboard').hidden = false;
      $('#adminUserName').textContent = state.user.name || state.user.email || 'Admin';
      $('#adminUserRole').textContent = state.user.role || 'admin';
      setMsg('success', 'Acceso permitido. Puedes administrar la página desde aquí.');
      return true;
    }catch(err){ showLocked(err.message); return false; }
  }
  function showLocked(message){ $('#adminDashboard').hidden = true; $('#adminLocked').hidden = false; setMsg('error', message); }

  function tableHTML(rows=[], opts={}){
    if(!rows || !rows.length) return '<div class="empty-state">No hay datos para mostrar.</div>';
    const hide = new Set(opts.hide || []);
    let keys = opts.keys || Object.keys(rows[0]).filter(k => !hide.has(k));
    keys = keys.filter(k => !hide.has(k));
    const th = keys.map(k=>`<th>${escapeHtml(k)}</th>`).join('') + (opts.actions ? '<th>Acciones</th>' : '');
    const trs = rows.map(row => {
      const tds = keys.map(k => {
        let val = row[k];
        const low = String(k).toLowerCase();
        if(['status','estado','role','active','activo'].includes(low)) val = `<span class="status-pill ${escapeHtml(String(val).toLowerCase())}">${escapeHtml(val)}</span>`;
        else if(['imagen_url','image_url','photo_url'].includes(low)) {
          const fileId = row.image_file_id || row.imagen_file_id || '';
          const imgUrl = normalizeImageUrl(val, fileId);
          val = imgUrl ? `<a class="admin-img-link" href="${escapeHtml(imgUrl)}" target="_blank" rel="noopener noreferrer"><img class="admin-img-thumb" src="${escapeHtml(imgUrl)}" alt="Imagen"><span>Ver imagen</span></a>` : '';
        }
        else if(low.includes('url') || low === 'enlace') val = val ? `<a href="${escapeHtml(val)}" target="_blank" rel="noopener noreferrer">${escapeHtml(short(val,50))}</a>` : '';
        else if(low === 'id' || low.endsWith('_id') || low === 'target_id') val = `<code>${escapeHtml(val)}</code>`;
        else val = escapeHtml(short(val,120));
        return `<td>${val}</td>`;
      }).join('');
      const actions = opts.actions ? `<td>${opts.actions(row)}</td>` : '';
      return `<tr>${tds}${actions}</tr>`;
    }).join('');
    return `<table class="admin-table"><thead><tr>${th}</tr></thead><tbody>${trs}</tbody></table>`;
  }

  async function loadContent(){
    try{
      const data = await apiPost(CONFIG.CONTENT_API_URL, { action:'adminListAll', token:state.token }, 'CONTENT_API_URL');
      state.content = data.data || data;
      const anuncios = state.content.Anuncios?.rows || state.content.Anuncios || [];
      const servicios = state.content.ServiciosJ1?.rows || state.content.ServiciosJ1 || [];
      const curso = state.content.CursoIngles?.rows || state.content.CursoIngles || [];
      const grupos = state.content.GruposWhatsApp?.rows || state.content.GruposWhatsApp || [];
      const instagram = state.content.Instagram?.rows || state.content.Instagram || [];
      $('#countAds').textContent = anuncios.length;
      $('#countServices').textContent = servicios.length + curso.length;
      $('#tableAnuncios').innerHTML = tableHTML(anuncios, { hide:['rowNumber'] });
      $('#tableServiciosJ1').innerHTML = tableHTML(servicios, { hide:['rowNumber'] });
      $('#tableCursoIngles').innerHTML = tableHTML(curso, { hide:['rowNumber'] });
      $('#tableComunidad').innerHTML = '<h4>WhatsApp</h4>' + tableHTML(grupos, { hide:['rowNumber'] }) + '<h4 style="margin-top:1rem">Instagram</h4>' + tableHTML(instagram, { hide:['rowNumber'] });
    }catch(err){ $('#tableAnuncios').innerHTML = `<div class="empty-state">${escapeHtml(err.message)}</div>`; }
  }

  async function loadUsers(){
    try{
      const data = await apiPost(CONFIG.USERS_API_URL, { action:'adminListUsers', token:state.token }, 'USERS_API_URL');
      state.users = data.users || data.data?.users || [];
      $('#tableUsers').innerHTML = tableHTML(state.users, { hide:['rowNumber','password_hash','salt'], keys:['id','name','email','role','status','block_reason','email_verified','created_at','last_login','photo_url'] });
    }catch(err){ $('#tableUsers').innerHTML = `<div class="empty-state">${escapeHtml(err.message)}</div>`; }
  }

  function moderateActions(row, type){
    const id = row.target_id || row.id;
    return `<div class="mini-actions">
      <button class="mini-btn approve" data-moderate="approved" data-type="${escapeHtml(type)}" data-id="${escapeHtml(id)}">Aprobar</button>
      <button class="mini-btn reject" data-moderate="rejected" data-type="${escapeHtml(type)}" data-id="${escapeHtml(id)}">Rechazar</button>
      <button class="mini-btn delete" data-moderate="deleted" data-type="${escapeHtml(type)}" data-id="${escapeHtml(id)}">Eliminar</button>
    </div>`;
  }

  async function loadForum(){
    try{
      const data = await apiPost(CONFIG.FORUM_API_URL, { action:'adminDashboard', token:state.token }, 'FORUM_API_URL');
      state.forum = data.data || data;
      const posts = state.forum.posts?.rows || state.forum.posts || [];
      const comments = state.forum.comments?.rows || state.forum.comments || [];
      const reports = state.forum.reports?.rows || state.forum.reports || [];
      const queue = state.forum.queue?.rows || state.forum.queue || [];
      const configRows = state.forum.config?.rows || state.forum.config || [];
      const commentsApprovalRow = configRows.find(r => String(r.clave || '').toLowerCase() === 'comments_require_approval');
      const commentsApproval = ['true','1','si','sí','activo','active'].includes(String(commentsApprovalRow?.valor || '').toLowerCase().trim());
      const approvalSelect = $('#commentsRequireApproval');
      if (approvalSelect) approvalSelect.value = commentsApproval ? 'TRUE' : 'FALSE';
      const pending = queue.filter(r => String(r.status || '').toLowerCase() === 'open').length + posts.filter(r => String(r.status || '').toLowerCase() === 'pending').length + comments.filter(r => String(r.status || '').toLowerCase() === 'pending').length;
      $('#countPendingForum').textContent = pending;
      $('#tableModerationQueue').innerHTML = tableHTML(queue, { hide:['rowNumber'], keys:['id','target_type','target_id','reason','status','created_at','reviewed_by','note'], actions:(row)=>moderateActions(row, row.target_type || 'post') });
      $('#tableReports').innerHTML = tableHTML(reports, { hide:['rowNumber'], keys:['id','target_type','target_id','reporter_email','reason','status','created_at','resolved_by'] });
      $('#tablePosts').innerHTML = tableHTML(posts, { hide:['rowNumber'], keys:['id','title','category','author_name','author_role','status','moderation_reason','created_at','reports_count'], actions:(row)=>moderateActions(row, 'post') });
      $('#tableComments').innerHTML = tableHTML(comments, { hide:['rowNumber'], keys:['id','post_id','body','author_name','author_role','status','moderation_reason','created_at','reports_count'], actions:(row)=>moderateActions(row, 'comment') });
    }catch(err){ $('#tableModerationQueue').innerHTML = `<div class="empty-state">${escapeHtml(err.message)}</div>`; }
  }

  async function loadAll(){ await Promise.allSettled([loadContent(), loadUsers(), loadForum()]); }

  document.addEventListener('click', async (e)=>{
    if(e.target?.id === 'hamburger'){ $('#hamburger').classList.toggle('open'); $('#mobileNav').classList.toggle('open'); }
    if(e.target?.classList?.contains('admin-tab')){
      const tab = e.target.dataset.adminTab;
      $$('.admin-tab').forEach(b=>b.classList.toggle('active', b.dataset.adminTab === tab));
      $$('.admin-panel').forEach(p=>p.classList.toggle('active', p.dataset.adminPanel === tab));
    }
    if(e.target?.id === 'reloadContentBtn') loadContent();
    if(e.target?.id === 'reloadUsersBtn') loadUsers();
    if(e.target?.id === 'reloadForumBtn') loadForum();
    if(e.target?.id === 'clearContentImageBtn'){
      const input = $('#contentImageFile');
      const preview = $('#contentImagePreview');
      if(input) input.value = '';
      if(preview){ preview.hidden = true; const img = preview.querySelector('img'); if(img) img.removeAttribute('src'); }
    }
    if(e.target?.dataset?.moderate){
      const decision = e.target.dataset.moderate;
      const type = e.target.dataset.type;
      const id = e.target.dataset.id;
      if(!(await window.WTNotify.confirm(`¿Aplicar ${decision} a ${type} ${id}?`, { title: 'Confirmar moderación', confirmText: 'Sí, aplicar', cancelText: 'Cancelar' }))) return;
      try{ await apiPost(CONFIG.FORUM_API_URL, { action:'adminModerateDirect', token:state.token, target_type:type, target_id:id, decision, note:'Desde admin.html' }, 'FORUM_API_URL'); setMsg('success','Moderación aplicada.'); loadForum(); }
      catch(err){ setMsg('error', err.message); }
    }
  });


  document.addEventListener('change', (e)=>{
    if(e.target?.id === 'contentImageFile'){
      const file = e.target.files && e.target.files[0];
      const preview = $('#contentImagePreview');
      const img = preview?.querySelector('img');
      if(!file || !preview || !img){ if(preview) preview.hidden = true; return; }
      if(!/^image\/(png|jpe?g|webp)$/i.test(file.type)){
        setMsg('error','Formato no permitido. Usa JPG, JPEG, PNG o WEBP.');
        e.target.value = '';
        preview.hidden = true;
        return;
      }
      if(file.size > 3 * 1024 * 1024){
        setMsg('error','La imagen no puede pasar de 3 MB.');
        e.target.value = '';
        preview.hidden = true;
        return;
      }
      img.src = URL.createObjectURL(file);
      preview.hidden = false;
    }
  });

  document.addEventListener('submit', async (e)=>{
    const form = e.target;
    if(form.id === 'contentQuickForm'){
      e.preventDefault();
      const formData = new FormData(form);
      const fd = Object.fromEntries(formData.entries());
      const row = {};
      const sheetName = fd.sheetName;
      if(sheetName === 'Config') { row.clave = fd.id; row.valor = fd.titulo; row.descripcion = fd.descripcion; }
      else {
        row.id = fd.id;
        if(fd.titulo) { row.titulo = fd.titulo; row.nombre = fd.titulo; row.url = fd.titulo.startsWith('http') ? fd.titulo : undefined; }
        if(fd.descripcion) row.descripcion = fd.descripcion;
        if(fd.enlace) { row.enlace = fd.enlace; row.url = fd.enlace; }
        if(fd.imagen_url) row.imagen_url = fd.imagen_url;
        if(fd.cta) { row.cta = fd.cta; row.texto_boton = fd.cta; }
        if(fd.orden) row.orden = Number(fd.orden);
        row.activo = fd.activo === 'TRUE';
        row.destacado = fd.destacado === 'TRUE';
      }
      Object.keys(row).forEach(k => row[k] === undefined && delete row[k]);
      try{
        const file = $('#contentImageFile')?.files?.[0];
        if(file && sheetName !== 'Config'){
          setMsg('info','Subiendo imagen a Google Drive...');
          const upload = await apiPost(CONFIG.CONTENT_API_URL, {
            action:'adminUploadImage',
            token:state.token,
            sheetName,
            recordId:row.id,
            folder:imageFolderForSheet(sheetName),
            file:{
              name:file.name,
              mimeType:file.type,
              size:file.size,
              base64:await fileToBase64(file)
            }
          }, 'CONTENT_API_URL');
          const image = upload.image || upload.data?.image || upload;
          row.imagen_url = image.image_url || image.url || row.imagen_url || '';
          row.image_file_id = image.file_id || image.image_file_id || '';
          row.image_name = image.name || file.name;
          row.image_size = image.size || file.size;
          row.image_type = image.mimeType || file.type;
        }
        await apiPost(CONFIG.CONTENT_API_URL, { action:'adminSaveRow', token:state.token, sheetName, row }, 'CONTENT_API_URL');
        setMsg('success','Registro guardado correctamente.');
        form.reset();
        const preview = $('#contentImagePreview'); if(preview) preview.hidden = true;
        loadContent();
      }
      catch(err){ setMsg('error', err.message); }
    }
    if(form.id === 'forumSettingsForm'){
      e.preventDefault();
      const fd = Object.fromEntries(new FormData(form).entries());
      try{
        await apiPost(CONFIG.FORUM_API_URL, { action:'adminUpdateConfig', token:state.token, key:'comments_require_approval', value:fd.comments_require_approval }, 'FORUM_API_URL');
        setMsg('success','Ajuste del foro guardado.');
        loadForum();
      }catch(err){ setMsg('error', err.message); }
    }

    if(form.id === 'userActionForm'){
      e.preventDefault();
      const clicked = document.activeElement?.value;
      const fd = Object.fromEntries(new FormData(form).entries());
      try{
        if(clicked === 'setRole') await apiPost(CONFIG.USERS_API_URL, { action:'adminSetRole', token:state.token, user_id:fd.user_id, role:fd.role }, 'USERS_API_URL');
        if(clicked === 'block') await apiPost(CONFIG.USERS_API_URL, { action:'adminBlockUser', token:state.token, user_id:fd.user_id, reason:fd.reason }, 'USERS_API_URL');
        if(clicked === 'unblock') await apiPost(CONFIG.USERS_API_URL, { action:'adminUnblockUser', token:state.token, user_id:fd.user_id }, 'USERS_API_URL');
        setMsg('success','Acción aplicada al usuario.'); loadUsers();
      }catch(err){ setMsg('error', err.message); }
    }
  });

  window.addEventListener('scroll', () => { const p = $('#progressBar'); if(p) p.style.width = ((window.scrollY/(document.body.scrollHeight-innerHeight))*100) + '%'; });
  checkAccess().then(ok => { if(ok) loadAll(); });
})();

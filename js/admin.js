/* === PANEL ADMIN WEB — GitHub Pages + Web Apps === */
(function(){
  const CONFIG = window.WT_CONFIG || {};
  const $ = (s,r=document)=>r.querySelector(s);
  const $$ = (s,r=document)=>Array.from(r.querySelectorAll(s));
  const escapeHtml = (v='') => String(v ?? '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  const state = { token: localStorage.getItem('wt_session') || '', user: JSON.parse(localStorage.getItem('wt_user') || 'null'), content:null, users:[], forum:null };

  // Evita recargas accidentales del panel admin, incluso si se presiona Enter dentro de un formulario.
  window.addEventListener('submit', (event) => {
    event.preventDefault();
    event.stopPropagation();
  }, true);

  function setMsg(type, text){ const el=$('#adminMessage'); if(!el) return; el.className = 'admin-message ' + (type || 'info'); el.textContent = text; }
  function apiUrl(baseUrl, params={}){ const u = new URL(baseUrl); Object.entries(params).forEach(([k,v])=>u.searchParams.set(k,v)); return u.toString(); }
  async function apiGet(baseUrl, params={}, label='API'){ if(!baseUrl) throw new Error(`Falta configurar ${label} en js/config.js.`); const res=await fetch(apiUrl(baseUrl, params)); const data=await res.json(); if(data.ok===false) throw new Error(data.message || 'Error'); return data; }
  async function apiPost(baseUrl, payload={}, label='API'){
    if(!baseUrl) throw new Error(`Falta configurar ${label} en js/config.js.`);
    const finalPayload = { ...payload };
    // La Web App de Contenido también necesita validar roles usando la Web App de Usuarios.
    // Enviamos USERS_API_URL desde config.js para que no tengas que pegarlo manualmente en Sheets cada vez.
    if(baseUrl === CONFIG.CONTENT_API_URL && String(finalPayload.action || '').toLowerCase().startsWith('admin')) {
      finalPayload.usersApiUrl = CONFIG.USERS_API_URL || '';
    }
    const res=await fetch(baseUrl,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(finalPayload)});
    const data=await res.json();
    if(data.ok===false) throw new Error(data.message || 'Error');
    return data;
  }
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

  function boolVal(v){ return v === 'TRUE' || v === true || String(v).toLowerCase() === 'true'; }
  function autoId(prefix){ return `${prefix}-${Date.now().toString().slice(-8)}`; }
  function cleanRow(row){ Object.keys(row).forEach(k => (row[k] === undefined || row[k] === '') && delete row[k]); return row; }

  async function uploadContentImageIfAny(form, sheetName, recordId, row){
    const file = form.querySelector('input[type="file"]')?.files?.[0];
    if(!file) return row;
    setMsg('info','Subiendo imagen a Google Drive...');
    const upload = await apiPost(CONFIG.CONTENT_API_URL, {
      action:'adminUploadImage',
      token:state.token,
      sheetName,
      recordId,
      folder:imageFolderForSheet(sheetName),
      file:{ name:file.name, mimeType:file.type, size:file.size, base64:await fileToBase64(file) }
    }, 'CONTENT_API_URL');
    const image = upload.image || upload.data?.image || upload;
    row.imagen_url = image.image_url || image.url || row.imagen_url || '';
    row.image_file_id = image.file_id || image.image_file_id || '';
    row.image_name = image.name || file.name;
    row.image_size = image.size || file.size;
    row.image_type = image.mimeType || file.type;
    return row;
  }

  async function saveContentRow(sheetName, row, form){
    row = cleanRow(row);
    await uploadContentImageIfAny(form, sheetName, row.id || row.clave || '', row);
    await apiPost(CONFIG.CONTENT_API_URL, { action:'adminSaveRow', token:state.token, sheetName, row }, 'CONTENT_API_URL');
    setMsg('success','Guardado correctamente. Actualizando datos...');
    form.reset();
    form.querySelectorAll('.admin-image-preview').forEach(p => { p.hidden = true; const img = p.querySelector('img'); if(img) img.removeAttribute('src'); });
    loadContent();
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
    if(e.target?.id === 'prepareContentDriveBtn'){
      try{
        setMsg('info','Preparando carpeta de Drive para imágenes de contenido...');
        const data = await apiPost(CONFIG.CONTENT_API_URL, { action:'adminPrepareContentStorage', token:state.token }, 'CONTENT_API_URL');
        setMsg('success', `Carpeta lista: ${data.folder?.name || 'WT Guide RD - Imagenes de Contenido'}. ID: ${data.folder?.id || ''}`);
        loadContent();
      }catch(err){ setMsg('error', err.message); }
    }
    if(e.target?.classList?.contains('content-mode-btn')){
      const mode = e.target.dataset.contentMode;
      $$('.content-mode-btn').forEach(b=>b.classList.toggle('active', b === e.target));
      $$('.content-editor-card').forEach(card=>card.classList.toggle('active', card.dataset.contentEditor === mode));
    }
    if(e.target?.classList?.contains('clear-image-btn')){
      const box = e.target.closest('.admin-image-preview');
      const form = e.target.closest('form');
      const input = form?.querySelector('input[type="file"]');
      if(input) input.value = '';
      if(box){ box.hidden = true; const img = box.querySelector('img'); if(img) img.removeAttribute('src'); }
    }
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
    if(e.target?.matches?.('.content-image-input, #contentImageFile')){
      const file = e.target.files && e.target.files[0];
      const previewId = e.target.dataset.preview || 'contentImagePreview';
      const preview = $('#' + previewId);
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
      setMsg('info','Imagen lista. Ahora presiona guardar para subirla a Drive.');
    }
  });

  const ADMIN_FORMS = new Set([
    'adSimpleForm',
    'serviceSimpleForm',
    'courseSimpleForm',
    'instagramSimpleForm',
    'whatsappSimpleForm',
    'contentQuickForm',
    'forumSettingsForm',
    'userActionForm'
  ]);

  function validateRequired(form){
    const required = Array.from(form.querySelectorAll('[required]'));
    for (const field of required){
      if(!String(field.value || '').trim()){
        const label = field.closest('label')?.innerText?.split('\n')[0] || field.name || 'campo requerido';
        field.focus();
        throw new Error(`Completa el campo: ${label}`);
      }
    }
  }

  async function handleAdminForm(form, submitter){
    if(!form || !ADMIN_FORMS.has(form.id)) return;
    if(form.dataset.saving === 'true') return;

    validateRequired(form);

    const submitBtn = submitter?.matches?.('button,input') ? submitter : form.querySelector('[data-admin-save], button[type="submit"], input[type="submit"]');
    const oldText = submitBtn ? submitBtn.textContent : '';

    try {
      form.dataset.saving = 'true';
      if(submitBtn) {
        submitBtn.disabled = true;
        if(submitBtn.tagName === 'BUTTON') submitBtn.textContent = 'Guardando...';
      }

      if(form.id === 'adSimpleForm'){
        const fd = Object.fromEntries(new FormData(form).entries());
        const row = {
          id: fd.id || autoId('AD'), tipo: fd.tipo, titulo: fd.titulo, descripcion: fd.descripcion,
          imagen_url: fd.imagen_url, enlace: fd.enlace, cta: fd.cta || 'Ver más', posicion: fd.posicion,
          orden: fd.orden ? Number(fd.orden) : 1, destacado: boolVal(fd.destacado), activo: boolVal(fd.activo),
          delay_ms: fd.tipo === 'popup' ? 2500 : 0
        };
        await saveContentRow('Anuncios', row, form);
        return;
      }

      if(form.id === 'serviceSimpleForm'){
        const fd = Object.fromEntries(new FormData(form).entries());
        const row = {
          id: fd.id || autoId('SVC'), nombre: fd.nombre, descripcion: fd.descripcion, icono: fd.icono,
          imagen_url: fd.imagen_url, enlace: fd.enlace, cta: fd.cta || 'Solicitar información',
          orden: fd.orden ? Number(fd.orden) : 1, destacado: boolVal(fd.destacado), activo: boolVal(fd.activo)
        };
        await saveContentRow('ServiciosJ1', row, form);
        return;
      }

      if(form.id === 'courseSimpleForm'){
        const fd = Object.fromEntries(new FormData(form).entries());
        const row = {
          id: fd.id || 'ENG-001', titulo: fd.titulo, descripcion: fd.descripcion, precio: fd.precio,
          imagen_url: fd.imagen_url, enlace: fd.enlace, cta: fd.cta || 'Solicitar información',
          orden: fd.orden ? Number(fd.orden) : 1, destacado: boolVal(fd.destacado), activo: boolVal(fd.activo)
        };
        await saveContentRow('CursoIngles', row, form);
        return;
      }

      if(form.id === 'instagramSimpleForm'){
        const fd = Object.fromEntries(new FormData(form).entries());
        const row = {
          id:'IG-001', url:fd.url, texto_boton:fd.texto_boton || 'Síguenos en Instagram',
          mostrar_inicio:boolVal(fd.mostrar_inicio), mostrar_footer:boolVal(fd.mostrar_footer), mostrar_comunidad:boolVal(fd.mostrar_comunidad), activo:boolVal(fd.activo)
        };
        await saveContentRow('Instagram', row, form);
        return;
      }

      if(form.id === 'whatsappSimpleForm'){
        const fd = Object.fromEntries(new FormData(form).entries());
        const row = {
          id: fd.id || autoId('WA'), nombre: fd.nombre, estado: fd.estado || 'General', descripcion: fd.descripcion,
          enlace: fd.enlace, orden: fd.orden ? Number(fd.orden) : 1, destacado:boolVal(fd.destacado), principal:boolVal(fd.principal), activo:boolVal(fd.activo)
        };
        await saveContentRow('GruposWhatsApp', row, form);
        return;
      }

      if(form.id === 'contentQuickForm'){
        const formData = new FormData(form);
        const fd = Object.fromEntries(formData.entries());
        const row = {};
        const sheetName = fd.sheetName;
        if(sheetName === 'Config') {
          row.clave = fd.id;
          row.valor = fd.titulo;
          row.descripcion = fd.descripcion;
        } else {
          row.id = fd.id || autoId('REG');
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
        return;
      }

      if(form.id === 'forumSettingsForm'){
        const fd = Object.fromEntries(new FormData(form).entries());
        await apiPost(CONFIG.FORUM_API_URL, { action:'adminUpdateConfig', token:state.token, key:'comments_require_approval', value:fd.comments_require_approval }, 'FORUM_API_URL');
        setMsg('success','Ajuste del foro guardado.');
        loadForum();
        return;
      }

      if(form.id === 'userActionForm'){
        const clicked = submitter?.value;
        const fd = Object.fromEntries(new FormData(form).entries());
        if(clicked === 'setRole') await apiPost(CONFIG.USERS_API_URL, { action:'adminSetRole', token:state.token, user_id:fd.user_id, role:fd.role }, 'USERS_API_URL');
        if(clicked === 'block') await apiPost(CONFIG.USERS_API_URL, { action:'adminBlockUser', token:state.token, user_id:fd.user_id, reason:fd.reason }, 'USERS_API_URL');
        if(clicked === 'unblock') await apiPost(CONFIG.USERS_API_URL, { action:'adminUnblockUser', token:state.token, user_id:fd.user_id }, 'USERS_API_URL');
        setMsg('success','Acción aplicada al usuario.');
        loadUsers();
        return;
      }
    } catch(err) {
      setMsg('error', err.message || String(err));
    } finally {
      form.dataset.saving = 'false';
      if(submitBtn) {
        submitBtn.disabled = false;
        if(submitBtn.tagName === 'BUTTON') submitBtn.textContent = oldText || 'Guardar';
      }
    }
  }

  document.addEventListener('click', async (e)=>{
    const btn = e.target?.closest?.('[data-admin-save]');
    if(!btn) return;
    e.preventDefault();
    e.stopPropagation();
    const formId = btn.dataset.adminSave;
    const form = formId ? $('#' + formId) : btn.closest('form');
    await handleAdminForm(form, btn);
  }, true);

  document.addEventListener('submit', async (e)=>{
    e.preventDefault();
    e.stopPropagation();
    const form = e.target;
    if(!form || !ADMIN_FORMS.has(form.id)) {
      setMsg('error','Este formulario no está conectado correctamente. Actualiza admin.html y js/admin.js.');
      return false;
    }
    await handleAdminForm(form, e.submitter || document.activeElement);
    return false;
  }, true);

  window.addEventListener('scroll', () => { const p = $('#progressBar'); if(p) p.style.width = ((window.scrollY/(document.body.scrollHeight-innerHeight))*100) + '%'; });
  checkAccess().then(ok => { if(ok) loadAll(); });
})();

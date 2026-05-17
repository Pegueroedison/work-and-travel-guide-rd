/* === v42: Guardado directo independiente para Contenido === */
(function(){
  const CONFIG = window.WT_CONFIG || {};
  const CONTENT_FORMS = new Set([
    'adSimpleForm',
    'serviceSimpleForm',
    'courseSimpleForm',
    'instagramSimpleForm',
    'whatsappSimpleForm',
    'contentQuickForm'
  ]);

  const $ = (s, r=document) => r.querySelector(s);

  function msg(type, text){
    const el = $('#adminMessage');
    if(el){
      el.className = 'admin-message ' + (type || 'info');
      el.textContent = text || '';
    }
    let toast = $('#adminFloatingStatus');
    if(!toast){
      toast = document.createElement('div');
      toast.id = 'adminFloatingStatus';
      toast.className = 'admin-floating-status';
      document.body.appendChild(toast);
    }
    toast.className = 'admin-floating-status ' + (type || 'info') + ' show';
    toast.textContent = text || '';
    clearTimeout(toast._t);
    toast._t = setTimeout(()=>toast.classList.remove('show'), type === 'error' ? 7000 : 3500);
  }

  function sessionToken(){
    return localStorage.getItem('wt_session') || '';
  }

  function currentUser(){
    try { return JSON.parse(localStorage.getItem('wt_user') || 'null') || {}; }
    catch(e){ return {}; }
  }

  function bool(v){
    return ['true','1','si','sí','yes','activo','active'].includes(String(v ?? '').trim().toLowerCase());
  }

  function autoId(prefix){
    return prefix + '-' + Date.now().toString().slice(-8);
  }

  function fdObj(form){
    const fd = new FormData(form);
    const obj = {};
    for(const [k,v] of fd.entries()){
      if(v instanceof File) continue;
      obj[k] = String(v ?? '').trim();
    }
    return obj;
  }

  function requireField(form, value, name, message){
    if(String(value ?? '').trim()) return;
    const field = form.elements[name];
    if(field && field.focus) field.focus();
    throw new Error(message);
  }

  function selectedFile(form){
    return form.querySelector('input[type="file"]')?.files?.[0] || null;
  }

  function validateFile(file){
    if(!file) return;
    if(!/^image\/(png|jpe?g|webp)$/i.test(file.type)){
      throw new Error('Formato no permitido. Usa JPG, JPEG, PNG o WEBP.');
    }
    if(file.size > 3 * 1024 * 1024){
      throw new Error('La imagen no puede pasar de 3 MB.');
    }
  }

  function fileToBase64(file){
    return new Promise((resolve, reject)=>{
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || '').split(',')[1] || '');
      reader.onerror = () => reject(new Error('No se pudo leer la imagen seleccionada.'));
      reader.readAsDataURL(file);
    });
  }

  function buildPayload(formId, form){
    const fd = fdObj(form);
    const file = selectedFile(form);
    validateFile(file);

    if(formId === 'adSimpleForm'){
      const row = {
        id: fd.id || autoId('AD'),
        tipo: fd.tipo,
        titulo: fd.titulo,
        descripcion: fd.descripcion,
        enlace: fd.enlace,
        cta: fd.cta || 'Ver más',
        posicion: fd.posicion,
        orden: fd.orden ? Number(fd.orden) : 1,
        destacado: bool(fd.destacado),
        activo: bool(fd.activo),
        delay_ms: fd.tipo === 'popup' ? Number(fd.delay_ms || 2500) : 0
      };
      requireField(form, row.tipo, 'tipo', 'Debes seleccionar el tipo de anuncio.');
      requireField(form, row.posicion, 'posicion', 'Debes seleccionar la posición del anuncio.');
      requireField(form, row.titulo, 'titulo', 'El título del anuncio es obligatorio.');
      requireField(form, row.descripcion, 'descripcion', 'La descripción del anuncio es obligatoria.');
      if(!file && !String(row.enlace || '').trim()){
        throw new Error('El anuncio necesita un enlace destino o una imagen.');
      }
      return { sheetName:'Anuncios', row, folder:'Anuncios', file };
    }

    if(formId === 'serviceSimpleForm'){
      const row = {
        id: fd.id || autoId('SVC'),
        nombre: fd.nombre,
        descripcion: fd.descripcion,
        icono: fd.icono || '🧰',
        enlace: fd.enlace,
        cta: fd.cta || 'Ver más',
        orden: fd.orden ? Number(fd.orden) : 1,
        destacado: bool(fd.destacado),
        activo: bool(fd.activo)
      };
      requireField(form, row.nombre, 'nombre', 'El nombre del servicio es obligatorio.');
      requireField(form, row.descripcion, 'descripcion', 'La descripción del servicio es obligatoria.');
      if(!file && !String(row.enlace || '').trim()){
        throw new Error('El servicio necesita un enlace/contacto o una imagen.');
      }
      return { sheetName:'ServiciosJ1', row, folder:'ServiciosJ1', file };
    }

    if(formId === 'courseSimpleForm'){
      const row = {
        id: fd.id || autoId('ENG'),
        titulo: fd.titulo,
        descripcion: fd.descripcion,
        precio: fd.precio || '',
        enlace: fd.enlace || './foro.html',
        cta: fd.cta || 'Solicitar información',
        orden: fd.orden ? Number(fd.orden) : 1,
        destacado: bool(fd.destacado),
        activo: bool(fd.activo)
      };
      requireField(form, row.titulo, 'titulo', 'El título del curso es obligatorio.');
      requireField(form, row.descripcion, 'descripcion', 'La descripción del curso es obligatoria.');
      return { sheetName:'CursoIngles', row, folder:'CursoIngles', file };
    }

    if(formId === 'instagramSimpleForm'){
      const row = {
        id: fd.id || 'IG-001',
        url: fd.url,
        texto_boton: fd.texto_boton || 'Síguenos en Instagram',
        mostrar_inicio: bool(fd.mostrar_inicio),
        mostrar_footer: bool(fd.mostrar_footer),
        mostrar_comunidad: bool(fd.mostrar_comunidad),
        activo: bool(fd.activo)
      };
      if(row.activo) requireField(form, row.url, 'url', 'El enlace de Instagram es obligatorio si Instagram está activo.');
      return { sheetName:'Instagram', row, folder:'Instagram', file:null };
    }

    if(formId === 'whatsappSimpleForm'){
      const row = {
        id: fd.id || autoId('WA'),
        nombre: fd.nombre,
        estado: fd.estado || '',
        descripcion: fd.descripcion || '',
        enlace: fd.enlace,
        orden: fd.orden ? Number(fd.orden) : 1,
        destacado: bool(fd.destacado),
        principal: bool(fd.principal),
        activo: bool(fd.activo)
      };
      requireField(form, row.nombre, 'nombre', 'El nombre del grupo es obligatorio.');
      requireField(form, row.enlace, 'enlace', 'El enlace del grupo de WhatsApp es obligatorio.');
      return { sheetName:'GruposWhatsApp', row, folder:'GruposWhatsApp', file:null };
    }

    if(formId === 'contentQuickForm'){
      const sheetName = fd.sheetName || fd.hoja;
      requireField(form, sheetName, 'sheetName', 'Selecciona la hoja que quieres modificar.');
      const row = {};
      try {
        Object.assign(row, JSON.parse(fd.json || fd.payload || '{}'));
      } catch(e) {
        throw new Error('El JSON del registro avanzado no es válido.');
      }
      return { sheetName, row, folder:sheetName, file:null };
    }

    throw new Error('Formulario no reconocido: ' + formId);
  }

  async function postContent(payload){
    if(!CONFIG.CONTENT_API_URL) throw new Error('Falta CONTENT_API_URL en js/config.js.');
    const user = currentUser();
    const finalPayload = {
      ...payload,
      token: sessionToken(),
      usersApiUrl: CONFIG.USERS_API_URL || '',
      adminEmail: user.email || user.correo || '',
      adminName: user.name || user.nombre || '',
      adminRole: user.role || ''
    };
    const res = await fetch(CONFIG.CONTENT_API_URL, {
      method:'POST',
      headers:{ 'Content-Type':'text/plain;charset=utf-8' },
      body: JSON.stringify(finalPayload)
    });
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); }
    catch(e){ throw new Error('La Web App de Contenido no devolvió JSON válido: ' + text.slice(0,160)); }
    if(data.ok === false) throw new Error(data.message || 'Error al guardar.');
    return data;
  }

  async function saveDirect(formId, button){
    const form = document.getElementById(formId);
    if(!form) throw new Error('No se encontró el formulario ' + formId + '. Sube admin.html y js/admin-content-direct.js de la misma versión.');
    const oldText = button?.textContent || '';
    try{
      if(button){ button.disabled = true; button.textContent = 'Guardando...'; }
      msg('info','Validando campos con guardado directo v42...');
      const built = buildPayload(formId, form);
      const action = built.file ? 'adminSaveRowWithImage' : 'adminSaveRow';

      const payload = {
        action,
        sheetName: built.sheetName,
        row: built.row
      };

      if(built.file){
        msg('info','Leyendo imagen para subir a Drive...');
        payload.folder = built.folder;
        payload.recordId = built.row.id || built.row.clave || '';
        payload.file = {
          name: built.file.name,
          mimeType: built.file.type,
          size: built.file.size,
          base64: await fileToBase64(built.file)
        };
      }

      msg('info', built.file ? 'Subiendo imagen y guardando...' : 'Guardando en Google Sheets...');
      await postContent(payload);
      msg('success','Guardado correctamente.');
      form.reset();
      form.querySelectorAll('.admin-image-preview').forEach(box => {
        box.hidden = true;
        const img = box.querySelector('img');
        if(img) img.removeAttribute('src');
      });

      // Refresca tablas sin depender de funciones internas.
      setTimeout(()=> {
        const reload = document.getElementById('reloadContentBtn');
        if(reload) reload.click();
      }, 800);
    }catch(err){
      msg('error', err.message || String(err));
    }finally{
      if(button){ button.disabled = false; button.textContent = oldText || 'Guardar'; }
    }
  }

  function bind(){
    document.querySelectorAll('[data-admin-save]').forEach(btn => {
      const formId = btn.getAttribute('data-admin-save') || btn.closest('form')?.id || '';
      if(!CONTENT_FORMS.has(formId)) return;
      btn.type = 'button';
      btn.onclick = function(event){
        event.preventDefault();
        event.stopPropagation();
        if(event.stopImmediatePropagation) event.stopImmediatePropagation();
        saveDirect(formId, btn);
        return false;
      };
    });

    document.addEventListener('click', function(event){
      const btn = event.target.closest && event.target.closest('[data-admin-save]');
      if(!btn) return;
      const formId = btn.getAttribute('data-admin-save') || btn.closest('form')?.id || '';
      if(!CONTENT_FORMS.has(formId)) return;
      event.preventDefault();
      event.stopPropagation();
      if(event.stopImmediatePropagation) event.stopImmediatePropagation();
      saveDirect(formId, btn);
      return false;
    }, true);
  }

  bind();
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  window.addEventListener('pageshow', bind);

  window.WTContentDirectSave = saveDirect;
})();

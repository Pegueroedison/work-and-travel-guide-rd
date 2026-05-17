/* === v43: Editor visual de contenido creado === */
(function(){
  const CONFIG = window.WT_CONFIG || {};
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const escapeHtml = (v='') => String(v ?? '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  const short = (v='', n=120) => {
    const s = String(v ?? '');
    return s.length > n ? s.slice(0, n - 1) + '…' : s;
  };
  const truthy = v => ['true','1','si','sí','yes','activo','active'].includes(String(v ?? '').trim().toLowerCase());

  let contentData = null;

  function token(){ return localStorage.getItem('wt_session') || ''; }
  function user(){
    try { return JSON.parse(localStorage.getItem('wt_user') || 'null') || {}; }
    catch(e){ return {}; }
  }

  function imageUrl(row){
    const id = row.image_file_id || row.file_id || '';
    const url = row.imagen_url || row.image_url || row.photo_url || '';
    if(url) return url;
    if(id) return `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w900`;
    return '';
  }

  function contentTitle(item){
    const r = item.row || {};
    return r.titulo || r.nombre || r.texto_boton || r.title || r.id || r.clave || item.kind;
  }

  function contentDescription(item){
    const r = item.row || {};
    return r.descripcion || r.description || r.enlace || r.url || r.estado || '';
  }

  function isIncomplete(item){
    const r = item.row || {};
    if(item.sheet === 'Anuncios') return !r.titulo || !r.descripcion || (!r.enlace && !r.imagen_url && !r.image_file_id);
    if(item.sheet === 'ServiciosJ1') return !r.nombre || !r.descripcion || (!r.enlace && !r.imagen_url && !r.image_file_id);
    if(item.sheet === 'CursoIngles') return !r.titulo || !r.descripcion;
    if(item.sheet === 'GruposWhatsApp') return !r.nombre || !r.enlace;
    if(item.sheet === 'Instagram') return truthy(r.activo) && !r.url;
    return false;
  }

  function collections(){
    const c = contentData || {};
    return [
      ...((c.Anuncios?.rows || c.Anuncios || []).map(row => ({ kind:'Anuncio', sheet:'Anuncios', form:'adSimpleForm', mode:'ad', row }))),
      ...((c.ServiciosJ1?.rows || c.ServiciosJ1 || []).map(row => ({ kind:'Servicio J1', sheet:'ServiciosJ1', form:'serviceSimpleForm', mode:'service', row }))),
      ...((c.CursoIngles?.rows || c.CursoIngles || []).map(row => ({ kind:'Curso de inglés', sheet:'CursoIngles', form:'courseSimpleForm', mode:'course', row }))),
      ...((c.GruposWhatsApp?.rows || c.GruposWhatsApp || []).map(row => ({ kind:'Grupo WhatsApp', sheet:'GruposWhatsApp', form:'whatsappSimpleForm', mode:'community', row }))),
      ...((c.Instagram?.rows || c.Instagram || []).map(row => ({ kind:'Instagram', sheet:'Instagram', form:'instagramSimpleForm', mode:'community', row })))
    ];
  }

  async function api(payload){
    if(!CONFIG.CONTENT_API_URL) throw new Error('Falta CONTENT_API_URL en js/config.js.');
    const u = user();
    const body = {
      ...payload,
      token: token(),
      usersApiUrl: CONFIG.USERS_API_URL || '',
      adminEmail: u.email || u.correo || '',
      adminName: u.name || u.nombre || '',
      adminRole: u.role || ''
    };
    const res = await fetch(CONFIG.CONTENT_API_URL, {
      method:'POST',
      headers:{'Content-Type':'text/plain;charset=utf-8'},
      body: JSON.stringify(body)
    });
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); }
    catch(e){ throw new Error('La Web App de Contenido no devolvió JSON válido: ' + text.slice(0,160)); }
    if(data.ok === false) throw new Error(data.message || 'Error al cargar contenido.');
    return data;
  }

  function setContentMode(mode){
    $$('.content-mode-btn').forEach(b => b.classList.toggle('active', b.dataset.contentMode === mode));
    $$('.content-editor-card').forEach(card => card.classList.toggle('active', card.dataset.contentEditor === mode));
  }

  function fillForm(item){
    const form = document.getElementById(item.form);
    if(!form) return alert('No se encontró el formulario para editar.');
    setContentMode(item.mode);

    const row = item.row || {};
    Object.entries(row).forEach(([key, value]) => {
      const field = form.elements[key];
      if(!field || field.type === 'file') return;
      if(field.tagName === 'SELECT') {
        const val = String(value ?? '');
        const opt = Array.from(field.options).find(o => String(o.value).toLowerCase() === val.toLowerCase() || String(o.textContent).toLowerCase() === val.toLowerCase());
        field.value = opt ? opt.value : val;
      } else {
        field.value = value ?? '';
      }
    });

    // Normaliza campos booleanos para selects TRUE/FALSE.
    ['activo','destacado','principal','mostrar_inicio','mostrar_footer','mostrar_comunidad'].forEach(name => {
      const field = form.elements[name];
      if(field && field.tagName === 'SELECT') field.value = truthy(row[name]) ? 'TRUE' : 'FALSE';
    });

    const img = imageUrl(row);
    const preview = form.querySelector('.admin-image-preview');
    if(preview) {
      const tag = preview.querySelector('img');
      if(img && tag) {
        tag.src = img;
        preview.hidden = false;
      } else {
        preview.hidden = true;
      }
    }

    form.scrollIntoView({ behavior:'smooth', block:'start' });
    const msg = document.getElementById('adminMessage');
    if(msg){
      msg.className = 'admin-message info';
      msg.textContent = `Editando ${item.kind}: ${contentTitle(item)}. Modifica los datos y presiona guardar.`;
    }
  }

  function render(){
    const wrap = $('#contentEditCards');
    if(!wrap) return;

    const q = ($('#contentEditSearch')?.value || '').toLowerCase().trim();
    const type = $('#contentEditType')?.value || 'all';
    const status = $('#contentEditStatus')?.value || 'all';

    let items = collections();

    items = items.filter(item => {
      const r = item.row || {};
      const active = truthy(r.activo ?? r.active);
      const featured = truthy(r.destacado ?? r.featured);
      if(type !== 'all' && item.sheet !== type) return false;
      if(status === 'active' && !active) return false;
      if(status === 'inactive' && active) return false;
      if(status === 'featured' && !featured) return false;
      if(status === 'incomplete' && !isIncomplete(item)) return false;
      if(q) {
        const text = `${item.kind} ${item.sheet} ${JSON.stringify(r)}`.toLowerCase();
        if(!text.includes(q)) return false;
      }
      return true;
    });

    if(!items.length) {
      wrap.innerHTML = '<div class="empty-state">No hay contenido con ese filtro.</div>';
      return;
    }

    wrap.innerHTML = items.map((item, index) => {
      const r = item.row || {};
      const img = imageUrl(r);
      const active = r.activo ?? r.active ?? '';
      const featured = r.destacado ?? r.featured ?? '';
      return `
        <article class="content-edit-item ${isIncomplete(item) ? 'incomplete' : ''}">
          <div class="content-edit-preview">
            ${img ? `<img src="${escapeHtml(img)}" alt="${escapeHtml(contentTitle(item))}" loading="lazy">` : `<span>${item.sheet === 'Anuncios' ? '📢' : item.sheet === 'CursoIngles' ? '📚' : item.sheet === 'ServiciosJ1' ? '🧰' : '💬'}</span>`}
          </div>
          <div class="content-edit-body">
            <div class="content-edit-meta">
              <span>${escapeHtml(item.kind)}</span>
              ${active !== '' ? `<span class="status-pill ${escapeHtml(String(active).toLowerCase())}">${escapeHtml(active)}</span>` : ''}
              ${featured !== '' ? `<span class="status-pill destacado">Destacado: ${escapeHtml(featured)}</span>` : ''}
            </div>
            <h4>${escapeHtml(short(contentTitle(item), 80))}</h4>
            <p>${escapeHtml(short(contentDescription(item), 150))}</p>
            ${isIncomplete(item) ? '<small class="content-edit-warning">Pendiente/incompleto: revisa campos obligatorios.</small>' : ''}
            <div class="mini-actions">
              <button class="mini-btn approve" type="button" data-edit-index="${index}">Editar</button>
              ${img ? `<a class="mini-btn" href="${escapeHtml(img)}" target="_blank" rel="noopener noreferrer">Vista previa</a>` : ''}
            </div>
          </div>
        </article>
      `;
    }).join('');

    // Guarda el array filtrado actual para poder editar por índice.
    wrap._currentItems = items;
  }

  async function load(){
    const wrap = $('#contentEditCards');
    if(wrap) wrap.innerHTML = '<div class="empty-state">Cargando contenido creado...</div>';
    try {
      const data = await api({ action:'adminListAll' });
      contentData = data.data || data;
      render();
    } catch(err) {
      if(wrap) wrap.innerHTML = `<div class="empty-state">${escapeHtml(err.message || String(err))}</div>`;
    }
  }

  document.addEventListener('click', e => {
    if(e.target?.id === 'reloadContentEditBtn') load();
    const editBtn = e.target?.closest?.('[data-edit-index]');
    if(editBtn) {
      const wrap = $('#contentEditCards');
      const item = wrap?._currentItems?.[Number(editBtn.dataset.editIndex)];
      if(item) fillForm(item);
    }
  });

  document.addEventListener('input', e => {
    if(e.target?.id === 'contentEditSearch') render();
  });

  document.addEventListener('change', e => {
    if(['contentEditType','contentEditStatus'].includes(e.target?.id)) render();
  });

  // Cargar después de que el panel termine de abrir.
  setTimeout(load, 1200);
})();

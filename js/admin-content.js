/* === Admin Content Clean — Supabase === */
(function(){
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const escapeHtml = (v='') => String(v ?? '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  const truthy = v => ['true','1','si','sí','yes','activo','active', true].includes(String(v ?? '').trim().toLowerCase());

  let cache = {
    announcements: [],
    services_j1: [],
    english_courses: [],
    whatsapp_groups: [],
    instagram_config: null
  };

  function msg(type, text) {
    const el = $('#adminMessage');
    if(el) {
      el.className = 'admin-message ' + (type || 'info');
      el.textContent = text || '';
    }
  }

  function renderSupabaseAdminLogin(reason='') {
    const wrap = $('#contentEditCards');
    if(!wrap) return;
    wrap.innerHTML = `
      <div class="supabase-admin-login">
        <h3>Conectar admin de Supabase</h3>
        <p>${escapeHtml(reason || 'Para editar contenido creado necesitas una sesión real de Supabase.')}</p>
        <label>Correo electrónico
          <input id="supabaseAdminEmail" type="email" value="edisonpeguero61@gmail.com" autocomplete="email">
        </label>
        <label>Contraseña
          <input id="supabaseAdminPassword" type="password" autocomplete="current-password">
        </label>
        <div class="mini-actions">
          <button class="mini-btn approve" type="button" id="supabaseAdminLoginBtn">Iniciar sesión Supabase</button>
          <button class="mini-btn" type="button" id="supabaseAdminWhoBtn">Ver estado</button>
        </div>
        <small>Esto es aparte del login viejo de Google Sheets. La migración limpia necesita Supabase Auth.</small>
      </div>
    `;
  }

  async function supabaseAdminLogin() {
    try {
      const email = ($('#supabaseAdminEmail')?.value || '').trim();
      const password = ($('#supabaseAdminPassword')?.value || '').trim();
      if(!email) throw new Error('Escribe el correo.');
      if(!password) throw new Error('Escribe la contraseña.');
      const { error } = await window.WTDB.client().auth.signInWithPassword({ email, password });
      if(error) throw error;
      msg('success','Sesión Supabase iniciada. Cargando contenido...');
      await loadAdminContent();
    } catch(err) {
      msg('error', err.message || String(err));
      renderSupabaseAdminLogin(err.message || String(err));
    }
  }

  async function showSupabaseAdminStatus() {
    try {
      const user = await window.WTDB.getUser();
      const profile = await window.WTDB.getProfile();
      msg('info', user ? `Supabase conectado: ${user.email}. Rol: ${profile?.role || 'sin perfil'}. Estado: ${profile?.status || 'sin estado'}.` : 'No hay sesión activa de Supabase.');
    } catch(err) {
      msg('error', err.message || String(err));
    }
  }

  async function requireAdmin() {
    if(!window.WTDB || !window.WTDB.enabled()) throw new Error('Supabase no está activo.');
    const user = await window.WTDB.getUser();
    if(!user) throw new Error('Debes iniciar sesión en Supabase como admin o superadmin.');
    const profile = await window.WTDB.getProfile();
    if(!profile || !['admin','superadmin'].includes(profile.role) || profile.status !== 'active') {
      throw new Error('Tu usuario de Supabase no tiene rol admin/superadmin. Ejecuta el SQL 002 con tu correo.');
    }
    return user;
  }

  function fdObj(form) {
    const fd = new FormData(form);
    const obj = {};
    for(const [k,v] of fd.entries()) {
      if(v instanceof File) continue;
      obj[k] = String(v ?? '').trim();
    }
    return obj;
  }

  function requireField(form, value, name, message) {
    if(String(value ?? '').trim()) return;
    const field = form.elements[name];
    if(field?.focus) field.focus();
    throw new Error(message);
  }

  function fileOf(form) {
    return form.querySelector('input[type="file"]')?.files?.[0] || null;
  }

  function validateImage(file) {
    if(!file) return;
    if(!/^image\/(png|jpe?g|webp)$/i.test(file.type)) throw new Error('Formato no permitido. Usa JPG, JPEG, PNG o WEBP.');
    if(file.size > 3 * 1024 * 1024) throw new Error('La imagen no puede pasar de 3 MB.');
  }

  function autoLegacy(prefix) {
    return prefix + '-' + Date.now().toString().slice(-8);
  }

  async function uploadImage(file, folder) {
    if(!file) return { url:null, path:null };
    validateImage(file);

    const safe = file.name.replace(/[^\w.\-]+/g, '_');
    const path = `${folder}/${Date.now()}-${safe}`;
    const db = window.WTDB.client();
    const bucket = window.WTDB.config.BUCKET_CONTENT_IMAGES || 'content-images';

    const { error } = await db.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type
      });

    if(error) throw error;

    const { data } = db.storage.from(bucket).getPublicUrl(path);
    return { url:data.publicUrl, path };
  }

  function normalizeBooleanSelects(form, row) {
    ['activo','destacado','principal','mostrar_inicio','mostrar_footer','mostrar_comunidad'].forEach(name => {
      const field = form.elements[name];
      if(field && field.tagName === 'SELECT') field.value = truthy(row[name] ?? row[mapFieldToDb(name)]) ? 'TRUE' : 'FALSE';
    });
  }

  function mapFieldToDb(name) {
    return {
      activo:'active',
      destacado:'featured',
      principal:'main_group',
      mostrar_inicio:'show_home',
      mostrar_footer:'show_footer',
      mostrar_comunidad:'show_community'
    }[name] || name;
  }

  function setMode(mode) {
    $$('.content-mode-btn').forEach(b => b.classList.toggle('active', b.dataset.contentMode === mode));
    $$('.content-editor-card').forEach(card => card.classList.toggle('active', card.dataset.contentEditor === mode));
  }

  function clearPreview(form) {
    form.querySelectorAll('.admin-image-preview').forEach(box => {
      box.hidden = true;
      const img = box.querySelector('img');
      if(img) img.removeAttribute('src');
    });
  }

  async function saveAnnouncement(form) {
    const user = await requireAdmin();
    const fd = fdObj(form);
    const file = fileOf(form);

    requireField(form, fd.tipo, 'tipo', 'Debes seleccionar el tipo de anuncio.');
    requireField(form, fd.posicion, 'posicion', 'Debes seleccionar la posición del anuncio.');
    requireField(form, fd.titulo, 'titulo', 'El título del anuncio es obligatorio.');
    requireField(form, fd.descripcion, 'descripcion', 'La descripción del anuncio es obligatoria.');
    if(!file && !fd.enlace && !fd.imagen_url) throw new Error('El anuncio necesita un enlace destino o una imagen.');

    const image = await uploadImage(file, 'announcements');
    const payload = {
      legacy_id: fd.id || autoLegacy('AD'),
      type: fd.tipo,
      position: fd.posicion,
      title: fd.titulo,
      description: fd.descripcion,
      image_url: image.url || fd.imagen_url || null,
      image_path: image.path || null,
      image_position: fd.image_position || 'center',
      image_fit: fd.image_fit || 'cover',
      link_url: fd.enlace || null,
      cta: fd.cta || 'Ver más',
      sort_order: Number(fd.orden || 1),
      featured: truthy(fd.destacado),
      active: truthy(fd.activo),
      delay_ms: Number(fd.delay_ms || 2500),
      created_by: user.id
    };

    const { error } = await window.WTDB.client().from('announcements').upsert(payload, { onConflict:'legacy_id' });
    if(error) throw error;
  }

  async function saveService(form) {
    const user = await requireAdmin();
    const fd = fdObj(form);
    const file = fileOf(form);

    requireField(form, fd.nombre, 'nombre', 'El nombre del servicio es obligatorio.');
    requireField(form, fd.descripcion, 'descripcion', 'La descripción del servicio es obligatoria.');

    const image = await uploadImage(file, 'services');
    const payload = {
      legacy_id: fd.id || autoLegacy('SVC'),
      name: fd.nombre,
      description: fd.descripcion,
      icon: fd.icono || '🧰',
      image_url: image.url || null,
      image_path: image.path || null,
      image_position: fd.image_position || 'center',
      image_fit: fd.image_fit || 'cover',
      link_url: fd.enlace || null,
      cta: fd.cta || 'Ver más',
      sort_order: Number(fd.orden || 1),
      featured: truthy(fd.destacado),
      active: truthy(fd.activo),
      created_by: user.id
    };

    const { error } = await window.WTDB.client().from('services_j1').upsert(payload, { onConflict:'legacy_id' });
    if(error) throw error;
  }

  async function saveCourse(form) {
    const user = await requireAdmin();
    const fd = fdObj(form);
    const file = fileOf(form);

    requireField(form, fd.titulo, 'titulo', 'El título del curso es obligatorio.');
    requireField(form, fd.descripcion, 'descripcion', 'La descripción del curso es obligatoria.');

    const image = await uploadImage(file, 'courses');
    const payload = {
      legacy_id: fd.id || autoLegacy('ENG'),
      title: fd.titulo,
      description: fd.descripcion,
      price: fd.precio || '',
      image_url: image.url || null,
      image_path: image.path || null,
      image_position: fd.image_position || 'center',
      image_fit: fd.image_fit || 'cover',
      link_url: fd.enlace || './foro.html',
      cta: fd.cta || 'Solicitar información',
      sort_order: Number(fd.orden || 1),
      featured: truthy(fd.destacado),
      active: truthy(fd.activo),
      created_by: user.id
    };

    const { error } = await window.WTDB.client().from('english_courses').upsert(payload, { onConflict:'legacy_id' });
    if(error) throw error;
  }

  async function saveWhatsApp(form) {
    const user = await requireAdmin();
    const fd = fdObj(form);

    requireField(form, fd.nombre, 'nombre', 'El nombre del grupo es obligatorio.');
    requireField(form, fd.enlace, 'enlace', 'El enlace del grupo de WhatsApp es obligatorio.');

    const payload = {
      legacy_id: fd.id || autoLegacy('WA'),
      name: fd.nombre,
      state: fd.estado || '',
      description: fd.descripcion || '',
      link_url: fd.enlace,
      sort_order: Number(fd.orden || 1),
      featured: truthy(fd.destacado),
      main_group: truthy(fd.principal),
      active: truthy(fd.activo),
      created_by: user.id
    };

    const { error } = await window.WTDB.client().from('whatsapp_groups').upsert(payload, { onConflict:'legacy_id' });
    if(error) throw error;
  }

  async function saveInstagram(form) {
    await requireAdmin();
    const fd = fdObj(form);

    const payload = {
      id: 1,
      url: fd.url || '',
      button_text: fd.texto_boton || 'Síguenos en Instagram',
      show_home: truthy(fd.mostrar_inicio),
      show_footer: truthy(fd.mostrar_footer),
      show_community: truthy(fd.mostrar_comunidad),
      active: truthy(fd.activo)
    };

    if(payload.active && !payload.url) throw new Error('El enlace de Instagram es obligatorio si Instagram está activo.');

    const { error } = await window.WTDB.client().from('instagram_config').upsert(payload, { onConflict:'id' });
    if(error) throw error;
  }

  async function saveForm(formId, button) {
    const form = document.getElementById(formId);
    if(!form) return msg('error', 'No se encontró el formulario.');
    const old = button?.textContent || 'Guardar';
    try {
      if(button) { button.disabled = true; button.textContent = 'Guardando...'; }
      msg('info', 'Guardando en Supabase...');

      if(formId === 'adSimpleForm') await saveAnnouncement(form);
      else if(formId === 'serviceSimpleForm') await saveService(form);
      else if(formId === 'courseSimpleForm') await saveCourse(form);
      else if(formId === 'whatsappSimpleForm') await saveWhatsApp(form);
      else if(formId === 'instagramSimpleForm') await saveInstagram(form);
      else throw new Error('Formulario no reconocido para Supabase Clean.');

      msg('success', 'Guardado correctamente en Supabase.');
      form.reset();
      clearPreview(form);
      await loadAdminContent();
    } catch(err) {
      msg('error', err.message || String(err));
    } finally {
      if(button) { button.disabled = false; button.textContent = old; }
    }
  }

  async function loadAdminContent() {
    if(!window.WTDB?.enabled()) return;
    try {
      await requireAdmin();
      const db = window.WTDB.client();

      const [ads, services, courses, groups, instagram] = await Promise.all([
        db.from('announcements').select('*').order('created_at', { ascending:false }),
        db.from('services_j1').select('*').order('created_at', { ascending:false }),
        db.from('english_courses').select('*').order('created_at', { ascending:false }),
        db.from('whatsapp_groups').select('*').order('created_at', { ascending:false }),
        db.from('instagram_config').select('*').eq('id',1).maybeSingle()
      ]);

      [ads, services, courses, groups, instagram].forEach(res => { if(res.error) throw res.error; });

      cache = {
        announcements: ads.data || [],
        services_j1: services.data || [],
        english_courses: courses.data || [],
        whatsapp_groups: groups.data || [],
        instagram_config: instagram.data || null
      };

      $('#countAds') && ($('#countAds').textContent = cache.announcements.length);
      $('#countServices') && ($('#countServices').textContent = cache.services_j1.length + cache.english_courses.length);

      renderEditorCards();
    } catch(err) {
      const message = err.message || String(err);
      if(message.includes('iniciar sesión') || message.includes('rol admin') || message.includes('superadmin')) {
        renderSupabaseAdminLogin(message);
      } else {
        const box = $('#contentEditCards') || $('#tableAnuncios');
        if(box) box.innerHTML = `<div class="empty-state">${escapeHtml(message)}</div>`;
      }
    }
  }

  function collections() {
    return [
      ...cache.announcements.map(row => ({ kind:'Anuncio', table:'announcements', form:'adSimpleForm', mode:'ad', row })),
      ...cache.services_j1.map(row => ({ kind:'Servicio J1', table:'services_j1', form:'serviceSimpleForm', mode:'service', row })),
      ...cache.english_courses.map(row => ({ kind:'Curso de inglés', table:'english_courses', form:'courseSimpleForm', mode:'course', row })),
      ...cache.whatsapp_groups.map(row => ({ kind:'Grupo WhatsApp', table:'whatsapp_groups', form:'whatsappSimpleForm', mode:'community', row })),
      ...(cache.instagram_config ? [{ kind:'Instagram', table:'instagram_config', form:'instagramSimpleForm', mode:'community', row: cache.instagram_config }] : [])
    ];
  }

  function titleOf(item) {
    const r = item.row;
    return r.title || r.name || r.button_text || r.legacy_id || r.id || item.kind;
  }

  function descOf(item) {
    const r = item.row;
    return r.description || r.link_url || r.url || r.state || '';
  }

  function incomplete(item) {
    const r = item.row;
    if(item.table === 'announcements') return !r.title || !r.description || (!r.link_url && !r.image_url);
    if(item.table === 'services_j1') return !r.name || !r.description;
    if(item.table === 'english_courses') return !r.title || !r.description;
    if(item.table === 'whatsapp_groups') return !r.name || !r.link_url;
    if(item.table === 'instagram_config') return r.active && !r.url;
    return false;
  }

  function renderEditorCards() {
    const wrap = $('#contentEditCards');
    if(!wrap) return;

    const q = ($('#contentEditSearch')?.value || '').toLowerCase().trim();
    const type = $('#contentEditType')?.value || 'all';
    const status = $('#contentEditStatus')?.value || 'all';

    let items = collections();

    items = items.filter(item => {
      const r = item.row;
      const active = !!r.active;
      const featured = !!r.featured;
      if(type !== 'all') {
        const map = {
          Anuncios:'announcements',
          ServiciosJ1:'services_j1',
          CursoIngles:'english_courses',
          GruposWhatsApp:'whatsapp_groups',
          Instagram:'instagram_config'
        };
        if(item.table !== map[type]) return false;
      }
      if(status === 'active' && !active) return false;
      if(status === 'inactive' && active) return false;
      if(status === 'featured' && !featured) return false;
      if(status === 'incomplete' && !incomplete(item)) return false;
      if(q && !(`${item.kind} ${JSON.stringify(r)}`.toLowerCase().includes(q))) return false;
      return true;
    });

    if(!items.length) {
      wrap.innerHTML = '<div class="empty-state">No hay contenido con ese filtro.</div>';
      return;
    }

    wrap.innerHTML = items.map((item, index) => {
      const r = item.row;
      const img = r.image_url || '';
      return `<article class="content-edit-item ${incomplete(item) ? 'incomplete' : ''}">
        <div class="content-edit-preview">${img ? `<img src="${escapeHtml(img)}" alt="${escapeHtml(titleOf(item))}" loading="lazy">` : `<span>${item.table === 'announcements' ? '📢' : item.table === 'english_courses' ? '📚' : item.table === 'services_j1' ? '🧰' : '💬'}</span>`}</div>
        <div class="content-edit-body">
          <div class="content-edit-meta">
            <span>${escapeHtml(item.kind)}</span>
            <span class="status-pill ${r.active ? 'true' : 'false'}">${r.active ? 'Activo' : 'Inactivo'}</span>
            ${r.featured ? '<span class="status-pill destacado">Destacado</span>' : ''}
          </div>
          <h4>${escapeHtml(titleOf(item))}</h4>
          <p>${escapeHtml(descOf(item))}</p>
          ${incomplete(item) ? '<small class="content-edit-warning">Pendiente/incompleto</small>' : ''}
          <div class="mini-actions">
            <button class="mini-btn approve" type="button" data-edit-content="${index}">Editar</button>
            ${img ? `<a class="mini-btn" href="${escapeHtml(img)}" target="_blank" rel="noopener noreferrer">Vista previa</a>` : ''}
          </div>
        </div>
      </article>`;
    }).join('');

    wrap._items = items;
  }

  function fillForm(item) {
    const form = document.getElementById(item.form);
    if(!form) return;

    setMode(item.mode);
    const r = item.row;

    const map = {
      id: r.legacy_id || '',
      tipo: r.type,
      posicion: r.position,
      titulo: r.title,
      nombre: r.name,
      descripcion: r.description,
      precio: r.price,
      icono: r.icon,
      enlace: r.link_url,
      url: r.url,
      texto_boton: r.button_text,
      cta: r.cta,
      orden: r.sort_order,
      activo: r.active ? 'TRUE' : 'FALSE',
      destacado: r.featured ? 'TRUE' : 'FALSE',
      principal: r.main_group ? 'TRUE' : 'FALSE',
      mostrar_inicio: r.show_home ? 'TRUE' : 'FALSE',
      mostrar_footer: r.show_footer ? 'TRUE' : 'FALSE',
      mostrar_comunidad: r.show_community ? 'TRUE' : 'FALSE',
      image_position: r.image_position || 'center',
      image_fit: r.image_fit || 'cover'
    };

    Object.entries(map).forEach(([name, value]) => {
      const field = form.elements[name];
      if(field) field.value = value ?? '';
    });

    const preview = form.querySelector('.admin-image-preview');
    if(preview) {
      const img = preview.querySelector('img');
      if(r.image_url && img) {
        img.src = r.image_url;
        preview.hidden = false;
      } else {
        preview.hidden = true;
      }
    }

    form.scrollIntoView({ behavior:'smooth', block:'start' });
    msg('info', `Editando ${item.kind}: ${titleOf(item)}. Modifica y presiona guardar.`);
  }

  function bind() {
    document.querySelectorAll('[data-admin-save]').forEach(btn => {
      const formId = btn.dataset.adminSave || btn.closest('form')?.id;
      if(!['adSimpleForm','serviceSimpleForm','courseSimpleForm','instagramSimpleForm','whatsappSimpleForm'].includes(formId)) return;
      btn.type = 'button';
      btn.onclick = event => {
        event.preventDefault();
        event.stopPropagation();
        saveForm(formId, btn);
        return false;
      };
    });
  }

  document.addEventListener('click', event => {
    if(event.target?.id === 'supabaseAdminLoginBtn') {
      supabaseAdminLogin();
      return;
    }
    if(event.target?.id === 'supabaseAdminWhoBtn') {
      showSupabaseAdminStatus();
      return;
    }

    const edit = event.target.closest && event.target.closest('[data-edit-content]');
    if(edit) {
      const wrap = $('#contentEditCards');
      const item = wrap?._items?.[Number(edit.dataset.editContent)];
      if(item) fillForm(item);
    }

    if(event.target?.id === 'reloadContentEditBtn' || event.target?.id === 'reloadContentBtn') {
      loadAdminContent();
    }

    if(event.target?.classList?.contains('content-mode-btn')) {
      setMode(event.target.dataset.contentMode);
    }
  }, true);

  document.addEventListener('input', event => {
    if(event.target?.id === 'contentEditSearch') renderEditorCards();
  });

  document.addEventListener('change', event => {
    if(['contentEditType','contentEditStatus'].includes(event.target?.id)) renderEditorCards();

    if(event.target?.matches?.('.content-image-input')) {
      const file = event.target.files?.[0];
      const preview = document.getElementById(event.target.dataset.preview || '');
      const img = preview?.querySelector('img');
      if(!file || !preview || !img) return;
      try {
        validateImage(file);
        img.src = URL.createObjectURL(file);
        preview.hidden = false;
        msg('info', 'Imagen lista. Presiona guardar para subirla a Supabase Storage.');
      } catch(err) {
        event.target.value = '';
        preview.hidden = true;
        msg('error', err.message);
      }
    }
  });

  window.WTAdminContentClean = {
    loadAdminContent,
    saveForm
  };

  bind();
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  setTimeout(loadAdminContent, 900);
})();

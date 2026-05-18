/* === Admin Forum Clean — Supabase v59 === */
(function(){
  const $ = (s, r=document) => r.querySelector(s);
  const escapeHtml = (v='') => String(v ?? '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  let rawItems = [];
  let profile = null;

  async function requireAdmin(){
    if(!window.WTDB?.enabled()) throw new Error('Supabase no está activo.');
    const user = await window.WTDB.getUser();
    if(!user) throw new Error('Debes iniciar sesión en Supabase como admin/superadmin.');
    profile = await window.WTDB.getProfile();
    if(!profile || !['admin','superadmin'].includes(profile.role) || profile.status !== 'active') {
      throw new Error('Tu usuario de Supabase no tiene rol admin/superadmin.');
    }
  }

  function rdDate(v){
    if(!v) return '';
    return new Intl.DateTimeFormat('es-DO', { timeZone:'America/Santo_Domingo', dateStyle:'medium', timeStyle:'short' }).format(new Date(v));
  }

  function statusLabel(status){
    const map = { pending:'Pendiente de aprobación', approved:'Aprobado', rejected:'Rechazado', deleted:'Eliminado', open:'Abierto', reviewed:'Revisado', dismissed:'Descartado' };
    return map[String(status || '').toLowerCase()] || status || '';
  }

  async function loadSettings(){
    const sel = $('#commentsRequireApproval');
    if(!sel) return;
    const { data } = await window.WTDB.client().from('site_settings').select('value').eq('key','forum_require_approval').maybeSingle();
    sel.value = data?.value === 'true' ? 'TRUE' : 'FALSE';
  }

  async function saveSettings(){
    await requireAdmin();
    const value = $('#commentsRequireApproval')?.value === 'TRUE' ? 'true' : 'false';
    const { error } = await window.WTDB.client().from('site_settings').upsert({
      key:'forum_require_approval',
      value,
      description:'Si es true, toda publicación y comentario queda pendiente.',
      is_public:false
    }, { onConflict:'key' });
    if(error) throw error;
    const msg = value === 'true' ? 'Moderación activada: todo quedará pendiente.' : 'Moderación automática activada: solo spam/enlaces queda pendiente.';
    alert(msg);
    const helper = document.querySelector('.admin-setting-help');
    if(helper) helper.innerHTML = value === 'true'
      ? 'Ajuste guardado en Supabase: toda publicación y comentario nuevo quedará en <strong>pendiente</strong>.'
      : 'Ajuste guardado en Supabase: se aprueba automáticamente, excepto spam/enlaces/teléfonos/correos.';
  }

  async function load(){
    const wrap = $('#forumReviewCards');
    if(!wrap) return;
    try {
      await requireAdmin();
      await loadSettings();
      wrap.innerHTML = '<div class="empty-state">Cargando moderación desde Supabase...</div>';
      const db = window.WTDB.client();

      const [posts, comments, reports] = await Promise.all([
        db.from('forum_posts').select('*, author:user_profiles!forum_posts_author_id_fkey(full_name,email,role)').order('created_at', { ascending:true }).limit(200),
        db.from('forum_comments').select('*, author:user_profiles!forum_comments_author_id_fkey(full_name,email,role), post:forum_posts(title)').order('created_at', { ascending:true }).limit(200),
        db.from('forum_reports').select('*').order('created_at', { ascending:true }).limit(200)
      ]);
      [posts, comments, reports].forEach(r => { if(r.error) throw r.error; });

      rawItems = [
        ...(posts.data || []).map(row => ({ type:'post', row })),
        ...(comments.data || []).map(row => ({ type:'comment', row })),
        ...(reports.data || []).map(row => ({ type:'report', row }))
      ];
      render();
    } catch(err) {
      wrap.innerHTML = `<div class="empty-state">${escapeHtml(err.message || err)}</div>`;
    }
  }

  function passesFilter(item){
    const status = $('#forumReviewStatus')?.value || 'pending';
    const type = $('#forumReviewType')?.value || 'all';
    const q = ($('#forumReviewSearch')?.value || '').toLowerCase().trim();
    const r = item.row;

    if(type !== 'all' && item.type !== type) return false;

    if(status === 'pending' && !(item.type !== 'report' && r.status === 'pending')) return false;
    if(status === 'reports' && !(item.type === 'report' && r.status === 'open')) return false;
    if(status === 'open_queue' && !(r.status === 'pending' || r.status === 'open')) return false;
    if(status === 'approved' && !(item.type !== 'report' && r.status === 'approved')) return false;
    if(status === 'rejected' && !(item.type !== 'report' && r.status === 'rejected')) return false;

    if(q) {
      const hay = JSON.stringify(r).toLowerCase();
      if(!hay.includes(q)) return false;
    }
    return true;
  }

  function render(){
    const wrap = $('#forumReviewCards');
    if(!wrap) return;

    const sort = $('#forumReviewSort')?.value || 'oldest';
    let items = rawItems.filter(passesFilter);
    items.sort((a,b) => {
      const da = new Date(a.row.created_at || 0).getTime();
      const db = new Date(b.row.created_at || 0).getTime();
      return sort === 'newest' ? db - da : da - db;
    });

    if(!items.length) {
      wrap.innerHTML = '<div class="empty-state">No hay elementos con ese filtro.</div>';
      return;
    }

    wrap.innerHTML = items.map((it, idx) => {
      const r = it.row;
      const realIndex = rawItems.indexOf(it);
      const title = it.type === 'comment' ? `Respuesta en: ${r.post?.title || r.post_id}` : it.type === 'report' ? `Reporte: ${r.target_type}` : r.title;
      const body = it.type === 'report' ? r.reason : r.body;
      const author = r.author?.full_name || r.author?.email || r.reporter_id || 'Usuario';
      const link = it.type === 'comment' ? `./post.html?id=${encodeURIComponent(r.post_id)}` : it.type === 'post' ? `./post.html?id=${encodeURIComponent(r.id)}` : '#';
      return `<article class="forum-review-item ${escapeHtml(r.status || 'open')}">
        <div class="forum-review-top">
          <span class="forum-type">${escapeHtml(it.type === 'post' ? 'Publicación' : it.type === 'comment' ? 'Respuesta' : 'Reporte')}</span>
          <span class="status-pill ${escapeHtml(r.status || 'open')}">${escapeHtml(statusLabel(r.status || 'open'))}</span>
        </div>
        <h4>${escapeHtml(title || '')}</h4>
        <p class="forum-review-body">${escapeHtml(body || '')}</p>
        <div class="forum-review-meta"><span>Autor: <strong>${escapeHtml(author)}</strong></span><span>${escapeHtml(rdDate(r.created_at))}</span></div>
        ${r.moderation_reason ? `<div class="forum-review-reason"><strong>Motivo:</strong> ${escapeHtml(r.moderation_reason)}</div>` : ''}
        <div class="mini-actions">
          ${link !== '#' ? `<a class="mini-btn" href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">Vista previa</a>` : ''}
          ${it.type !== 'report' ? `<button class="mini-btn approve" data-forum-action="approved" data-index="${realIndex}">Aprobar</button>
          <button class="mini-btn reject" data-forum-action="rejected" data-index="${realIndex}">Rechazar y borrar</button>
          <button class="mini-btn delete" data-forum-action="deleted" data-index="${realIndex}">Eliminar definitivo</button>` : `<button class="mini-btn approve" data-forum-action="reviewed" data-index="${realIndex}">Marcar revisado</button>`}
        </div>
      </article>`;
    }).join('');
  }

  async function moderate(index, action){
    await requireAdmin();
    const item = rawItems[Number(index)];
    if(!item) return;
    const db = window.WTDB.client();

    if(item.type === 'post') {
      if(action === 'approved') {
        const { error } = await db.from('forum_posts').update({ status: 'approved', moderation_reason: null }).eq('id', item.row.id);
        if(error) throw error;
      } else {
        if(!confirm('Esta publicación se borrará definitivamente de la base de datos. ¿Continuar?')) return;
        const { error } = await db.from('forum_posts').delete().eq('id', item.row.id);
        if(error) throw error;
      }
    } else if(item.type === 'comment') {
      if(action === 'approved') {
        const { error } = await db.from('forum_comments').update({ status: 'approved', moderation_reason: null }).eq('id', item.row.id);
        if(error) throw error;
      } else {
        if(!confirm('Esta respuesta se borrará definitivamente de la base de datos. ¿Continuar?')) return;
        const { error } = await db.from('forum_comments').delete().eq('id', item.row.id);
        if(error) throw error;
      }
    } else if(item.type === 'report') {
      const { error } = await db.from('forum_reports').update({ status:'reviewed', reviewed_at:new Date().toISOString(), reviewed_by: profile?.id || null }).eq('id', item.row.id);
      if(error) throw error;
    }
    await load();
  }

  document.addEventListener('click', async e => {
    try {
      const btn = e.target.closest?.('[data-forum-action]');
      if(btn) return await moderate(btn.dataset.index, btn.dataset.forumAction);

      if(e.target?.id === 'reloadForumBtn') return await load();

      if(e.target?.closest?.('[data-admin-save="forumSettingsForm"]') || e.target?.closest?.('#forumSettingsForm button')) {
        e.preventDefault();
        e.stopPropagation();
        if(e.stopImmediatePropagation) e.stopImmediatePropagation();
        await saveSettings();
        await load();
        return false;
      }
    } catch(err) {
      alert(err.message || String(err));
    }
  }, true);

  ['forumReviewSearch','forumReviewStatus','forumReviewType','forumReviewSort'].forEach(id => {
    document.addEventListener(id === 'forumReviewSearch' ? 'input' : 'change', e => {
      if(e.target?.id === id) render();
    });
  });

  window.addEventListener('wt:supabase-login', load);
  setTimeout(load, 900);
  window.WTAdminForumClean = { load };
})();

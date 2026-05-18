/* === Admin Forum Clean — Supabase === */
(function(){
  const $ = (s, r=document) => r.querySelector(s);
  const escapeHtml = (v='') => String(v ?? '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));

  let items = [];

  async function requireAdmin(){
    if(!window.WTDB?.enabled()) throw new Error('Supabase no está activo.');
    const ok = await window.WTDB.isAdmin();
    if(!ok) throw new Error('Debes iniciar sesión en Supabase como admin/superadmin.');
  }

  function rdDate(v){
    if(!v) return '';
    return new Intl.DateTimeFormat('es-DO', { timeZone:'America/Santo_Domingo', dateStyle:'medium', timeStyle:'short' }).format(new Date(v));
  }

  async function load(){
    const wrap = $('#forumReviewCards');
    if(!wrap) return;
    try {
      await requireAdmin();
      wrap.innerHTML = '<div class="empty-state">Cargando moderación desde Supabase...</div>';
      const db = window.WTDB.client();

      const [posts, comments, reports] = await Promise.all([
        db.from('forum_posts').select('*, author:user_profiles!forum_posts_author_id_fkey(full_name,email,role)').neq('status','approved').order('created_at', { ascending:true }),
        db.from('forum_comments').select('*, author:user_profiles!forum_comments_author_id_fkey(full_name,email,role), post:forum_posts(title)').neq('status','approved').order('created_at', { ascending:true }),
        db.from('forum_reports').select('*').eq('status','open').order('created_at', { ascending:true })
      ]);

      [posts, comments, reports].forEach(r => { if(r.error) throw r.error; });

      items = [
        ...(posts.data || []).map(row => ({ type:'post', row })),
        ...(comments.data || []).map(row => ({ type:'comment', row })),
        ...(reports.data || []).map(row => ({ type:'report', row }))
      ];
      render();
    } catch(err) {
      wrap.innerHTML = `<div class="empty-state">${escapeHtml(err.message || err)}</div>`;
    }
  }

  function render(){
    const wrap = $('#forumReviewCards');
    if(!wrap) return;

    if(!items.length) {
      wrap.innerHTML = '<div class="empty-state">No hay pendientes ni reportes abiertos en Supabase.</div>';
      return;
    }

    wrap.innerHTML = items.map((it, idx) => {
      const r = it.row;
      const title = it.type === 'comment' ? `Respuesta en: ${r.post?.title || r.post_id}` : it.type === 'report' ? `Reporte: ${r.target_type}` : r.title;
      const body = it.type === 'report' ? r.reason : r.body;
      const author = r.author?.full_name || r.author?.email || r.reporter_id || 'Usuario';
      const link = it.type === 'comment' ? `./post.html?id=${encodeURIComponent(r.post_id)}` : it.type === 'post' ? `./post.html?id=${encodeURIComponent(r.id)}` : '#';
      return `<article class="forum-review-item ${escapeHtml(r.status || 'open')}">
        <div class="forum-review-top">
          <span class="forum-type">${escapeHtml(it.type === 'post' ? 'Publicación' : it.type === 'comment' ? 'Respuesta' : 'Reporte')}</span>
          <span class="status-pill ${escapeHtml(r.status || 'open')}">${escapeHtml(r.status || 'open')}</span>
        </div>
        <h4>${escapeHtml(title || '')}</h4>
        <p class="forum-review-body">${escapeHtml(body || '')}</p>
        <div class="forum-review-meta"><span>Autor: <strong>${escapeHtml(author)}</strong></span><span>${escapeHtml(rdDate(r.created_at))}</span></div>
        ${r.moderation_reason ? `<div class="forum-review-reason"><strong>Motivo:</strong> ${escapeHtml(r.moderation_reason)}</div>` : ''}
        <div class="mini-actions">
          ${link !== '#' ? `<a class="mini-btn" href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">Vista previa</a>` : ''}
          ${it.type !== 'report' ? `<button class="mini-btn approve" data-forum-action="approved" data-index="${idx}">Aprobar</button>
          <button class="mini-btn reject" data-forum-action="rejected" data-index="${idx}">Rechazar</button>
          <button class="mini-btn delete" data-forum-action="deleted" data-index="${idx}">Eliminar</button>` : `<button class="mini-btn approve" data-forum-action="reviewed" data-index="${idx}">Marcar revisado</button>`}
        </div>
      </article>`;
    }).join('');
  }

  async function moderate(index, action){
    await requireAdmin();
    const item = items[Number(index)];
    if(!item) return;
    const db = window.WTDB.client();

    if(item.type === 'post') {
      const { error } = await db.from('forum_posts').update({ status: action, moderation_reason: action === 'approved' ? null : 'Revisado por admin' }).eq('id', item.row.id);
      if(error) throw error;
    } else if(item.type === 'comment') {
      const { error } = await db.from('forum_comments').update({ status: action, moderation_reason: action === 'approved' ? null : 'Revisado por admin' }).eq('id', item.row.id);
      if(error) throw error;
    } else if(item.type === 'report') {
      const { error } = await db.from('forum_reports').update({ status:'reviewed', reviewed_at:new Date().toISOString() }).eq('id', item.row.id);
      if(error) throw error;
    }
    await load();
  }

  document.addEventListener('click', async e => {
    const btn = e.target.closest?.('[data-forum-action]');
    if(!btn) return;
    try {
      await moderate(btn.dataset.index, btn.dataset.forumAction);
    } catch(err) {
      alert(err.message || String(err));
    }
  });

  setTimeout(load, 1300);
  window.WTAdminForumClean = { load };
})();

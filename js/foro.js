/* === FORO DE ESTUDIANTES — página separada === */
(function(){
  const CONFIG = window.WT_CONFIG || {};
  const $ = (s, r=document) => r.querySelector(s);
  const escapeHtml = (v='') => String(v).replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  const state = { token: localStorage.getItem('wt_session') || '', user: JSON.parse(localStorage.getItem('wt_user') || 'null') };

  const driveThumbUrl = fileId => fileId ? `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w400` : '';
  const avatarUrl = obj => obj?.author_photo_url || driveThumbUrl(obj?.author_photo_file_id) || obj?.photo_url || driveThumbUrl(obj?.photo_file_id) || './images/logo.png';
  const safeDate = value => {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('es-DO', { day:'2-digit', month:'short', year:'numeric' });
  };
  const normalizeRole = role => String(role || '').trim().toLowerCase();
  const roleLabel = role => {
    const r = normalizeRole(role);
    if (r === 'superadmin') return 'Super Admin';
    if (r === 'admin') return 'Admin';
    if (r === 'moderator') return 'Moderador';
    return '';
  };
  const roleBadge = role => {
    const label = roleLabel(role);
    return label ? `<span class="forum-role-badge ${escapeHtml(normalizeRole(role))}">${escapeHtml(label)}</span>` : '';
  };
  const statusBadge = status => status && status !== 'approved' ? `<span class="status-badge ${escapeHtml(status)}">${escapeHtml(status)}</span>` : '';

  function apiUrl(baseUrl, params={}) { const url = new URL(baseUrl); Object.entries(params).forEach(([k,v])=>url.searchParams.set(k,v)); return url.toString(); }
  async function apiGet(baseUrl, params={}) { if(!baseUrl) throw new Error('Falta configurar FORUM_API_URL en js/config.js.'); const res = await fetch(apiUrl(baseUrl, params)); const data = await res.json(); if(data.ok===false) throw new Error(data.message || 'Error'); return data; }
  async function apiPost(baseUrl, payload={}) { if(!baseUrl) throw new Error('Falta configurar FORUM_API_URL en js/config.js.'); const res = await fetch(baseUrl,{ method:'POST', headers:{'Content-Type':'text/plain;charset=utf-8'}, body:JSON.stringify(payload)}); const data = await res.json(); if(data.ok===false) throw new Error(data.message || 'Error'); return data; }
  function formDataObj(form){ return Object.fromEntries(new FormData(form).entries()); }

  function updateAuthUI(){
    const logged = Boolean(state.token && state.user);
    $('#loginRequiredBox')?.classList.toggle('show', !logged);
    $('#forumLoginBtn') && ($('#forumLoginBtn').style.display = logged ? 'none' : 'inline-flex');
    $('#forumRegisterBtn') && ($('#forumRegisterBtn').style.display = logged ? 'none' : 'inline-flex');
    $('#forumLoginTop') && ($('#forumLoginTop').style.display = logged ? 'none' : 'inline-flex');
    $('#forumRegisterTop') && ($('#forumRegisterTop').style.display = logged ? 'none' : 'inline-flex');
    $('#forumProfileTop') && ($('#forumProfileTop').style.display = logged ? 'inline-flex' : 'none');
    $('#forumLogoutBtn') && ($('#forumLogoutBtn').style.display = logged ? 'inline-flex' : 'none');
    const adminAllowed = logged && ['admin','superadmin'].includes(normalizeRole(state.user?.role));
    ['#adminNavLink','#adminMobileLink','#forumAdminTop'].forEach(sel => { const el = $(sel); if(el) el.style.display = adminAllowed ? 'inline-flex' : 'none'; });
    $('#forumUserText') && ($('#forumUserText').innerHTML = logged ? `${escapeHtml(state.user.name || 'Usuario')} ${roleBadge(state.user.role)}` : 'No has iniciado sesión.');
    const photo = $('#forumUserPhoto');
    if (photo) {
      photo.src = logged ? avatarUrl(state.user) : './images/logo.png';
      photo.onerror = () => { photo.src = './images/logo.png'; };
    }
  }
  function requireLogin(){ if(!state.token){ window.location.href = './login.html?redirect=foro.html'; return false; } return true; }

  async function loadPosts(){
    const wrap = $('#forumPosts'); if(!wrap) return;
    try{
      const data = await apiGet(CONFIG.FORUM_API_URL, { action:'listPosts' });
      const posts = data?.data?.posts || data?.posts || [];
      wrap.innerHTML = posts.length ? posts.map(renderPost).join('') : '<div class="empty-state">Todavía no hay publicaciones aprobadas.</div>';
      wrap.querySelectorAll('img[data-fallback]').forEach(img => { img.onerror = () => { img.src = './images/logo.png'; }; });
      if (posts.length && !posts.some(p => Array.isArray(p.comments))) loadCommentsForVisiblePosts();
    }catch(err){ wrap.innerHTML = `<div class="empty-state">${escapeHtml(err.message)}</div>`; }
  }

  async function loadCommentsForVisiblePosts(){
    const postEls = Array.from(document.querySelectorAll('.forum-post[data-post-id]'));
    await Promise.all(postEls.map(async postEl => {
      const list = postEl.querySelector('.comment-list');
      if(!list) return;
      try{
        const data = await apiGet(CONFIG.FORUM_API_URL, { action:'listComments', post_id:postEl.dataset.postId });
        const comments = data?.data?.comments || data?.comments || [];
        list.innerHTML = comments.length ? comments.map(renderComment).join('') : '';
      }catch(err){ list.innerHTML = ''; }
    }));
  }

  function renderAuthorLine(item, type='post'){
    const name = item.author_name || item.autor || 'Estudiante';
    const category = item.category || item.categoria || 'General';
    const date = safeDate(item.created_at);
    return `<div class="forum-author ${type === 'comment' ? 'comment-author' : ''}">
      <img src="${escapeHtml(avatarUrl(item))}" alt="Foto de ${escapeHtml(name)}" loading="lazy" data-fallback="1" />
      <div class="forum-author-info">
        <div class="forum-author-name">${escapeHtml(name)} ${roleBadge(item.author_role || item.role)}</div>
        <div class="forum-author-meta">
          ${type === 'post' ? `<span class="forum-category-badge">${escapeHtml(category)}</span>` : ''}
          ${date ? `<span>${escapeHtml(date)}</span>` : ''}
          ${statusBadge(item.status || 'approved')}
        </div>
      </div>
    </div>`;
  }

  function renderPost(post){
    const comments = Array.isArray(post.comments) ? post.comments : [];
    return `<article class="forum-post" data-post-id="${escapeHtml(post.id || '')}">
      ${renderAuthorLine(post, 'post')}
      <h4>${escapeHtml(post.title || post.titulo || 'Publicación')}</h4>
      <p>${escapeHtml(post.body || post.contenido || '')}</p>
      <div class="forum-actions"><button type="button" class="reply-btn">Responder</button><button type="button" class="report-btn">Reportar</button></div>
      <form class="comment-box"><textarea name="body" rows="3" maxlength="900" required placeholder="Escribe tu respuesta..."></textarea><button class="btn btn-primary btn-sm" type="submit">Enviar respuesta</button></form>
      <div class="comment-list" data-comments-for="${escapeHtml(post.id || '')}">${comments.map(renderComment).join('')}</div>
    </article>`;
  }

  function renderComment(comment){
    return `<article class="comment-item" data-comment-id="${escapeHtml(comment.id || '')}">
      ${renderAuthorLine(comment, 'comment')}
      <p>${escapeHtml(comment.body || comment.contenido || '')}</p>
      <button type="button" class="comment-report-btn">Reportar respuesta</button>
    </article>`;
  }

  document.addEventListener('click', async (e)=>{
    if(e.target?.id === 'refreshForumBtn') loadPosts();
    if(e.target?.id === 'forumLogoutBtn'){ localStorage.removeItem('wt_session'); localStorage.removeItem('wt_user'); state.token=''; state.user=null; updateAuthUI(); }
    if(e.target?.classList?.contains('reply-btn')){ if(!requireLogin()) return; e.target.closest('.forum-post').querySelector('.comment-box').classList.toggle('active'); }
    if(e.target?.classList?.contains('report-btn')){ if(!requireLogin()) return; const post = e.target.closest('.forum-post'); try{ await apiPost(CONFIG.FORUM_API_URL,{ action:'reportPost', token:state.token, post_id:post.dataset.postId, reason:'Reporte desde foro.html'}); window.WTNotify?.toast('Reporte enviado a moderación.', 'success', { title: 'Reporte enviado' }); }catch(err){ window.WTNotify?.toast(err.message, 'error'); } }
    if(e.target?.classList?.contains('comment-report-btn')){ if(!requireLogin()) return; const comment = e.target.closest('.comment-item'); try{ await apiPost(CONFIG.FORUM_API_URL,{ action:'reportComment', token:state.token, comment_id:comment.dataset.commentId, reason:'Reporte de respuesta desde foro.html'}); window.WTNotify?.toast('Respuesta reportada a moderación.', 'success', { title: 'Reporte enviado' }); }catch(err){ window.WTNotify?.toast(err.message, 'error'); } }
  });
  document.addEventListener('submit', async (e)=>{
    const form = e.target;
    if(form.id === 'forumPostForm'){
      e.preventDefault(); if(!requireLogin()) return;
      try{ await apiPost(CONFIG.FORUM_API_URL,{ action:'createPost', token:state.token, ...formDataObj(form) }); form.reset(); window.WTNotify?.toast('Publicación enviada. Si requiere moderación, aparecerá después de aprobarse.', 'success', { title: 'Publicación enviada' }); loadPosts(); }catch(err){ window.WTNotify?.toast(err.message, 'error'); }
    }
    if(form.classList.contains('comment-box')){
      e.preventDefault(); if(!requireLogin()) return;
      const post = form.closest('.forum-post');
      try{ await apiPost(CONFIG.FORUM_API_URL,{ action:'createComment', token:state.token, post_id:post.dataset.postId, ...formDataObj(form) }); form.reset(); form.classList.remove('active'); window.WTNotify?.toast('Respuesta enviada. Puede pasar a moderación.', 'success', { title: 'Respuesta enviada' }); loadPosts(); }catch(err){ window.WTNotify?.toast(err.message, 'error'); }
    }
  });
  window.addEventListener('scroll', () => { const p = $('#progressBar'); if(p) p.style.width = ((window.scrollY/(document.body.scrollHeight-innerHeight))*100) + '%'; });
  updateAuthUI(); loadPosts();
})();

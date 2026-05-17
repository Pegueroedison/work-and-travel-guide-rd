/* === FORO DE ESTUDIANTES v24 — lista, publicación individual, likes y notificaciones === */
(function(){
  const CONFIG = window.WT_CONFIG || {};
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const escapeHtml = (v='') => String(v).replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  const state = { token: localStorage.getItem('wt_session') || '', user: JSON.parse(localStorage.getItem('wt_user') || 'null'), notifications: [] };
  const rdDate = (value) => {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('es-DO', { timeZone:'America/Santo_Domingo', day:'2-digit', month:'short', year:'numeric', hour:'numeric', minute:'2-digit', hour12:true }).format(d);
  };
  const driveThumbUrl = fileId => fileId ? `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w400` : '';
  const currentUserPhoto = () => state.user?.photo_url || driveThumbUrl(state.user?.photo_file_id) || '';
  const sameAsCurrentUser = obj => {
    if (!state.user || !obj) return false;
    const itemUserId = String(obj.author_id || obj.user_id || '').trim();
    const itemEmail = String(obj.author_email || obj.email || '').trim().toLowerCase();
    return (itemUserId && itemUserId === String(state.user.id || '').trim()) || (itemEmail && itemEmail === String(state.user.email || '').trim().toLowerCase());
  };
  const avatarUrl = obj => obj?.author_photo_url || driveThumbUrl(obj?.author_photo_file_id) || obj?.photo_url || driveThumbUrl(obj?.photo_file_id) || (sameAsCurrentUser(obj) ? currentUserPhoto() : '') || './images/logo.png';
  const normalizeRole = role => String(role || '').trim().toLowerCase();
  const roleLabel = role => ({ superadmin:'Super Admin', admin:'Admin', moderator:'Moderador' }[normalizeRole(role)] || '');
  const roleBadge = role => roleLabel(role) ? `<span class="forum-role-badge ${escapeHtml(normalizeRole(role))}">${escapeHtml(roleLabel(role))}</span>` : '';
  const statusBadge = status => status && String(status).toLowerCase() !== 'approved' ? `<span class="status-badge ${escapeHtml(status)}">${escapeHtml(status)}</span>` : '';
  function apiUrl(baseUrl, params={}) { const url = new URL(baseUrl); Object.entries(params).forEach(([k,v])=>{ if(v!==undefined && v!==null && v!=='') url.searchParams.set(k,v); }); return url.toString(); }
  async function apiGet(baseUrl, params={}) { if(!baseUrl) throw new Error('Falta configurar FORUM_API_URL en js/config.js.'); const res = await fetch(apiUrl(baseUrl, params)); const data = await res.json(); if(data.ok===false) throw new Error(data.message || 'Error'); return data; }
  async function apiPost(baseUrl, payload={}) { if(!baseUrl) throw new Error('Falta configurar FORUM_API_URL en js/config.js.'); const res = await fetch(baseUrl,{ method:'POST', headers:{'Content-Type':'text/plain;charset=utf-8'}, body:JSON.stringify(payload)}); const data = await res.json(); if(data.ok===false) throw new Error(data.message || 'Error'); return data; }
  const formDataObj = form => Object.fromEntries(new FormData(form).entries());
  function toast(msg,type='success',title='') { window.WTNotify?.toast(msg,type,{title:title || (type==='error'?'Error':'Listo')}) || alert(msg); }
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
    const photo = $('#forumUserPhoto'); if(photo){ photo.src = logged ? avatarUrl(state.user) : './images/logo.png'; photo.onerror = () => { photo.src = './images/logo.png'; }; }
    $('#notifBell') && ($('#notifBell').style.display = logged ? 'inline-flex' : 'none');
  }
  function requireLogin(){ if(!state.token){ window.location.href = './login.html?redirect=' + encodeURIComponent(location.pathname.split('/').pop() + location.search); return false; } return true; }
  function authorLine(item, type='post'){
    const name = item.author_name || item.autor || 'Estudiante';
    const category = item.category || item.categoria || 'General';
    const date = rdDate(item.created_at);
    return `<div class="forum-author ${type==='comment'?'comment-author':''}">
      <img src="${escapeHtml(avatarUrl(item))}" alt="Foto de ${escapeHtml(name)}" loading="lazy" data-fallback="1" />
      <div class="forum-author-info">
        <div class="forum-author-name">${escapeHtml(name)} ${roleBadge(item.author_role || item.role)}</div>
        <div class="forum-author-meta">${type==='post'?`<span class="forum-category-badge">${escapeHtml(category)}</span>`:''}${date?`<span>${escapeHtml(date)}</span>`:''}${statusBadge(item.status || 'approved')}</div>
      </div>
    </div>`;
  }
  function metaExtras(post){
    const fields = [
      ['Plaza', post.employer], ['Estado', post.state], ['Ciudad', post.city], ['Posición', post.position], ['Sponsor', post.sponsor],
      ['Precio', post.price], ['Tipo', post.housing_type], ['Estado visa', post.visa_status], ['Entrevista', post.interview_date]
    ].filter(([,v]) => String(v||'').trim());
    return fields.length ? `<div class="post-extra-tags">${fields.map(([k,v])=>`<span><strong>${escapeHtml(k)}:</strong> ${escapeHtml(v)}</span>`).join('')}</div>` : '';
  }
  function renderPostCard(post){
    const id = post.id || '';
    const excerpt = String(post.body || post.contenido || '').slice(0, 220);
    return `<article class="forum-post post-card" data-post-id="${escapeHtml(id)}">
      ${authorLine(post,'post')}
      <h4><a href="./post.html?id=${encodeURIComponent(id)}">${escapeHtml(post.title || post.titulo || 'Publicación')}</a></h4>
      ${metaExtras(post)}
      <p>${escapeHtml(excerpt)}${String(post.body||'').length>220?'...':''}</p>
      <div class="post-stats">
        <button type="button" class="like-btn ${post.liked_by_me?'liked':''}" data-id="${escapeHtml(id)}">❤️ <span>${Number(post.likes_count||0)}</span></button>
        <a class="comment-count" href="./post.html?id=${encodeURIComponent(id)}">💬 ${Number(post.comments_count||0)} respuestas</a>
      </div>
      <div class="forum-actions">
        <a class="reply-btn link-btn" href="./post.html?id=${encodeURIComponent(id)}#responder">Ver publicación</a>
        <button type="button" class="report-btn">Reportar</button>
      </div>
    </article>`;
  }
  async function loadPosts(){
    const wrap = $('#forumPosts'); if(!wrap) return;
    wrap.innerHTML = '<div class="empty-state">Cargando publicaciones...</div>';
    try{
      const params = { action:'listPosts', token:state.token || '', q:$('#forumSearch')?.value || '', category:$('#forumCategoryFilter')?.value || '', sort:$('#forumSort')?.value || 'recent' };
      const data = await apiGet(CONFIG.FORUM_API_URL, params);
      const posts = data?.data?.posts || data?.posts || [];
      wrap.innerHTML = posts.length ? posts.map(renderPostCard).join('') : '<div class="empty-state">No hay publicaciones aprobadas con ese filtro.</div>';
      wrap.querySelectorAll('img[data-fallback]').forEach(img => { img.onerror = () => { img.src = './images/logo.png'; }; });
    }catch(err){ wrap.innerHTML = `<div class="empty-state">${escapeHtml(err.message)}</div>`; }
  }
  function renderComment(c){
    return `<article class="comment-item" data-comment-id="${escapeHtml(c.id||'')}">${authorLine(c,'comment')}<p>${escapeHtml(c.body||c.contenido||'')}</p><div class="comment-actions"><button type="button" class="comment-report-btn">Reportar respuesta</button></div></article>`;
  }
  async function loadSinglePost(){
    const root = $('#singlePost'); if(!root) return;
    const id = new URLSearchParams(location.search).get('id');
    if(!id){ root.innerHTML = '<div class="empty-state">Falta el ID de la publicación.</div>'; return; }
    try{
      const data = await apiGet(CONFIG.FORUM_API_URL, { action:'getPost', id, token:state.token || '' });
      const post = data.data?.post || data.post;
      const comments = data.data?.comments || data.comments || [];
      root.innerHTML = `<article class="forum-post post-detail" data-post-id="${escapeHtml(post.id||'')}">
        ${authorLine(post,'post')}
        <h2>${escapeHtml(post.title || 'Publicación')}</h2>
        ${metaExtras(post)}
        <p>${escapeHtml(post.body || '')}</p>
        <div class="post-stats"><button type="button" class="like-btn ${post.liked_by_me?'liked':''}" data-id="${escapeHtml(post.id||'')}">❤️ <span>${Number(post.likes_count||0)}</span></button><span>💬 ${comments.length} respuestas</span></div>
        <button type="button" class="report-btn">Reportar publicación</button>
      </article>
      <section class="forum-feed comments-section"><h3>Respuestas</h3><div id="postComments">${comments.length?comments.map(renderComment).join(''):'<div class="empty-state">Todavía no hay respuestas.</div>'}</div></section>`;
      root.querySelectorAll('img[data-fallback]').forEach(img => { img.onerror = () => { img.src = './images/logo.png'; }; });
    }catch(err){ root.innerHTML = `<div class="empty-state">${escapeHtml(err.message)}</div>`; }
  }
  async function loadNotifications(){
    if(!state.token) return;
    try{
      const data = await apiGet(CONFIG.FORUM_API_URL,{ action:'listNotifications', token:state.token });
      state.notifications = data.data?.notifications || data.notifications || [];
      const unread = state.notifications.filter(n => String(n.read_at||'')==='').length;
      $('#notifCount') && ($('#notifCount').textContent = unread ? String(unread) : '');
    }catch(e){}
  }
  function openNotifications(){
    const panel = $('#notifPanel'); if(!panel) return;
    panel.classList.toggle('open');
    panel.innerHTML = state.notifications.length ? state.notifications.map(n => `<a class="notif-item ${n.read_at?'':'unread'}" href="./post.html?id=${encodeURIComponent(n.post_id||'')}"><strong>${escapeHtml(n.title||'Notificación')}</strong><span>${escapeHtml(n.message||'')}</span><small>${escapeHtml(rdDate(n.created_at))}</small></a>`).join('') : '<div class="notif-empty">No tienes notificaciones.</div>';
  }
  function toggleExtraFields(){
    const cat = $('#postCategory')?.value || '';
    $$('.category-extra').forEach(el => el.hidden = true);
    if(cat === 'Trabajo') $('#extraTrabajo') && ($('#extraTrabajo').hidden = false);
    if(cat === 'Housing') $('#extraHousing') && ($('#extraHousing').hidden = false);
    if(cat === 'Visa') $('#extraVisa') && ($('#extraVisa').hidden = false);
  }
  document.addEventListener('click', async e => {
    if(e.target?.id === 'refreshForumBtn') loadPosts();
    if(e.target?.id === 'notifBell') { e.preventDefault(); openNotifications(); }
    if(e.target?.id === 'forumLogoutBtn'){ localStorage.removeItem('wt_session'); localStorage.removeItem('wt_user'); state.token=''; state.user=null; updateAuthUI(); loadPosts(); }
    if(e.target?.classList?.contains('report-btn')){ if(!requireLogin()) return; const post=e.target.closest('.forum-post'); try{ await apiPost(CONFIG.FORUM_API_URL,{ action:'reportPost', token:state.token, post_id:post.dataset.postId, reason:'Reporte desde foro'}); toast('Reporte enviado a moderación.'); }catch(err){ toast(err.message,'error'); } }
    if(e.target?.classList?.contains('comment-report-btn')){ if(!requireLogin()) return; const c=e.target.closest('.comment-item'); try{ await apiPost(CONFIG.FORUM_API_URL,{ action:'reportComment', token:state.token, comment_id:c.dataset.commentId, reason:'Reporte de respuesta'}); toast('Respuesta reportada a moderación.'); }catch(err){ toast(err.message,'error'); } }
    if(e.target?.classList?.contains('like-btn')){ if(!requireLogin()) return; const btn=e.target.closest('.like-btn'); try{ const r=await apiPost(CONFIG.FORUM_API_URL,{ action:'toggleLike', token:state.token, post_id:btn.dataset.id }); btn.classList.toggle('liked', Boolean(r.liked)); const span=btn.querySelector('span'); if(span) span.textContent=String(r.likes_count||0); }catch(err){ toast(err.message,'error'); } }
  });
  document.addEventListener('submit', async e => {
    const form=e.target;
    if(form.id === 'forumPostForm'){
      e.preventDefault(); if(!requireLogin()) return;
      try{ await apiPost(CONFIG.FORUM_API_URL,{ action:'createPost', token:state.token, ...formDataObj(form) }); form.reset(); toggleExtraFields(); toast('Publicación enviada. Si requiere aprobación, aparecerá después de moderarse.'); loadPosts(); }catch(err){ toast(err.message,'error'); }
    }
    if(form.id === 'singleCommentForm'){
      e.preventDefault(); if(!requireLogin()) return;
      const id = new URLSearchParams(location.search).get('id');
      try{ await apiPost(CONFIG.FORUM_API_URL,{ action:'createComment', token:state.token, post_id:id, ...formDataObj(form) }); form.reset(); toast('Respuesta enviada. Puede requerir aprobación.'); loadSinglePost(); }catch(err){ toast(err.message,'error'); }
    }
  });
  $('#postCategory')?.addEventListener('change', toggleExtraFields);
  ['#forumSearch','#forumCategoryFilter','#forumSort'].forEach(sel => $(sel)?.addEventListener('change', loadPosts));
  $('#forumSearch')?.addEventListener('input', () => { clearTimeout(window.__forumSearchTimer); window.__forumSearchTimer=setTimeout(loadPosts,350); });
  window.addEventListener('scroll', () => { const p=$('#progressBar'); if(p) p.style.width=((window.scrollY/(document.body.scrollHeight-innerHeight))*100)+'%'; });
  updateAuthUI(); toggleExtraFields(); loadNotifications(); loadPosts(); loadSinglePost();
})();

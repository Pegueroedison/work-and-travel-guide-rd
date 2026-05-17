/* === FORO DE ESTUDIANTES — página separada === */
(function(){
  const CONFIG = window.WT_CONFIG || {};
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const escapeHtml = (v='') => String(v).replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  const state = { token: localStorage.getItem('wt_session') || '', user: JSON.parse(localStorage.getItem('wt_user') || 'null') };

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
    const adminAllowed = logged && ['admin','superadmin'].includes(String(state.user?.role || '').toLowerCase());
    ['#adminNavLink','#adminMobileLink','#forumAdminTop'].forEach(sel => { const el = $(sel); if(el) el.style.display = adminAllowed ? 'inline-flex' : 'none'; });
    $('#forumUserText') && ($('#forumUserText').textContent = logged ? `${state.user.name || 'Usuario'} · ${state.user.role || 'user'}` : 'No has iniciado sesión.');
    if (logged && state.user.photo_url && $('#forumUserPhoto')) $('#forumUserPhoto').src = state.user.photo_url;
  }
  function requireLogin(){ if(!state.token){ window.location.href = './login.html?redirect=foro.html'; return false; } return true; }

  async function loadPosts(){
    const wrap = $('#forumPosts'); if(!wrap) return;
    try{
      const data = await apiGet(CONFIG.FORUM_API_URL, { action:'listPosts' });
      const posts = data?.data?.posts || data?.posts || [];
      wrap.innerHTML = posts.length ? posts.map(renderPost).join('') : '<div class="empty-state">Todavía no hay publicaciones aprobadas.</div>';
    }catch(err){ wrap.innerHTML = `<div class="empty-state">${escapeHtml(err.message)}</div>`; }
  }
  function renderPost(post){
    const status = post.status || 'approved';
    return `<article class="forum-post" data-post-id="${escapeHtml(post.id || '')}">
      <h4>${escapeHtml(post.title || post.titulo || 'Publicación')}</h4>
      <div class="forum-meta"><span>${escapeHtml(post.category || post.categoria || 'General')}</span><span>por ${escapeHtml(post.author_name || post.autor || 'Estudiante')}</span><span class="status-badge ${escapeHtml(status)}">${escapeHtml(status)}</span></div>
      <p>${escapeHtml(post.body || post.contenido || '')}</p>
      <div class="forum-actions"><button type="button" class="reply-btn">Responder</button><button type="button" class="report-btn">Reportar</button></div>
      <form class="comment-box"><textarea name="body" rows="3" maxlength="900" required placeholder="Escribe tu respuesta..."></textarea><button class="btn btn-primary btn-sm" type="submit">Enviar respuesta</button></form>
      <div class="comment-list" data-comments-for="${escapeHtml(post.id || '')}"></div>
    </article>`;
  }

  document.addEventListener('click', async (e)=>{
    if(e.target?.id === 'refreshForumBtn') loadPosts();
    if(e.target?.id === 'forumLogoutBtn'){ localStorage.removeItem('wt_session'); localStorage.removeItem('wt_user'); state.token=''; state.user=null; updateAuthUI(); }
    if(e.target?.classList?.contains('reply-btn')){ if(!requireLogin()) return; e.target.closest('.forum-post').querySelector('.comment-box').classList.toggle('active'); }
    if(e.target?.classList?.contains('report-btn')){ if(!requireLogin()) return; const post = e.target.closest('.forum-post'); try{ await apiPost(CONFIG.FORUM_API_URL,{ action:'reportPost', token:state.token, post_id:post.dataset.postId, reason:'Reporte desde foro.html'}); alert('Reporte enviado a moderación.'); }catch(err){ alert(err.message); } }
  });
  document.addEventListener('submit', async (e)=>{
    const form = e.target;
    if(form.id === 'forumPostForm'){
      e.preventDefault(); if(!requireLogin()) return;
      try{ await apiPost(CONFIG.FORUM_API_URL,{ action:'createPost', token:state.token, ...formDataObj(form) }); form.reset(); alert('Publicación enviada. Si requiere moderación, aparecerá después de aprobarse.'); loadPosts(); }catch(err){ alert(err.message); }
    }
    if(form.classList.contains('comment-box')){
      e.preventDefault(); if(!requireLogin()) return;
      const post = form.closest('.forum-post');
      try{ await apiPost(CONFIG.FORUM_API_URL,{ action:'createComment', token:state.token, post_id:post.dataset.postId, ...formDataObj(form) }); form.reset(); form.classList.remove('active'); alert('Respuesta enviada. Puede pasar a moderación.'); }catch(err){ alert(err.message); }
    }
  });
  window.addEventListener('scroll', () => { const p = $('#progressBar'); if(p) p.style.width = ((window.scrollY/(document.body.scrollHeight-innerHeight))*100) + '%'; });
  updateAuthUI(); loadPosts();
})();

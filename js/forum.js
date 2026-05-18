/* === Forum Clean — Supabase === */
(function(){
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const escapeHtml = (v='') => String(v ?? '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  const formDataObj = form => Object.fromEntries(new FormData(form).entries());

  const state = {
    user:null,
    profile:null,
    posts:[],
    offset:0,
    limit:10,
    hasMore:false,
    notifications:[]
  };

  function db(){ return window.WTDB.client(); }

  function rdDate(value){
    if(!value) return '';
    return new Intl.DateTimeFormat('es-DO', {
      timeZone:'America/Santo_Domingo',
      day:'2-digit',
      month:'short',
      year:'numeric',
      hour:'numeric',
      minute:'2-digit'
    }).format(new Date(value));
  }

  function photo(profile){
    return profile?.photo_url || './images/logo.png';
  }

  async function loadSession(){
    if(!window.WTDB?.enabled()) return;
    state.user = await window.WTDB.getUser();
    state.profile = await window.WTDB.getProfile();
    updateAuthUI();
  }

  function updateAuthUI(){
    const logged = !!state.user;
    $('#forumUserPhoto') && ($('#forumUserPhoto').src = logged ? photo(state.profile) : './images/logo.png');
    $('#forumUserText') && ($('#forumUserText').textContent = logged ? `${state.profile?.full_name || state.user.email} (${state.profile?.role || 'user'})` : 'No has iniciado sesión en Supabase.');
    $('#forumLoginBtn') && ($('#forumLoginBtn').style.display = logged ? 'none' : 'inline-flex');
    $('#forumRegisterBtn') && ($('#forumRegisterBtn').style.display = logged ? 'none' : 'inline-flex');
    $('#forumLogoutBtn') && ($('#forumLogoutBtn').style.display = logged ? 'inline-flex' : 'none');
    $('#forumProfileTop') && ($('#forumProfileTop').style.display = logged ? 'inline-flex' : 'none');
    $('#forumLoginTop') && ($('#forumLoginTop').style.display = logged ? 'none' : 'inline-flex');
    $('#forumRegisterTop') && ($('#forumRegisterTop').style.display = logged ? 'none' : 'inline-flex');
    $('#notifBell') && ($('#notifBell').style.display = logged ? 'inline-flex' : 'none');

    const box = $('#loginRequiredBox');
    if(box && !logged) {
      box.innerHTML = `<strong>Conectar cuenta Supabase para participar.</strong><br>
        Puedes leer publicaciones públicas, pero para publicar, responder, dar like o reportar debes iniciar sesión en Supabase.
        <div class="forum-login-inline">
          <input id="forumAuthEmail" type="email" placeholder="Correo electrónico" value="edisonpeguero61@gmail.com">
          <input id="forumAuthPassword" type="password" placeholder="Contraseña">
          <button class="btn btn-primary" type="button" id="forumSupabaseLoginBtn">Entrar</button>
          <button class="btn btn-outline" type="button" id="forumSupabaseRegisterBtn">Crear cuenta</button>
        </div>`;
    } else if(box) {
      box.innerHTML = `<strong>Sesión Supabase activa.</strong><br>Ya puedes publicar, responder, dar like y recibir notificaciones internas.`;
    }
  }

  function requireLogin(){
    if(state.user) return true;
    alert('Debes iniciar sesión en Supabase para hacer esto.');
    $('#forumAuthPassword')?.focus();
    return false;
  }

  async function signIn(){
    const email = ($('#forumAuthEmail')?.value || '').trim();
    const password = ($('#forumAuthPassword')?.value || '').trim();
    if(!email || !password) return alert('Escribe correo y contraseña.');
    const { error } = await db().auth.signInWithPassword({ email, password });
    if(error) return alert(error.message);
    await loadSession();
    await loadPosts(true);
    await loadNotifications();
  }

  async function signUp(){
    const email = ($('#forumAuthEmail')?.value || '').trim();
    const password = ($('#forumAuthPassword')?.value || '').trim();
    if(!email || !password) return alert('Escribe correo y contraseña.');
    const { error } = await db().auth.signUp({
      email,
      password,
      options:{ data:{ full_name: email.split('@')[0] } }
    });
    if(error) return alert(error.message);
    alert('Cuenta creada. Si Supabase requiere verificación, revisa tu correo. Si está confirmada, intenta iniciar sesión.');
  }

  async function logout(){
    await db().auth.signOut();
    state.user = null;
    state.profile = null;
    updateAuthUI();
    await loadPosts(true);
  }

  function postCard(post){
    const author = post.author || {};
    const liked = !!post.liked_by_me;
    return `<article class="forum-post" data-post-id="${escapeHtml(post.id)}">
      <div class="post-author">
        <img src="${escapeHtml(photo(author))}" alt="${escapeHtml(author.full_name || author.email || 'Usuario')}" data-fallback>
        <span><strong>${escapeHtml(author.full_name || author.email || 'Usuario')}</strong>
        ${author.role ? `<em>${escapeHtml(String(author.role).toUpperCase())}</em>` : ''}
        <small>${escapeHtml(post.category || 'Dudas J1')} · ${escapeHtml(rdDate(post.created_at))}</small></span>
      </div>
      <h3><a href="./post.html?id=${encodeURIComponent(post.id)}">${escapeHtml(post.title)}</a></h3>
      ${metaExtras(post)}
      <p>${escapeHtml(post.body || '')}</p>
      <div class="post-stats">
        <button type="button" class="like-btn ${liked ? 'liked' : ''}" data-id="${escapeHtml(post.id)}">❤️ <span>${Number(post.likes_count || 0)}</span></button>
        <span>💬 ${Number(post.comments_count || 0)} respuestas</span>
        ${post.status !== 'approved' ? `<span class="status-pill pending">${escapeHtml(post.status)}</span>` : ''}
      </div>
      <div class="post-actions">
        <a class="btn btn-primary btn-sm" href="./post.html?id=${encodeURIComponent(post.id)}">Ver respuestas</a>
        <button type="button" class="report-btn">Reportar</button>
      </div>
    </article>`;
  }

  function metaExtras(p){
    const bits = [];
    if(p.employer) bits.push(`🏢 ${p.employer}`);
    if(p.state) bits.push(`📍 ${p.state}`);
    if(p.city) bits.push(p.city);
    if(p.position) bits.push(`💼 ${p.position}`);
    if(p.sponsor) bits.push(`Sponsor: ${p.sponsor}`);
    if(p.price) bits.push(`💵 ${p.price}`);
    if(p.housing_type) bits.push(`🏠 ${p.housing_type}`);
    if(p.interview_date) bits.push(`📅 ${p.interview_date}`);
    if(p.visa_status) bits.push(`Visa: ${p.visa_status}`);
    return bits.length ? `<div class="post-meta-extras">${bits.map(escapeHtml).join(' · ')}</div>` : '';
  }

  async function loadLikedPostIds(ids){
    if(!state.user || !ids.length) return new Set();
    const { data } = await db().from('forum_likes')
      .select('post_id')
      .eq('user_id', state.user.id)
      .eq('target_type','post')
      .in('post_id', ids);
    return new Set((data || []).map(x => x.post_id));
  }

  async function loadPosts(reset=false){
    const root = $('#forumPosts');
    if(!root) return;
    if(reset) {
      state.offset = 0;
      state.posts = [];
      root.innerHTML = '<div class="empty-state">Cargando foro desde Supabase...</div>';
    }

    const q = ($('#forumSearch')?.value || '').trim();
    const category = $('#forumCategoryFilter')?.value || '';
    const sort = $('#forumSort')?.value || 'recent';

    let query = db().from('forum_posts')
      .select('*, author:user_profiles!forum_posts_author_id_fkey(full_name,email,role,photo_url)')
      .range(state.offset, state.offset + state.limit - 1);

    if(category) query = query.eq('category', category);
    if(q) query = query.or(`title.ilike.%${q}%,body.ilike.%${q}%`);

    if(sort === 'popular') query = query.order('likes_count', { ascending:false }).order('created_at', { ascending:false });
    else if(sort === 'commented') query = query.order('comments_count', { ascending:false }).order('created_at', { ascending:false });
    else if(sort === 'unanswered') query = query.eq('comments_count', 0).order('created_at', { ascending:false });
    else query = query.order('last_activity_at', { ascending:false });

    const { data, error } = await query;
    if(error) {
      root.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
      return;
    }

    const liked = await loadLikedPostIds((data || []).map(p => p.id));
    const rows = (data || []).map(p => ({...p, liked_by_me: liked.has(p.id)}));

    state.posts = reset ? rows : state.posts.concat(rows);
    state.offset = state.posts.length;
    state.hasMore = rows.length === state.limit;

    root.innerHTML = state.posts.length ? state.posts.map(postCard).join('') : '<div class="empty-state">Todavía no hay publicaciones.</div>';

    const wrap = $('#forumLoadMoreWrap');
    if(wrap) wrap.hidden = !state.hasMore;

    root.querySelectorAll('img[data-fallback]').forEach(img => { img.onerror = () => { img.src = './images/logo.png'; }; });
  }

  async function createPost(form){
    if(!requireLogin()) return;
    const raw = formDataObj(form);
    const payload = {
      title: raw.title,
      body: raw.body,
      category: raw.category || 'Dudas J1',
      author_id: state.user.id,
      employer: raw.employer || null,
      state: raw.state || null,
      city: raw.city || null,
      position: raw.position || null,
      sponsor: raw.sponsor || null,
      price: raw.price || null,
      housing_type: raw.housing_type || null,
      interview_date: raw.interview_date || null,
      visa_status: raw.visa_status || null
    };

    const { error } = await db().from('forum_posts').insert(payload);
    if(error) throw error;
    alert('Publicación enviada. Si requiere moderación, aparecerá después de aprobarse.');
    form.reset();
    toggleExtraFields();
    await loadPosts(true);
  }

  async function togglePostLike(postId, btn){
    if(!requireLogin()) return;

    const { data: existing, error: e1 } = await db().from('forum_likes')
      .select('id')
      .eq('target_type','post')
      .eq('post_id', postId)
      .eq('user_id', state.user.id)
      .maybeSingle();
    if(e1) throw e1;

    if(existing) {
      const { error } = await db().from('forum_likes').delete().eq('id', existing.id);
      if(error) throw error;
      btn.classList.remove('liked');
    } else {
      const { error } = await db().from('forum_likes').insert({ target_type:'post', post_id:postId, user_id:state.user.id });
      if(error) throw error;
      btn.classList.add('liked');
    }

    const { data: post } = await db().from('forum_posts').select('likes_count').eq('id', postId).single();
    btn.querySelector('span').textContent = String(post?.likes_count || 0);
  }

  async function reportPost(postId){
    if(!requireLogin()) return;
    const reason = prompt('Motivo del reporte:', 'Reporte desde foro');
    if(reason === null) return;
    const { error } = await db().from('forum_reports').insert({
      target_type:'post',
      post_id:postId,
      reporter_id:state.user.id,
      reason: reason || 'Reporte desde foro'
    });
    if(error) return alert(error.message);
    alert('Reporte enviado a moderación.');
  }

  async function loadSinglePost(){
    const root = $('#singlePost');
    if(!root) return;
    const id = new URLSearchParams(location.search).get('id');
    if(!id) {
      root.innerHTML = '<div class="empty-state">Falta el ID de la publicación.</div>';
      return;
    }

    const { data: post, error } = await db().from('forum_posts')
      .select('*, author:user_profiles!forum_posts_author_id_fkey(full_name,email,role,photo_url)')
      .eq('id', id)
      .single();

    if(error) {
      root.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
      return;
    }

    const liked = await loadLikedPostIds([id]);
    const { data: comments, error: cErr } = await db().from('forum_comments')
      .select('*, author:user_profiles!forum_comments_author_id_fkey(full_name,email,role,photo_url)')
      .eq('post_id', id)
      .order('created_at', { ascending:true });

    if(cErr) {
      root.innerHTML = `<div class="empty-state">${escapeHtml(cErr.message)}</div>`;
      return;
    }

    root.innerHTML = `<article class="forum-post post-detail" data-post-id="${escapeHtml(post.id)}">
      <div class="post-author"><img src="${escapeHtml(photo(post.author))}" alt="Usuario" data-fallback><span><strong>${escapeHtml(post.author?.full_name || post.author?.email || 'Usuario')}</strong><small>${escapeHtml(post.category || 'Dudas J1')} · ${escapeHtml(rdDate(post.created_at))}</small></span></div>
      <h2>${escapeHtml(post.title)}</h2>
      ${metaExtras(post)}
      <p>${escapeHtml(post.body || '')}</p>
      <div class="post-stats"><button type="button" class="like-btn ${liked.has(post.id) ? 'liked' : ''}" data-id="${escapeHtml(post.id)}">❤️ <span>${Number(post.likes_count||0)}</span></button><span>💬 ${Number(post.comments_count||0)} respuestas</span></div>
      <button type="button" class="report-btn">Reportar publicación</button>
    </article>
    <section class="forum-feed comments-section"><h3>Respuestas</h3><div id="postComments">${comments?.length ? comments.map(renderComment).join('') : '<div class="empty-state">Todavía no hay respuestas.</div>'}</div></section>`;

    root.querySelectorAll('img[data-fallback]').forEach(img => { img.onerror = () => { img.src = './images/logo.png'; }; });
  }

  function renderComment(c){
    const a = c.author || {};
    return `<article class="comment-item" data-comment-id="${escapeHtml(c.id)}">
      <div class="post-author"><img src="${escapeHtml(photo(a))}" alt="Usuario" data-fallback><span><strong>${escapeHtml(a.full_name || a.email || 'Usuario')}</strong><small>${escapeHtml(rdDate(c.created_at))}</small></span></div>
      <p>${escapeHtml(c.body || '')}</p>
      <div class="comment-actions"><button type="button" class="comment-report-btn">Reportar respuesta</button></div>
    </article>`;
  }

  async function createComment(form){
    if(!requireLogin()) return;
    const id = new URLSearchParams(location.search).get('id');
    const raw = formDataObj(form);
    const { error } = await db().from('forum_comments').insert({
      post_id:id,
      body: raw.body,
      author_id: state.user.id
    });
    if(error) throw error;
    alert('Respuesta enviada. Puede requerir aprobación.');
    form.reset();
    await loadSinglePost();
  }

  async function reportComment(commentId){
    if(!requireLogin()) return;
    const reason = prompt('Motivo del reporte:', 'Reporte de respuesta');
    if(reason === null) return;
    const { error } = await db().from('forum_reports').insert({
      target_type:'comment',
      comment_id:commentId,
      reporter_id:state.user.id,
      reason: reason || 'Reporte de respuesta'
    });
    if(error) return alert(error.message);
    alert('Respuesta reportada.');
  }

  async function loadNotifications(){
    if(!state.user) return;
    const { data } = await db().from('notifications')
      .select('*')
      .eq('user_id', state.user.id)
      .order('created_at', { ascending:false })
      .limit(20);
    state.notifications = data || [];
    const unread = state.notifications.filter(n => !n.read_at).length;
    $('#notifCount') && ($('#notifCount').textContent = unread ? String(unread) : '');
  }

  function openNotifications(){
    const panel = $('#notifPanel');
    if(!panel) return;
    panel.classList.toggle('open');
    panel.innerHTML = state.notifications.length ? state.notifications.map(n => `<a class="notif-item ${n.read_at?'':'unread'}" href="./post.html?id=${encodeURIComponent(n.post_id || '')}"><strong>${escapeHtml(n.title)}</strong><span>${escapeHtml(n.message || '')}</span><small>${escapeHtml(rdDate(n.created_at))}</small></a>`).join('') : '<div class="notif-empty">No tienes notificaciones.</div>';
  }

  function toggleExtraFields(){
    const cat = $('#postCategory')?.value || '';
    $$('.category-extra').forEach(el => el.hidden = true);
    if(cat === 'Trabajo') $('#extraTrabajo') && ($('#extraTrabajo').hidden = false);
    if(cat === 'Housing') $('#extraHousing') && ($('#extraHousing').hidden = false);
    if(cat === 'Visa') $('#extraVisa') && ($('#extraVisa').hidden = false);
  }

  document.addEventListener('click', async e => {
    try {
      if(e.target?.id === 'forumSupabaseLoginBtn') await signIn();
      if(e.target?.id === 'forumSupabaseRegisterBtn') await signUp();
      if(e.target?.id === 'forumLogoutBtn') await logout();
      if(e.target?.id === 'refreshForumBtn') await loadPosts(true);
      if(e.target?.id === 'loadMorePostsBtn') await loadPosts(false);
      if(e.target?.id === 'notifBell') openNotifications();

      const like = e.target.closest?.('.like-btn');
      if(like) await togglePostLike(like.dataset.id, like);

      if(e.target?.classList?.contains('report-btn')) {
        const post = e.target.closest('.forum-post');
        await reportPost(post.dataset.postId);
      }

      if(e.target?.classList?.contains('comment-report-btn')) {
        const c = e.target.closest('.comment-item');
        await reportComment(c.dataset.commentId);
      }
    } catch(err) {
      alert(err.message || String(err));
    }
  });

  document.addEventListener('submit', async e => {
    const form = e.target;
    try {
      if(form.id === 'forumPostForm') {
        e.preventDefault();
        await createPost(form);
      }
      if(form.id === 'singleCommentForm') {
        e.preventDefault();
        await createComment(form);
      }
    } catch(err) {
      alert(err.message || String(err));
    }
  });

  $('#postCategory')?.addEventListener('change', toggleExtraFields);
  ['#forumCategoryFilter','#forumSort'].forEach(sel => $(sel)?.addEventListener('change', () => loadPosts(true)));
  $('#forumSearch')?.addEventListener('input', () => {
    clearTimeout(window.__forumSearchTimer);
    window.__forumSearchTimer = setTimeout(() => loadPosts(true), 350);
  });

  window.addEventListener('scroll', () => {
    const p = $('#progressBar');
    if(p) p.style.width = ((window.scrollY / (document.body.scrollHeight - innerHeight)) * 100) + '%';
  });

  async function init(){
    if(!window.WTDB?.enabled()) {
      const root = $('#forumPosts') || $('#singlePost');
      if(root) root.innerHTML = '<div class="empty-state">Supabase no está activo.</div>';
      return;
    }
    await loadSession();
    toggleExtraFields();
    await loadNotifications();
    await loadPosts(true);
    await loadSinglePost();
  }

  init();
})();

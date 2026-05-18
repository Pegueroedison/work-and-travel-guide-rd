/**
 * WEB APP — Foro de Estudiantes
 * Publicaciones, comentarios, reportes y moderación automática.
 * El panel visual está en GitHub Pages: admin.html.
 */
const SPAM_WORDS = ['viagra','casino','free money','crypto scam','onlyfans','loan fast','click here'];
function doGet(e) {
  try {
    const action = (e.parameter.action || '').toLowerCase();
    if (action === 'listposts') return json_({ ok:true, data:{ posts:listPosts_() } });
    if (action === 'listcomments') return json_({ ok:true, data:{ comments:listComments_(e.parameter.post_id) } });
    return json_({ ok:true, service:'foro', message:'Web App activa. Usa action=listPosts o POST para foro/moderación.' });
  } catch(err) { return json_({ ok:false, message:err.message }); }
}
function doPost(e) {
  try {
    const body = JSON.parse((e.postData && e.postData.contents) || '{}');
    const action = body.action;
    if (action === 'createPost') return json_(createPost_(body));
    if (action === 'createComment') return json_(createComment_(body));
    if (action === 'reportPost') return json_(report_('post', body));
    if (action === 'reportComment') return json_(report_('comment', body));
    if (action === 'moderate') return json_(moderate_(body));
    if (action === 'adminDashboard') return json_(adminDashboard_(body));
    if (action === 'adminModerateDirect') return json_(adminModerateDirect_(body));
    if (action === 'adminUpdateConfig') return json_(adminUpdateConfig_(body));
    return json_({ ok:false, message:'Acción no permitida' });
  } catch(err) { return json_({ ok:false, message:err.message }); }
}
function listPosts_() {
  const posts = table_(sheet_('Posts')).rows
    .filter(p => String(p.status).toLowerCase()==='approved')
    .sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
  const comments = table_(sheet_('Comments')).rows
    .filter(c => String(c.status).toLowerCase()==='approved')
    .sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));
  const byPost = {};
  comments.forEach(c => {
    const key = String(c.post_id || '');
    if (!byPost[key]) byPost[key] = [];
    byPost[key].push(c);
  });
  return posts.map(p => Object.assign({}, p, { comments: byPost[String(p.id || '')] || [] }));
}
function listComments_(postId) {
  return table_(sheet_('Comments')).rows
    .filter(c => String(c.post_id)===String(postId) && String(c.status).toLowerCase()==='approved')
    .sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));
}
function createPost_(body) {
  ensureForumAuthorColumns_();
  const user = validateUser_(body.token); const title=clean_(body.title); const content=clean_(body.body); if(!title || !content) throw new Error('Título y contenido son obligatorios.');
  const mod = needsModeration_(title + ' ' + content);
  if (configBool_('comments_require_approval', false)) {
    mod.needs = true;
    mod.reason = mod.reason ? mod.reason + ', aprobación manual activada' : 'aprobación manual activada';
  }
  const status = mod.needs ? 'pending' : 'approved'; const id='POST-'+Date.now();
  appendObject_('Posts', Object.assign({id,title,body:content,category:clean_(body.category||'General'),author_id:user.id,author_name:user.name,author_email:user.email,status,moderation_reason:mod.reason,created_at:now_(),updated_at:now_(),reports_count:0}, forumUserFields_(user)));
  if(mod.needs) enqueue_('post',id,mod.reason);
  return { ok:true, message: status==='pending' ? 'Publicación enviada a moderación. Aparecerá cuando sea aprobada.' : 'Publicación creada.' };
}
function createComment_(body) {
  ensureForumAuthorColumns_();
  const user = validateUser_(body.token); const postId=clean_(body.post_id); const content=clean_(body.body); if(!postId || !content) throw new Error('Falta la publicación o el comentario.');
  const mod = needsModeration_(content);
  if (configBool_('comments_require_approval', false)) { mod.needs = true; mod.reason = mod.reason ? mod.reason + ', aprobación manual activada' : 'aprobación manual activada'; }
  const status = mod.needs ? 'pending' : 'approved'; const id='COM-'+Date.now();
  appendObject_('Comments', Object.assign({id,post_id:postId,body:content,author_id:user.id,author_name:user.name,author_email:user.email,status,moderation_reason:mod.reason,created_at:now_(),updated_at:now_(),reports_count:0}, forumUserFields_(user)));
  if(mod.needs) enqueue_('comment',id,mod.reason);
  return { ok:true, message: status==='pending' ? 'Comentario enviado a moderación.' : 'Comentario publicado.' };
}
function report_(type, body) {
  const user=validateUser_(body.token); const targetId=clean_(body.post_id || body.comment_id || body.target_id); if(!targetId) throw new Error('Falta el contenido a reportar.');
  const id='RPT-'+Date.now(); appendObject_('Reports',{id,target_type:type,target_id:targetId,reporter_id:user.id,reporter_email:user.email,reason:clean_(body.reason||'Reporte de usuario'),status:'open',created_at:now_(),resolved_at:'',resolved_by:''});
  enqueue_(type,targetId,'Reporte de usuario'); return { ok:true, message:'Reporte enviado a moderación.' };
}
function moderate_(body) {
  const user=validateModerator_(body.token); const type=clean_(body.target_type); const id=clean_(body.target_id); const decision=clean_(body.decision || body.status);
  return moderateContent_(type, id, decision, user.email);
}
function adminDashboard_(body) {
  validateAdmin_(body.token);
  ensureForumConfig_();
  return { ok:true, data:{ posts:table_(sheet_('Posts')), comments:table_(sheet_('Comments')), reports:table_(sheet_('Reports')), queue:table_(sheet_('ModerationQueue')), config:table_(sheet_('Config')) } };
}
function adminModerateDirect_(body) {
  const user = validateAdmin_(body.token);
  const type = clean_(body.target_type); const id = clean_(body.target_id); const decision = clean_(body.decision || body.status);
  return moderateContent_(type, id, decision, user.email, clean_(body.note));
}
function adminUpdateConfig_(body) {
  const user = validateAdmin_(body.token);
  ensureForumConfig_();
  const key = clean_(body.key || body.clave);
  const value = clean_(body.value || body.valor);
  const allowed = ['comments_require_approval'];
  if (allowed.indexOf(key) === -1) throw new Error('Configuración no permitida.');
  const sh = sheet_('Config'); const data = table_(sh); const row = data.rows.find(r => String(r.clave) === key);
  if (!row) throw new Error('Configuración no encontrada.');
  updateRow_(sh, row.rowNumber, { valor:value }, data.headers);
  logAdmin_('updateForumConfig', JSON.stringify({key,value,by:user.email}));
  return { ok:true, message:'Configuración del foro actualizada.' };
}
function moderateContent_(type, id, decision, by, note) {
  if(['approved','rejected','deleted'].indexOf(decision)===-1) throw new Error('Decisión inválida.');
  const sheetName = type==='comment' ? 'Comments' : 'Posts'; const sh=sheet_(sheetName); const data=table_(sh); const row=data.rows.find(r=>String(r.id)===String(id)); if(!row) throw new Error('Contenido no encontrado.');
  updateRow_(sh,row.rowNumber,{status:decision,updated_at:now_()},data.headers);
  closeQueue_(type, id, decision, by, note || '');
  logAdmin_('moderate',JSON.stringify({type,id,decision,by,note})); return {ok:true,message:'Moderación aplicada.'};
}
function closeQueue_(type, id, decision, by, note) { try { const sh=sheet_('ModerationQueue'); const data=table_(sh); data.rows.filter(r=>String(r.target_type)===String(type) && String(r.target_id)===String(id) && String(r.status).toLowerCase()==='open').forEach(r=>updateRow_(sh,r.rowNumber,{status:'reviewed',reviewed_at:now_(),reviewed_by:by,note:decision + (note ? ' - ' + note : '')},data.headers)); } catch(e) {} }
function needsModeration_(text) {
  const t=String(text||'').toLowerCase(); const reasons=[];
  if(/https?:\/\/|www\.|\.com|\.net|\.org|\.io/.test(t)) reasons.push('contiene enlace');
  if(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(t)) reasons.push('contiene correo electrónico');
  if(/(\+?1?\s*)?(\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})|\+?\d[\d\s().-]{8,}/.test(t)) reasons.push('contiene número telefónico');
  if(SPAM_WORDS.some(w=>t.includes(w))) reasons.push('posible spam');
  return { needs:reasons.length>0, reason:reasons.join(', ') };
}
function validateUser_(token) {
  if(!token) throw new Error('Para participar en el foro debes iniciar sesión.');
  const user = checkUserSession_(token);
  return user;
}
function validateModerator_(token) { const user = checkUserSession_(token); if(['moderator','admin','superadmin'].indexOf(String(user.role).toLowerCase())===-1) throw new Error('No tienes permiso para moderar.'); return user; }
function validateAdmin_(token) { const user = checkUserSession_(token); if(['admin','superadmin'].indexOf(String(user.role).toLowerCase())===-1) throw new Error('No tienes permiso para administrar el foro.'); return user; }
function checkUserSession_(token) {
  if(!token) throw new Error('Sesión requerida.');
  const url=config_('users_api_url'); if(!url) throw new Error('Falta configurar users_api_url en la hoja Config del Foro.');
  const res=UrlFetchApp.fetch(url,{method:'post',contentType:'text/plain;charset=utf-8',payload:JSON.stringify({action:'checkSession',token}),muteHttpExceptions:true});
  const data=JSON.parse(res.getContentText()); if(data.ok===false) throw new Error(data.message || 'Sesión inválida.'); return data.user || (data.data && data.data.user) || data;
}
function forumUserFields_(user) {
  const fileId = user.photo_file_id || user.photoFileId || user.profile_photo_file_id || user.file_id || '';
  const photoUrl = fileId ? driveImageUrl_(fileId) : (user.photo_url || user.profile_photo_url || user.avatar_url || '');
  return {
    author_role: user.role || 'user',
    author_photo_file_id: fileId,
    author_photo_url: photoUrl
  };
}
function driveImageUrl_(fileId) { return fileId ? 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(fileId) + '&sz=w400' : ''; }
function ensureForumAuthorColumns_() {
  ensureColumns_('Posts', ['author_role','author_photo_file_id','author_photo_url']);
  ensureColumns_('Comments', ['author_role','author_photo_file_id','author_photo_url']);
}
function enqueue_(type,id,reason){ appendObject_('ModerationQueue',{id:'MOD-'+Date.now(),target_type:type,target_id:id,reason,status:'open',created_at:now_(),reviewed_at:'',reviewed_by:'',note:''}); }
function config_(key){const row=table_(sheet_('Config')).rows.find(r=>r.clave===key); return row?row.valor:'';}
function configBool_(key, fallback){ const v = config_(key); if (v === '' || v === undefined || v === null) return !!fallback; return ['true','1','si','sí','activo','active'].indexOf(String(v).toLowerCase().trim()) !== -1; }
function ensureForumConfig_(){
  ensureConfigRow_('comments_require_approval', false, 'Si está TRUE, todas las publicaciones y comentarios nuevos requieren aprobación manual.');
}
function ensureConfigRow_(key, value, description){
  const sh = sheet_('Config'); const data = table_(sh);
  if (data.rows.some(r => String(r.clave) === key)) return;
  appendObject_('Config', { clave:key, valor:value, descripcion:description });
}
function clean_(v){return String(v||'').trim();} function now_(){return new Date();}
function truth_(v){ return v === true || ['true','1','si','sí','yes','y','active','activo','aprobado','approved'].indexOf(String(v).toLowerCase().trim()) !== -1; }
function sheet_(name){const sh=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name); if(!sh) throw new Error('Falta la hoja: '+name); return sh;}
function table_(sh){const values=sh.getDataRange().getValues(); const headers=values.shift().map(String); const rows=values.filter(r=>r.some(c=>c!=='')) .map((r,i)=>{const o={rowNumber:i+2}; headers.forEach((h,j)=>o[h]=r[j]); return o;}); return {headers,rows};}
function appendObject_(sheetName,obj){const sh=sheet_(sheetName); const headers=table_(sh).headers; sh.appendRow(headers.map(h=>obj[h]!==undefined?obj[h]:''));}
function updateRow_(sh,rowNumber,obj,headers){Object.keys(obj).forEach(k=>{const i=headers.indexOf(k); if(i>=0) sh.getRange(rowNumber,i+1).setValue(obj[k]);});}
function logAdmin_(accion,detalle){try{appendObject_('AdminLogs',{id:'ADM-'+Date.now(),accion,detalle,usuario:Session.getActiveUser().getEmail(),fecha:now_()});}catch(e){}}
function actualizarColumnasForo() {
  // Ejecutar una sola vez si ya instalaste el foro antes de esta versión.
  // No borra datos; solo agrega columnas nuevas para mostrar foto y rol del autor.
  ensureForumAuthorColumns_();
  ensureForumConfig_();
  SpreadsheetApp.flush();
  Logger.log('Columnas y configuración del foro actualizadas correctamente.');
}
function ensureColumns_(sheetName, columns) {
  const sh = sheet_(sheetName);
  const headers = sh.getRange(1,1,1,Math.max(sh.getLastColumn(),1)).getValues()[0].map(String);
  columns.forEach(col => {
    if (headers.indexOf(col) === -1) {
      const newCol = sh.getLastColumn() + 1;
      sh.getRange(1, newCol).setValue(col)
        .setBackground('#0d1b3e')
        .setFontColor('#ffffff')
        .setFontWeight('bold')
        .setHorizontalAlignment('center')
        .setWrap(true);
      sh.setColumnWidth(newCol, col === 'author_photo_url' ? 330 : 170);
      headers.push(col);
    }
  });
  if (!sh.getFilter()) sh.getRange(1,1,Math.max(sh.getLastRow(),2),sh.getLastColumn()).createFilter();
  sh.setFrozenRows(1);
}
function json_(obj){return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);}

/* === OVERRIDES v24: publicaciones individuales, likes y notificaciones internas === */
function doGet(e) {
  try {
    ensureForumExtraTables_();
    const action = (e.parameter.action || '').toLowerCase();
    if (action === 'listposts') { const result = listPosts_(e.parameter); return json_({ ok:true, data:result }); }
    if (action === 'getpost') return json_(getPost_(e.parameter));
    if (action === 'listcomments') return json_({ ok:true, data:{ comments:listComments_(e.parameter.post_id) } });
    if (action === 'listnotifications') return json_(listNotifications_(e.parameter));
    return json_({ ok:true, service:'foro', message:'Web App activa v24.' });
  } catch(err) { return json_({ ok:false, message:err.message }); }
}
function doPost(e) {
  try {
    ensureForumExtraTables_();
    const body = JSON.parse((e.postData && e.postData.contents) || '{}');
    const action = body.action;
    if (action === 'createPost') return json_(createPost_(body));
    if (action === 'createComment') return json_(createComment_(body));
    if (action === 'toggleLike') return json_(toggleLike_(body));
    if (action === 'markNotificationRead') return json_(markNotificationRead_(body));
    if (action === 'reportPost') return json_(report_('post', body));
    if (action === 'reportComment') return json_(report_('comment', body));
    if (action === 'moderate') return json_(moderate_(body));
    if (action === 'adminDashboard') return json_(adminDashboard_(body));
    if (action === 'adminModerateDirect') return json_(adminModerateDirect_(body));
    if (action === 'adminUpdateConfig') return json_(adminUpdateConfig_(body));
    return json_({ ok:false, message:'Acción no permitida' });
  } catch(err) { return json_({ ok:false, message:err.message }); }
}
function listPosts_(params) {
  params = params || {};
  const viewer = safeSessionUser_(params.token);
  const q = clean_(params.q || '').toLowerCase();
  const category = clean_(params.category || '');
  const sort = clean_(params.sort || 'recent');
  const limit = Math.max(1, Math.min(Number(params.limit || 10), 25));
  const offset = Math.max(0, Number(params.offset || 0));

  let posts = table_(sheet_('Posts')).rows.filter(p => String(p.status).toLowerCase()==='approved');
  if (category) posts = posts.filter(p => String(p.category || p.categoria).toLowerCase() === category.toLowerCase());
  if (q) posts = posts.filter(p => [p.title,p.body,p.category,p.employer,p.state,p.city,p.position,p.sponsor].join(' ').toLowerCase().indexOf(q) !== -1);

  const comments = table_(sheet_('Comments')).rows.filter(c => String(c.status).toLowerCase()==='approved');
  const likes = table_(sheetOrCreate_('Likes', ['id','post_id','user_id','user_email','created_at','active'])).rows.filter(l => truth_(l.active));
  const commentsCount = {}; comments.forEach(c => commentsCount[String(c.post_id)] = (commentsCount[String(c.post_id)] || 0) + 1);
  const likesCount = {}; likes.forEach(l => likesCount[String(l.post_id)] = (likesCount[String(l.post_id)] || 0) + 1);
  const userId = String(viewer && viewer.id || '');

  posts = posts.map(p => Object.assign({}, p, { comments_count:commentsCount[String(p.id)] || 0, likes_count:likesCount[String(p.id)] || 0, liked_by_me: userId ? likes.some(l => String(l.post_id)===String(p.id) && String(l.user_id)===userId && truth_(l.active)) : false }));
  if (sort === 'commented') posts.sort((a,b)=>Number(b.comments_count||0)-Number(a.comments_count||0) || new Date(b.created_at)-new Date(a.created_at));
  else if (sort === 'popular') posts.sort((a,b)=>Number(b.likes_count||0)-Number(a.likes_count||0) || new Date(b.created_at)-new Date(a.created_at));
  else if (sort === 'unanswered') posts.sort((a,b)=>Number(a.comments_count||0)-Number(b.comments_count||0) || new Date(b.created_at)-new Date(a.created_at));
  else posts.sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));

  const total = posts.length;
  const pagePosts = posts.slice(offset, offset + limit);
  return { posts: pagePosts, total: total, limit: limit, offset: offset, nextOffset: offset + pagePosts.length, hasMore: offset + pagePosts.length < total };
}
function getPost_(params) {
  const id = clean_(params.id || params.post_id);
  if (!id) throw new Error('Falta el ID de la publicación.');
  const viewer = safeSessionUser_(params.token);
  const posts = listPosts_({ token:params.token || '', limit:1000, offset:0 }).posts;
  const post = posts.find(p => String(p.id) === String(id));
  if (!post) throw new Error('Publicación no encontrada o pendiente de aprobación.');
  return { ok:true, data:{ post:post, comments:listComments_(id) } };
}
function createPost_(body) {
  ensureForumAuthorColumns_(); ensureForumPostExtraColumns_(); ensureForumExtraTables_();
  const user = validateUser_(body.token); const title=clean_(body.title); const content=clean_(body.body); if(!title || !content) throw new Error('Título y contenido son obligatorios.');
  const mod = needsModeration_(title + ' ' + content);
  if (configBool_('comments_require_approval', false)) { mod.needs = true; mod.reason = mod.reason ? mod.reason + ', aprobación manual activada' : 'aprobación manual activada'; }
  const status = mod.needs ? 'pending' : 'approved'; const id='POST-'+Date.now();
  appendObject_('Posts', Object.assign({id,title,body:content,category:clean_(body.category||'General'),employer:clean_(body.employer),state:clean_(body.state),city:clean_(body.city),position:clean_(body.position),sponsor:clean_(body.sponsor),price:clean_(body.price),housing_type:clean_(body.housing_type),visa_status:clean_(body.visa_status),interview_date:clean_(body.interview_date),author_id:user.id,author_name:user.name,author_email:user.email,status,moderation_reason:mod.reason,created_at:now_(),updated_at:now_(),reports_count:0}, forumUserFields_(user)));
  if(mod.needs) enqueue_('post',id,mod.reason);
  return { ok:true, message: status==='pending' ? 'Publicación enviada a moderación. Aparecerá cuando sea aprobada.' : 'Publicación creada.' };
}
function createComment_(body) {
  ensureForumAuthorColumns_(); ensureForumExtraTables_();
  const user = validateUser_(body.token); const postId=clean_(body.post_id); const content=clean_(body.body); if(!postId || !content) throw new Error('Falta la publicación o el comentario.');
  const post = findPostById_(postId);
  const mod = needsModeration_(content);
  if (configBool_('comments_require_approval', false)) { mod.needs = true; mod.reason = mod.reason ? mod.reason + ', aprobación manual activada' : 'aprobación manual activada'; }
  const status = mod.needs ? 'pending' : 'approved'; const id='COM-'+Date.now();
  appendObject_('Comments', Object.assign({id,post_id:postId,body:content,author_id:user.id,author_name:user.name,author_email:user.email,status,moderation_reason:mod.reason,created_at:now_(),updated_at:now_(),reports_count:0}, forumUserFields_(user)));
  if(mod.needs) enqueue_('comment',id,mod.reason); else notifyPostAuthor_(post, user, 'Nueva respuesta', user.name + ' respondió tu publicación: ' + post.title, postId);
  return { ok:true, message: status==='pending' ? 'Comentario enviado a moderación.' : 'Comentario publicado.' };
}
function moderateContent_(type, id, decision, by, note) {
  if(['approved','rejected','deleted'].indexOf(decision)===-1) throw new Error('Decisión inválida.');
  const sheetName = type==='comment' ? 'Comments' : 'Posts'; const sh=sheet_(sheetName); const data=table_(sh); const row=data.rows.find(r=>String(r.id)===String(id)); if(!row) throw new Error('Contenido no encontrado.');
  updateRow_(sh,row.rowNumber,{status:decision,updated_at:now_()},data.headers);
  closeQueue_(type, id, decision, by, note || '');
  if (type === 'comment' && decision === 'approved') { const post = findPostById_(row.post_id); notifyPostAuthor_(post, row, 'Nueva respuesta aprobada', row.author_name + ' respondió tu publicación: ' + post.title, row.post_id); }
  if (decision === 'approved' || decision === 'rejected') notifyUser_(row.author_id, row.author_email, type === 'post' ? row.id : row.post_id, decision === 'approved' ? 'Contenido aprobado' : 'Contenido rechazado', (type === 'post' ? 'Tu publicación' : 'Tu respuesta') + ' fue ' + (decision === 'approved' ? 'aprobada.' : 'rechazada.'));
  logAdmin_('moderate',JSON.stringify({type,id,decision,by,note})); return {ok:true,message:'Moderación aplicada.'};
}
function toggleLike_(body) {
  const user = validateUser_(body.token); const postId = clean_(body.post_id); if(!postId) throw new Error('Falta la publicación.');
  findPostById_(postId);
  const sh = sheetOrCreate_('Likes', ['id','post_id','user_id','user_email','created_at','active']);
  const data = table_(sh); let row = data.rows.find(r => String(r.post_id)===String(postId) && String(r.user_id)===String(user.id));
  let active = true;
  if (row) { active = !truth_(row.active); updateRow_(sh, row.rowNumber, { active:active, created_at:now_() }, data.headers); }
  else appendObject_('Likes', { id:'LIKE-'+Date.now(), post_id:postId, user_id:user.id, user_email:user.email, created_at:now_(), active:true });
  const post = findPostById_(postId); if(active) notifyPostAuthor_(post, user, 'Nuevo me gusta', user.name + ' reaccionó a tu publicación: ' + post.title, postId);
  const likesCount = table_(sh).rows.filter(r => String(r.post_id)===String(postId) && truth_(r.active)).length;
  return { ok:true, liked:active, likes_count:likesCount };
}
function listNotifications_(params) {
  const user = validateUser_(params.token);
  const rows = table_(sheetOrCreate_('Notifications', ['id','user_id','user_email','post_id','title','message','created_at','read_at'])).rows
    .filter(n => String(n.user_id)===String(user.id) || String(n.user_email).toLowerCase()===String(user.email).toLowerCase())
    .sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
  return { ok:true, data:{ notifications:rows.slice(0,40) } };
}
function markNotificationRead_(body) {
  const user = validateUser_(body.token); const id = clean_(body.id); const sh=sheetOrCreate_('Notifications', ['id','user_id','user_email','post_id','title','message','created_at','read_at']); const data=table_(sh); const row=data.rows.find(r => String(r.id)===id && (String(r.user_id)===String(user.id) || String(r.user_email).toLowerCase()===String(user.email).toLowerCase())); if(row) updateRow_(sh,row.rowNumber,{read_at:now_()},data.headers); return {ok:true};
}
function notifyPostAuthor_(post, actor, title, message, postId) { if(!post) return; if(String(post.author_id) === String(actor.id || actor.author_id)) return; notifyUser_(post.author_id, post.author_email, postId || post.id, title, message); }
function notifyUser_(userId, email, postId, title, message) { if(!userId && !email) return; appendObject_('Notifications', { id:'NTF-'+Date.now()+'-'+Math.floor(Math.random()*999), user_id:userId||'', user_email:email||'', post_id:postId||'', title:title||'Notificación', message:message||'', created_at:now_(), read_at:'' }); }
function findPostById_(postId) { const row = table_(sheet_('Posts')).rows.find(p => String(p.id)===String(postId)); if(!row) throw new Error('Publicación no encontrada.'); return row; }
function safeSessionUser_(token) { try { return token ? validateUser_(token) : null; } catch(e) { return null; } }
function ensureForumPostExtraColumns_(){ ensureColumns_('Posts', ['employer','state','city','position','sponsor','price','housing_type','visa_status','interview_date']); }
function ensureForumExtraTables_(){
  sheetOrCreate_('Likes', ['id','post_id','user_id','user_email','created_at','active']);
  sheetOrCreate_('Notifications', ['id','user_id','user_email','post_id','title','message','created_at','read_at']);
  ensureForumPostExtraColumns_();
}
function sheetOrCreate_(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet(); let sh = ss.getSheetByName(name);
  if(!sh){ sh = ss.insertSheet(name); sh.getRange(1,1,1,headers.length).setValues([headers]).setBackground('#0d1b3e').setFontColor('#ffffff').setFontWeight('bold').setWrap(true); sh.setFrozenRows(1); if(!sh.getFilter()) sh.getRange(1,1,2,headers.length).createFilter(); headers.forEach((h,i)=>sh.setColumnWidth(i+1, h.indexOf('message')>=0 ? 320 : 170)); }
  return sh;
}
function actualizarColumnasForo() {
  ensureForumAuthorColumns_();
  ensureForumConfig_();
  ensureForumExtraTables_();
  SpreadsheetApp.flush();
  Logger.log('Foro v28 actualizado correctamente: paginación, fotos, roles, aprobación, likes, notificaciones y campos extra.');
}

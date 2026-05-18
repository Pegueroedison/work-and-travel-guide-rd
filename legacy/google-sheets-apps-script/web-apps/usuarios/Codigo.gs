/**
 * WEB APP — Usuarios
 * Registro, login, verificación, recuperación, roles y foto de perfil en Drive.
 * También valida permisos para el panel admin de GitHub Pages.
 */
const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
const ALLOWED_MIME = ['image/jpeg','image/png','image/webp'];
const DEFAULT_EMAIL_COOLDOWN_SECONDS = 120;
function doGet(e) {
  const action = (e.parameter.action || '').toLowerCase();
  if (action === 'health') return json_({ ok:true, service:'usuarios' });
  return json_({ ok:true, service:'usuarios', message:'Web App activa. Usa POST para autenticación y administración.' });
}
function doPost(e) {
  try {
    const body = JSON.parse((e.postData && e.postData.contents) || '{}');
    const action = body.action;
    if (action === 'register') return json_(register_(body));
    if (action === 'verifyEmail') return json_(verifyEmail_(body));
    if (action === 'login') return json_(login_(body));
    if (action === 'requestPasswordReset') return json_(requestPasswordReset_(body));
    if (action === 'resetPassword') return json_(resetPassword_(body));
    if (action === 'uploadProfilePhoto') return json_(uploadProfilePhoto_(body));
    if (action === 'updateProfile') return json_(updateProfile_(body));
    if (action === 'checkSession') return json_(checkSession_(body.token));
    if (action === 'adminListUsers') return json_(adminListUsers_(body));
    if (action === 'adminUpdateUser') return json_(adminUpdateUser_(body));
    if (action === 'adminBlockUser') return json_(adminBlockUser_(body));
    if (action === 'adminUnblockUser') return json_(adminUnblockUser_(body));
    if (action === 'adminSetRole') return json_(adminSetRole_(body));
    return json_({ ok:false, message:'Acción no permitida' });
  } catch (err) { return json_({ ok:false, message:err.message }); }
}
function register_(body) {
  const name = clean_(body.name); const email = email_(body.email); const password = String(body.password || '');
  if (name.length < 3) throw new Error('Escribe tu nombre completo.');
  if (password.length < 8) throw new Error('La contraseña debe tener mínimo 8 caracteres.');
  if (findUserByEmail_(email)) throw new Error('Ese correo ya está registrado.');
  assertMailCooldown_(email);
  const salt = token_(24); const id = 'USR-' + Date.now(); const code = String(Math.floor(100000 + Math.random()*900000));
  appendObject_('Users', { id, name, email, password_hash:hash_(password, salt), salt, role:'user', email_verified:false, status:'pending', block_reason:'', photo_file_id:'', photo_url:'', created_at:now_(), updated_at:now_(), last_login:'' });
  appendObject_('VerificationCodes', { id:'VER-' + Date.now(), user_id:id, email, code, type:'email', expires_at:addMinutes_(30), used:false, created_at:now_() });
  sendThrottledEmail_(email, 'Código de verificación - Work and Travel Guide RD', 'Tu código de verificación es: ' + code);
  return { ok:true, message:'Cuenta creada. Revisa tu correo para verificarla.' };
}
function verifyEmail_(body) {
  const email = email_(body.email); const code = clean_(body.code);
  const sh = sheet_('VerificationCodes'); const data = table_(sh);
  const item = data.rows.find(r => String(r.email).toLowerCase() === email && String(r.code) === code && !truth_(r.used) && new Date(r.expires_at) > new Date());
  if (!item) throw new Error('Código inválido o vencido.');
  const user = findUserByEmail_(email); if (!user) throw new Error('Usuario no encontrado.');
  updateRow_(sheet_('Users'), user.rowNumber, { email_verified:true, status:'active', updated_at:now_() }, table_(sheet_('Users')).headers);
  updateRow_(sh, item.rowNumber, { used:true }, data.headers);
  return { ok:true, message:'Correo verificado correctamente.' };
}
function login_(body) {
  const email = email_(body.email); const password = String(body.password || ''); const user = findUserByEmail_(email);
  if (!user || user.password_hash !== hash_(password, user.salt)) { logLogin_(email, false, 'Credenciales inválidas'); throw new Error('Correo o contraseña incorrectos.'); }
  if (String(user.status).toLowerCase() === 'blocked') { logLogin_(email, false, 'Cuenta bloqueada'); throw new Error('Tu cuenta ha sido bloqueada. Motivo: ' + (user.block_reason || 'No especificado')); }
  if (!truth_(user.email_verified)) throw new Error('Debes verificar tu correo antes de entrar.');
  const token = token_(64);
  appendObject_('Sessions', { token, user_id:user.id, email:user.email, role:user.role, created_at:now_(), expires_at:addDays_(14), active:true });
  updateRow_(sheet_('Users'), user.rowNumber, { last_login:now_(), updated_at:now_() }, table_(sheet_('Users')).headers);
  logLogin_(email, true, 'OK'); return { ok:true, token, user:publicUser_(user) };
}
function requestPasswordReset_(body) {
  const email = email_(body.email); const user = findUserByEmail_(email);
  if (!user) return { ok:true, message:'Si el correo existe, recibirá instrucciones.' };
  assertMailCooldown_(email);
  const code = String(Math.floor(100000 + Math.random()*900000));
  appendObject_('PasswordResets', { id:'RST-' + Date.now(), user_id:user.id, email, code, expires_at:addMinutes_(30), used:false, created_at:now_() });
  sendThrottledEmail_(email, 'Recuperación de contraseña - Work and Travel Guide RD', 'Tu código de recuperación es: ' + code);
  return { ok:true, message:'Código de recuperación enviado.' };
}
function resetPassword_(body) {
  const email = email_(body.email); const code = clean_(body.code); const password = String(body.new_password || body.password || '');
  if (password.length < 8) throw new Error('La nueva contraseña debe tener mínimo 8 caracteres.');
  const sh = sheet_('PasswordResets'); const data = table_(sh);
  const item = data.rows.find(r => String(r.email).toLowerCase() === email && String(r.code) === code && !truth_(r.used) && new Date(r.expires_at) > new Date());
  if (!item) throw new Error('Código inválido o vencido.');
  const user = findUserByEmail_(email); const salt = token_(24);
  updateRow_(sheet_('Users'), user.rowNumber, { password_hash:hash_(password, salt), salt, updated_at:now_() }, table_(sheet_('Users')).headers);
  updateRow_(sh, item.rowNumber, { used:true }, data.headers);
  return { ok:true, message:'Contraseña actualizada.' };
}

function updateProfile_(body) {
  const session = validateSession_(body.token);
  const user = findUserByEmail_(session.email);
  ensureNotBlocked_(user);
  const name = clean_(body.name);
  if (!name) throw new Error('El nombre no puede estar vacío.');
  if (name.length > 90) throw new Error('El nombre es demasiado largo.');
  const sh = sheet_('Users');
  const data = table_(sh);
  const row = data.rows.find(r => String(r.email).toLowerCase() === String(session.email).toLowerCase());
  if (!row) throw new Error('Usuario no encontrado.');
  updateRow_(sh, row.rowNumber, { name:name, updated_at:now_() }, data.headers);
  const fresh = findUserByEmail_(session.email);
  return { ok:true, message:'Perfil actualizado.', user:publicUser_(fresh) };
}

function uploadProfilePhoto_(body) {
  const session = validateSession_(body.token); const user = findUserByEmail_(session.email);
  ensureNotBlocked_(user);
  const size = Number(body.size || 0); const mime = String(body.mime_type || '');
  if (size > MAX_PHOTO_BYTES) throw new Error('La foto no puede pasar de 2 MB.');
  if (ALLOWED_MIME.indexOf(mime) === -1) throw new Error('Solo se permite JPG, JPEG, PNG o WEBP.');
  const folderId = config_('profile_folder_id'); if (!folderId) throw new Error('Falta configurar profile_folder_id en la hoja Config.');
  const bytes = Utilities.base64Decode(body.base64); const blob = Utilities.newBlob(bytes, mime, body.file_name || ('perfil-' + user.id));
  const folder = DriveApp.getFolderById(folderId); const file = folder.createFile(blob); file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  const fileId = file.getId(); const url = driveImageUrl_(fileId); const previous = user.photo_file_id;
  if (previous) { try { DriveApp.getFileById(previous).setTrashed(true); } catch(e) {} }
  updateRow_(sheet_('Users'), user.rowNumber, { photo_file_id:fileId, photo_url:url, updated_at:now_() }, table_(sheet_('Users')).headers);
  appendObject_('ProfilePhotos', { id:'PHT-' + Date.now(), user_id:user.id, file_id:fileId, url, created_at:now_(), replaced_file_id:previous || '' });
  return { ok:true, file_id:fileId, photo_url:url, message:'Foto actualizada correctamente.' };
}


function sendThrottledEmail_(email, subject, body) {
  assertMailCooldown_(email);
  MailApp.sendEmail(email, subject, body);
  markMailSent_(email);
}
function assertMailCooldown_(email) {
  const wait = Number(config_('email_cooldown_seconds') || DEFAULT_EMAIL_COOLDOWN_SECONDS || 120);
  if (!wait || wait <= 0) return;
  const props = PropertiesService.getScriptProperties();
  const now = Date.now();
  const globalLast = Number(props.getProperty('wt_last_mail_at') || 0);
  const emailKey = 'wt_last_mail_' + digestKey_(email);
  const emailLast = Number(props.getProperty(emailKey) || 0);
  const last = Math.max(globalLast, emailLast);
  if (last && (now - last) < wait * 1000) {
    const remaining = Math.ceil((wait * 1000 - (now - last)) / 1000);
    throw new Error('Para evitar saturar el sistema, espera ' + remaining + ' segundos antes de solicitar otro correo.');
  }
}
function markMailSent_(email) {
  const now = String(Date.now());
  const props = PropertiesService.getScriptProperties();
  props.setProperty('wt_last_mail_at', now);
  props.setProperty('wt_last_mail_' + digestKey_(email), now);
}
function digestKey_(value) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(value || '').toLowerCase())
    .map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('').slice(0, 24);
}

function driveImageUrl_(fileId) { return 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(fileId) + '&sz=w400'; }
function checkSession_(token) { const session = validateSession_(token); const user = findUserByEmail_(session.email); ensureNotBlocked_(user); return { ok:true, user:publicUser_(user), role:user.role }; }
function validateSession_(token) { if (!token) throw new Error('Sesión requerida.'); const data = table_(sheet_('Sessions')); const session = data.rows.find(r => r.token === token && truth_(r.active) && new Date(r.expires_at) > new Date()); if (!session) throw new Error('Sesión inválida o vencida.'); return session; }
function validateAdmin_(token, superOnly) { const session = validateSession_(token); const actor = findUserByEmail_(session.email); ensureNotBlocked_(actor); const role = String(actor.role || '').toLowerCase(); if (superOnly && role !== 'superadmin') throw new Error('Solo un superadmin puede hacer esta acción.'); if (['admin','superadmin'].indexOf(role) === -1) throw new Error('No tienes permiso para realizar esta acción.'); return actor; }
function adminListUsers_(body) { validateAdmin_(body.token); const users = table_(sheet_('Users')).rows.map(publicAdminUser_); return { ok:true, users }; }
function adminUpdateUser_(body) {
  const actor = validateAdmin_(body.token);
  const id = clean_(body.user_id || body.id); const fields = body.fields || {};
  if (!id) throw new Error('Falta el ID del usuario.');
  const sh = sheet_('Users'); const data = table_(sh); const target = data.rows.find(r => String(r.id) === id); if (!target) throw new Error('Usuario no encontrado.');
  protectSuperadmin_(actor, target, fields.role);
  const allowed = ['name','role','email_verified','status','block_reason']; const cleanFields = { updated_at:now_() };
  allowed.forEach(k => { if (fields[k] !== undefined) cleanFields[k] = fields[k]; });
  updateRow_(sh, target.rowNumber, cleanFields, data.headers); logAdmin_('updateUser', JSON.stringify({ id, fields:cleanFields, by:actor.email }));
  return { ok:true, message:'Usuario actualizado.' };
}
function adminBlockUser_(body) { const reason = clean_(body.reason); if (!reason) throw new Error('Debes escribir el motivo del bloqueo.'); return adminUpdateUser_({ token:body.token, user_id:body.user_id || body.id, fields:{ status:'blocked', block_reason:reason } }); }
function adminUnblockUser_(body) { return adminUpdateUser_({ token:body.token, user_id:body.user_id || body.id, fields:{ status:'active', block_reason:'' } }); }
function adminSetRole_(body) { const role = clean_(body.role).toLowerCase(); if (['user','moderator','admin','superadmin'].indexOf(role) === -1) throw new Error('Rol inválido.'); return adminUpdateUser_({ token:body.token, user_id:body.user_id || body.id, fields:{ role } }); }
function protectSuperadmin_(actor, target, nextRole) { const actorRole = String(actor.role || '').toLowerCase(); const targetRole = String(target.role || '').toLowerCase(); if (targetRole === 'superadmin' && actorRole !== 'superadmin') throw new Error('Un admin no puede modificar un superadmin.'); if (String(nextRole || '').toLowerCase() === 'superadmin' && actorRole !== 'superadmin') throw new Error('Solo un superadmin puede asignar el rol superadmin.'); }
function ensureNotBlocked_(user) { if (!user) throw new Error('Usuario no encontrado.'); if (String(user.status).toLowerCase() === 'blocked') throw new Error('Tu cuenta ha sido bloqueada. Motivo: ' + (user.block_reason || 'No especificado')); }
function findUserByEmail_(email) { return table_(sheet_('Users')).rows.find(r => String(r.email).toLowerCase() === String(email).toLowerCase()); }
function publicUser_(u) { const photoUrl = u.photo_file_id ? driveImageUrl_(u.photo_file_id) : (u.photo_url || ''); return { id:u.id, name:u.name, email:u.email, role:u.role, photo_file_id:u.photo_file_id || '', photo_url:photoUrl, status:u.status }; }
function publicAdminUser_(u) { const photoUrl = u.photo_file_id ? driveImageUrl_(u.photo_file_id) : (u.photo_url || ''); return { id:u.id, name:u.name, email:u.email, role:u.role, email_verified:u.email_verified, status:u.status, block_reason:u.block_reason || '', photo_file_id:u.photo_file_id || '', photo_url:photoUrl, created_at:u.created_at, updated_at:u.updated_at, last_login:u.last_login }; }
function config_(key) { const row = table_(sheet_('Config')).rows.find(r => r.clave === key); return row ? row.valor : ''; }
function hash_(password, salt) { return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + '::' + password).map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join(''); }
function token_(len) { return (Utilities.getUuid().replace(/-/g,'') + Utilities.getUuid().replace(/-/g,'')).slice(0, len || 48); }
function clean_(v) { return String(v || '').trim(); }
function email_(v) { const e=clean_(v).toLowerCase(); if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) throw new Error('Correo inválido.'); return e; }
function now_() { return new Date(); } function addMinutes_(m) { return new Date(Date.now()+m*60000); } function addDays_(d) { return new Date(Date.now()+d*86400000); }
function truth_(v) { return v === true || ['true','1','si','sí','active','activo'].indexOf(String(v).toLowerCase().trim()) !== -1; }
function sheet_(name) { const sh=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name); if(!sh) throw new Error('Falta la hoja: '+name); return sh; }
function table_(sh) { const values=sh.getDataRange().getValues(); const headers=values.shift().map(String); const rows=values.filter(r=>r.some(c=>c!=='')) .map((r,i)=>{ const o={rowNumber:i+2}; headers.forEach((h,j)=>o[h]=r[j]); return o; }); return { headers, rows }; }
function appendObject_(sheetName,obj) { const sh=sheet_(sheetName); const headers=table_(sh).headers; sh.appendRow(headers.map(h => obj[h] !== undefined ? obj[h] : '')); }
function updateRow_(sh,rowNumber,obj,headers) { Object.keys(obj).forEach(k=>{ const i=headers.indexOf(k); if(i>=0) sh.getRange(rowNumber,i+1).setValue(obj[k]); }); }
function logLogin_(email,success,message) { appendObject_('LoginLogs', { id:'LOG-'+Date.now(), email, success, message, created_at:now_() }); }
function logAdmin_(accion, detalle) { try { appendObject_('AdminLogs', { id:'ADM-'+Date.now(), accion, detalle, usuario:Session.getActiveUser().getEmail(), fecha:now_() }); } catch(e) {} }
function json_(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }

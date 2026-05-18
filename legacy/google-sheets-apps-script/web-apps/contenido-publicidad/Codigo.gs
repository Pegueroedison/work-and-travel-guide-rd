/**
 * WEB APP — Contenido y Publicidad
 * Devuelve contenido público y recibe cambios administrativos desde admin.html.
 * Importante: las acciones admin validan token y rol contra la Web App de Usuarios.
 */
function doGet(e) {
  try {
    const rawAction = (e.parameter.action || '');
    const action = rawAction.toLowerCase();
    if (action === 'public') return json_({ ok:true, data:getPublicData_() }, e);

    // Soporte JSONP para el Panel Admin en GitHub Pages.
    // Esto evita que el navegador se quede bloqueado por CORS/redirects al guardar contenido.
    if (action.indexOf('admin') === 0) {
      const body = e.parameter.payload ? JSON.parse(e.parameter.payload) : {};
      body.action = body.action || rawAction;
      body.token = body.token || e.parameter.token || '';
      body.usersApiUrl = body.usersApiUrl || e.parameter.usersApiUrl || '';
      return handleAdminRequest_(body, e);
    }

    return json_({ ok:true, service:'contenido-publicidad', message:'Web App activa. Usa action=public para contenido público.' }, e);
  } catch (err) {
    return json_({ ok:false, message:err.message }, e);
  }
}

function doPost(e) {
  try {
    var body = {};
    if (e && e.parameter && e.parameter.payload) {
      body = JSON.parse(e.parameter.payload || '{}');
    } else {
      body = JSON.parse((e.postData && e.postData.contents) || '{}');
    }
    return handleAdminRequest_(body, e);
  } catch (err) {
    return json_({ ok:false, message:err.message }, e);
  }
}

function handleAdminRequest_(body, e) {
  const action = body.action || '';
  try {
    log_('intento_admin', action, JSON.stringify({
      hasToken: !!body.token,
      usersApiUrl: !!(body.usersApiUrl || config_('users_api_url')),
      sheetName: body.sheetName || '',
      hasRow: !!body.row,
      hasFile: !!(body.file && body.file.base64)
    }));

    if (action === 'adminDiagnostic') {
      validateAdmin_(body.token, body.usersApiUrl);
      log_('diagnostico_ok', action, 'Panel conectado correctamente');
      return json_({ ok:true, message:'Diagnóstico correcto. La Web App de Contenido recibió la solicitud.' }, e);
    }
    if (action === 'adminListAll') {
      validateAdmin_(body.token, body.usersApiUrl);
      return json_({ ok:true, data:adminListAll_() }, e);
    }
    if (action === 'adminUploadImage') {
      validateAdmin_(body.token, body.usersApiUrl);
      return json_(adminUploadImage_(body), e);
    }
    if (action === 'adminSaveRowWithImage') {
      validateAdmin_(body.token, body.usersApiUrl);
      return json_(adminSaveRowWithImage_(body), e);
    }
    if (action === 'adminPrepareContentStorage') {
      validateAdmin_(body.token, body.usersApiUrl);
      return json_(adminPrepareContentStorage_(), e);
    }
    if (action === 'adminSaveRow') {
      validateAdmin_(body.token, body.usersApiUrl);
      return json_(adminSaveRow_(body.sheetName, body.row), e);
    }
    if (action === 'adminDeleteRow') {
      validateAdmin_(body.token, body.usersApiUrl);
      return json_(adminDeleteRow_(body.sheetName, body.id), e);
    }

    log_('accion_no_permitida', action, JSON.stringify(body || {}));
    return json_({ ok:false, message:'Acción no permitida: ' + action }, e);
  } catch (err) {
    log_('error_admin', action, err.message || String(err));
    return json_({ ok:false, message:err.message || String(err) }, e);
  }
}

function getPublicData_() {
  return {
    config: rows_('Config'),
    ads: rows_('Anuncios').map(normalizeBooleans_),
    services: rows_('ServiciosJ1').map(normalizeBooleans_),
    englishCourses: rows_('CursoIngles').map(normalizeBooleans_),
    englishCourse: rows_('CursoIngles').map(normalizeBooleans_).find(r => truth_(r.activo)) || {},
    groups: rows_('GruposWhatsApp').map(normalizeBooleans_),
    instagram: rows_('Instagram').map(normalizeBooleans_)[0] || { activo:false }
  };
}

function adminListAll_() {
  return ['Config','Anuncios','ServiciosJ1','CursoIngles','GruposWhatsApp','Instagram'].reduce((acc, name) => {
    acc[name] = table_(sheet_(name));
    return acc;
  }, {});
}


function validateContentRow_(sheetName, row) {
  row = row || {};

  function has(k) {
    return row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '';
  }
  function any(keys) {
    return keys.some(function(k){ return has(k); });
  }
  function need(k, label) {
    if (!has(k)) throw new Error(label + ' es obligatorio.');
  }

  const meaningful = Object.keys(row).some(function(k) {
    if (['id','clave','orden','activo','destacado','principal','mostrar_inicio','mostrar_footer','mostrar_comunidad','delay_ms'].indexOf(k) !== -1) return false;
    return row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '';
  });
  if (!meaningful) throw new Error('No puedes guardar una configuración vacía.');

  if (sheetName === 'Anuncios') {
    need('tipo', 'El tipo de anuncio');
    need('posicion', 'La posición del anuncio');
    need('titulo', 'El título del anuncio');
    need('descripcion', 'La descripción del anuncio');
    if (!any(['enlace','imagen_url','image_file_id'])) {
      throw new Error('El anuncio necesita un enlace o una imagen.');
    }
  }

  if (sheetName === 'ServiciosJ1') {
    need('nombre', 'El nombre del servicio');
    need('descripcion', 'La descripción del servicio');
    if (!any(['enlace','imagen_url','image_file_id'])) {
      throw new Error('El servicio necesita un enlace/contacto o una imagen.');
    }
  }

  if (sheetName === 'CursoIngles') {
    need('titulo', 'El título del curso');
    need('descripcion', 'La descripción del curso');
    if (!any(['enlace','imagen_url','image_file_id'])) {
      throw new Error('El curso necesita un enlace/contacto o una imagen.');
    }
  }

  if (sheetName === 'Instagram') {
    if (truth_(row.activo) || truth_(row.mostrar_inicio) || truth_(row.mostrar_footer) || truth_(row.mostrar_comunidad)) {
      need('url', 'El enlace de Instagram');
    }
  }

  if (sheetName === 'GruposWhatsApp') {
    need('nombre', 'El nombre del grupo');
    need('enlace', 'El enlace del grupo');
  }

  if (sheetName === 'Config') {
    need('clave', 'La clave de configuración');
    need('valor', 'El valor de configuración');
  }
}

function adminSaveRow_(sheetName, row) {
  const allowed = ['Config','Anuncios','ServiciosJ1','CursoIngles','GruposWhatsApp','Instagram'];
  if (allowed.indexOf(sheetName) === -1) throw new Error('Hoja no permitida.');
  if (!row || typeof row !== 'object') throw new Error('Datos inválidos.');

  if (['Anuncios','ServiciosJ1','CursoIngles'].indexOf(sheetName) !== -1) ensureImageColumns_(sheetName);

  const sh = sheet_(sheetName);
  const data = table_(sh);

  if (sheetName === 'Config') {
    row.clave = clean_(row.clave || row.id);
    if (!row.clave) throw new Error('La clave es obligatoria para Config.');
  } else {
    row.id = clean_(row.id);
    if (!row.id) throw new Error('El id es obligatorio.');
  }

  validateContentRow_(sheetName, row);

  validateContentRow_(sheetName, row, false);

  const id = String(row.id || row.clave || '').trim();
  const target = data.rows.find(r => String(r.id || r.clave) === id);
  if (target) updateRow_(sh, target.rowNumber, row, data.headers);
  else sh.appendRow(data.headers.map(h => row[h] !== undefined ? row[h] : ''));

  log_('guardar', sheetName, JSON.stringify(row));
  return { ok:true, message:'Guardado correctamente.' };
}

function adminDeleteRow_(sheetName, id) {
  const allowed = ['Config','Anuncios','ServiciosJ1','CursoIngles','GruposWhatsApp','Instagram'];
  if (allowed.indexOf(sheetName) === -1) throw new Error('Hoja no permitida.');
  const sh = sheet_(sheetName);
  const data = table_(sh);
  const row = data.rows.find(r => String(r.id || r.clave) === String(id));
  if (!row) throw new Error('Registro no encontrado.');
  sh.deleteRow(row.rowNumber);
  log_('eliminar', sheetName, id);
  return { ok:true, message:'Eliminado correctamente.' };
}

function adminPrepareContentStorage_() {
  const folder = getOrCreateContentFolder_();
  ['Anuncios','ServiciosJ1','CursoIngles'].forEach(function(name){ ensureImageColumns_(name); });
  SpreadsheetApp.flush();
  return { ok:true, message:'Carpeta de imágenes preparada correctamente.', folder:{ id:folder.getId(), name:folder.getName(), url:folder.getUrl() } };
}

/**
 * Sube imágenes para anuncios, servicios y curso de inglés.
 * El archivo queda público con enlace para que GitHub Pages pueda mostrarlo.
 */
function adminUploadImage_(body) {
  const allowedSheets = ['Anuncios','ServiciosJ1','CursoIngles'];
  const sheetName = clean_(body.sheetName);
  if (allowedSheets.indexOf(sheetName) === -1) throw new Error('Esta hoja no permite imágenes desde el panel.');

  const file = body.file || {};
  const name = clean_(file.name || ('imagen-' + Date.now()));
  const mimeType = clean_(file.mimeType || '');
  const size = Number(file.size || 0);
  const base64 = String(file.base64 || '');
  const maxMb = Number(config_('max_content_image_mb') || 3);
  const maxBytes = maxMb * 1024 * 1024;
  const allowedTypes = ['image/jpeg','image/jpg','image/png','image/webp'];

  if (!base64) throw new Error('No se recibió la imagen.');
  if (allowedTypes.indexOf(mimeType) === -1) throw new Error('Formato no permitido. Usa JPG, JPEG, PNG o WEBP.');
  if (size > maxBytes) throw new Error('La imagen no puede pasar de ' + maxMb + ' MB.');

  ensureImageColumns_(sheetName);

  const root = getOrCreateContentFolder_();
  const subFolder = getOrCreateSubFolder_(root, clean_(body.folder || sheetName));
  const safeName = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd-HHmmss') + '-' + name.replace(/[^\w.\-áéíóúÁÉÍÓÚñÑ ]/g, '_');
  const blob = Utilities.newBlob(Utilities.base64Decode(base64), mimeType, safeName);
  const driveFile = subFolder.createFile(blob);

  // Si la carpeta/archivo ya es público, no hace falta forzar permisos.
  // Algunas cuentas suben el archivo correctamente, pero bloquean setSharing()
  // con "Acceso denegado: DriveApp". Eso no debe cancelar el guardado.
  var sharingWarning = '';
  try {
    driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (err) {
    sharingWarning = 'La imagen se subió, pero Apps Script no pudo cambiar permisos con setSharing: ' + (err.message || err);
    log_('advertencia_drive', sheetName, sharingWarning);
  }

  const fileId = driveFile.getId();
  const imageUrl = 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(fileId) + '&sz=w900';

  log_('subir_imagen', sheetName, JSON.stringify({ recordId: body.recordId || '', fileId: fileId, name: safeName, warning: sharingWarning }));

  return {
    ok:true,
    image:{
      file_id:fileId,
      image_file_id:fileId,
      image_url:imageUrl,
      url:imageUrl,
      name:safeName,
      size:size,
      mimeType:mimeType
    }
  };
}

/**
 * Ejecutar una sola vez en instalaciones existentes.
 * No borra datos. Solo agrega columnas y configuración si faltan.
 */

function adminSaveRowWithImage_(body) {
  const sheetName = clean_(body.sheetName);
  const row = body.row || {};
  validateContentRow_(sheetName, row, !!(body.file && body.file.base64));
  if (body.file && body.file.base64) {
    const upload = adminUploadImage_({
      sheetName: sheetName,
      folder: body.folder || sheetName,
      file: body.file
    });
    const image = upload.image || {};
    row.imagen_url = image.image_url || row.imagen_url || '';
    row.image_file_id = image.file_id || image.image_file_id || '';
    row.image_name = image.name || '';
    row.image_size = image.size || '';
    row.image_type = image.mimeType || '';
  }
  return adminSaveRow_(sheetName, row);
}


function actualizarColumnasContenido() {
  ['Anuncios','ServiciosJ1','CursoIngles'].forEach(function(name){ ensureImageColumns_(name); });
  ensureConfigRow_('content_images_folder_id', getOrCreateContentFolder_().getId(), 'Carpeta de Drive donde se guardan imágenes subidas desde el Panel Admin.');
  ensureConfigRow_('max_content_image_mb', '3', 'Tamaño máximo de imágenes administrables en MB.');
  SpreadsheetApp.flush();
}

function ensureImageColumns_(sheetName) {
  const allowed = ['Anuncios','ServiciosJ1','CursoIngles'];
  if (allowed.indexOf(sheetName) === -1) return;

  const sh = sheet_(sheetName);
  const needed = ['image_file_id','image_name','image_size','image_type'];
  let headers = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(String);
  let changed = false;

  needed.forEach(function(h) {
    if (headers.indexOf(h) === -1) {
      sh.insertColumnAfter(sh.getLastColumn());
      sh.getRange(1, sh.getLastColumn()).setValue(h);
      headers.push(h);
      changed = true;
    }
  });

  if (changed) formatNewHeader_(sh);
}

function formatNewHeader_(sh) {
  const cols = sh.getLastColumn();
  sh.setFrozenRows(1);
  sh.getRange(1,1,1,cols)
    .setBackground('#0d1b3e').setFontColor('#ffffff').setFontWeight('bold')
    .setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);
  sh.getRange(1,1,Math.max(sh.getLastRow(),2),cols)
    .setBorder(true,true,true,true,true,true,'#d9e2f3',SpreadsheetApp.BorderStyle.SOLID);
  try {
    const f = sh.getFilter(); if (f) f.remove();
    sh.getRange(1,1,Math.max(sh.getLastRow(),2),cols).createFilter();
  } catch(e) {}
  const headers = sh.getRange(1,1,1,cols).getValues()[0].map(String);
  headers.forEach(function(h,i) {
    const name = h.toLowerCase();
    if (name.indexOf('image_') === 0 || name === 'imagen_url') sh.setColumnWidth(i+1, 220);
  });
}

function getOrCreateContentFolder_() {
  const key = 'content_images_folder_id';
  let id = config_(key);
  if (id) {
    try { return DriveApp.getFolderById(id); } catch(e) {}
  }
  const folderName = 'WT Guide RD - Imagenes de Contenido';
  const existing = DriveApp.getFoldersByName(folderName);
  const folder = existing.hasNext() ? existing.next() : DriveApp.createFolder(folderName);
  ensureConfigRow_(key, folder.getId(), 'Carpeta de Drive donde se guardan imágenes subidas desde el Panel Admin.');
  ensureConfigRow_('max_content_image_mb', '3', 'Tamaño máximo de imágenes administrables en MB.');
  return folder;
}

function getOrCreateSubFolder_(parent, name) {
  name = name || 'Contenido';
  const it = parent.getFoldersByName(name);
  if (it.hasNext()) return it.next();
  return parent.createFolder(name);
}

function ensureConfigRow_(clave, valor, descripcion) {
  const sh = sheet_('Config');
  const data = table_(sh);
  const row = data.rows.find(function(r){ return String(r.clave) === String(clave); });
  const headers = data.headers;
  if (row) {
    if (!row.valor && valor && headers.indexOf('valor') >= 0) sh.getRange(row.rowNumber, headers.indexOf('valor') + 1).setValue(valor);
    if (descripcion && headers.indexOf('descripcion') >= 0) sh.getRange(row.rowNumber, headers.indexOf('descripcion') + 1).setValue(descripcion);
  } else {
    sh.appendRow([clave, valor || '', descripcion || '']);
  }
}

function validateAdmin_(token, usersApiUrl) {
  if (!token) throw new Error('Sesión requerida.');
  const url = config_('users_api_url') || clean_(usersApiUrl);
  if (!url) throw new Error('Falta configurar USERS_API_URL. Pega la URL de la Web App de Usuarios en js/config.js o en la hoja Config con la clave users_api_url.');
  if (!config_('users_api_url') && usersApiUrl) {
    try { ensureConfigRow_('users_api_url', usersApiUrl, 'URL de la Web App de Usuarios para validar tokens y roles del panel admin.'); } catch(e) {}
  }
  const res = UrlFetchApp.fetch(url, {
    method:'post',
    contentType:'text/plain;charset=utf-8',
    payload:JSON.stringify({ action:'checkSession', token }),
    muteHttpExceptions:true
  });
  const txt = res.getContentText();
  let data;
  try { data = JSON.parse(txt); } catch(e) { throw new Error('La Web App de Usuarios no devolvió JSON válido al validar sesión. Respuesta: ' + String(txt).slice(0,120)); }
  if (data.ok === false) throw new Error(data.message || 'Sesión inválida.');
  const user = data.user || (data.data && data.data.user) || data;
  const role = String(user.role || '').toLowerCase();
  if (['admin','superadmin'].indexOf(role) === -1) throw new Error('No tienes permiso para realizar esta acción.');
  return user;
}

function config_(key) {
  const row = table_(sheet_('Config')).rows.find(r => String(r.clave) === String(key));
  return row ? row.valor : '';
}

function rows_(name) {
  return table_(sheet_(name)).rows
    .map(({rowNumber, ...rest}) => rest)
    .filter(r => Object.values(r).some(v => v !== ''));
}

function sheet_(name) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sh) throw new Error('Falta la hoja ' + name);
  return sh;
}

function table_(sh) {
  const values = sh.getDataRange().getValues();
  const headers = values.shift().map(h => String(h).trim());
  const rows = values
    .filter(r => r.some(c => c !== ''))
    .map((r,i) => {
      const o = { rowNumber:i+2 };
      headers.forEach((h,j) => o[h] = r[j]);
      return o;
    });
  return { headers, rows };
}

function updateRow_(sh, rowNumber, obj, headers) {
  Object.keys(obj).forEach(k => {
    const idx = headers.indexOf(k);
    if (idx >= 0) sh.getRange(rowNumber, idx+1).setValue(obj[k]);
  });
}

function normalizeBooleans_(obj) {
  ['activo','destacado','principal','mostrar_inicio','mostrar_footer','mostrar_comunidad'].forEach(k => {
    if (k in obj) obj[k] = truth_(obj[k]);
  });
  return obj;
}

function truth_(v) {
  return v === true || ['true','1','si','sí','activo','active'].indexOf(String(v).toLowerCase().trim()) !== -1;
}

function clean_(v) {
  return String(v || '').trim();
}

function ensureLogSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName('AdminLogs');
  if (!sh) {
    sh = ss.insertSheet('AdminLogs');
    sh.appendRow(['id','accion','hoja','detalle','usuario','fecha']);
    sh.getRange(1,1,1,6).setBackground('#0d1b3e').setFontColor('#ffffff').setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

function logAttempt_(accion, action, hoja, detalle) {
  try {
    ensureLogSheet_().appendRow(['LOG-' + Date.now(), accion + ':' + action, hoja || '', detalle || '', Session.getActiveUser().getEmail(), new Date()]);
  } catch(e) {}
}


function logSafe_(accion, hoja, detalle) {
  try {
    sheet_('AdminLogs').appendRow(['LOG-' + Date.now(), accion, hoja, detalle, Session.getActiveUser().getEmail(), new Date()]);
  } catch(e) {}
}

function log_(accion, hoja, detalle) {
  try {
    ensureLogSheet_().appendRow(['LOG-' + Date.now(), accion, hoja, detalle, Session.getActiveUser().getEmail(), new Date()]);
  } catch(e) {}
}

function json_(obj, e) {
  const callback = e && e.parameter && e.parameter.callback;
  const text = callback ? callback + '(' + JSON.stringify(obj) + ')' : JSON.stringify(obj);
  return ContentService
    .createTextOutput(text)
    .setMimeType(callback ? ContentService.MimeType.JAVASCRIPT : ContentService.MimeType.JSON);
}


function actualizarColumnasImagenPosicion() {
  ['Anuncios','CursoIngles'].forEach(function(name) {
    var sh = sheet_(name);
    var headers = sh.getRange(1,1,1,Math.max(1,sh.getLastColumn())).getValues()[0].map(String);
    if (headers.indexOf('image_position') === -1) {
      sh.getRange(1, sh.getLastColumn() + 1).setValue('image_position');
    }
  });
  SpreadsheetApp.flush();
}

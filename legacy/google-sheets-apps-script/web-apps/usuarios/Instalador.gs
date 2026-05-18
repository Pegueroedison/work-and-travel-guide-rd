/**
 * INSTALADOR — Web App de Usuarios
 * Ejecutar una sola vez. Crea hojas, validaciones, formato profesional y carpeta de Drive para fotos.
 */
function instalarUsuarios() {
  const ss = SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.create('WT Guide RD - Usuarios');
  const folder = DriveApp.createFolder('WT Guide RD - Fotos de Perfil');
  crearHoja_(ss, 'Config', ['clave','valor','descripcion'], [
    ['profile_folder_id', folder.getId(), 'Carpeta de Google Drive donde se guardan las fotos de perfil.'],
    ['max_photo_mb', 2, 'Tamaño máximo de foto de perfil en MB.'],
    ['email_cooldown_seconds', 120, 'Tiempo mínimo entre correos enviados por el sistema. Evita saturación y abuso.'],
    ['app_name', 'Work and Travel Guide RD', 'Nombre del proyecto']
  ]);
  crearHoja_(ss, 'Users', ['id','name','email','password_hash','salt','role','email_verified','status','block_reason','photo_file_id','photo_url','created_at','updated_at','last_login'], []);
  crearHoja_(ss, 'VerificationCodes', ['id','user_id','email','code','type','expires_at','used','created_at'], []);
  crearHoja_(ss, 'PasswordResets', ['id','user_id','email','code','expires_at','used','created_at'], []);
  crearHoja_(ss, 'Sessions', ['token','user_id','email','role','created_at','expires_at','active'], []);
  crearHoja_(ss, 'LoginLogs', ['id','email','success','message','created_at'], []);
  crearHoja_(ss, 'ProfilePhotos', ['id','user_id','file_id','url','created_at','replaced_file_id'], []);
  crearHoja_(ss, 'AdminLogs', ['id','accion','detalle','usuario','fecha'], []);
  aplicarValidaciones_(ss);
  SpreadsheetApp.flush();
  Logger.log('Instalación completada: ' + ss.getUrl());
  Logger.log('Carpeta de fotos: ' + folder.getUrl());
}
function crearHoja_(ss, nombre, headers, rows) {
  let sh = ss.getSheetByName(nombre); if (!sh) sh = ss.insertSheet(nombre); sh.clear();
  sh.getRange(1,1,1,headers.length).setValues([headers]);
  if (rows && rows.length) sh.getRange(2,1,rows.length,headers.length).setValues(rows);
  formatearHoja_(sh, headers, nombre);
}
function formatearHoja_(sh, headers, nombre) {
  const cols = headers.length;
  sh.setFrozenRows(1); sh.setTabColor(nombre === 'Users' ? '#c41e2a' : '#0d1b3e');
  sh.getRange(1,1,1,cols).setBackground('#0d1b3e').setFontColor('#ffffff').setFontWeight('bold').setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);
  sh.setRowHeight(1, 40);
  sh.getRange(1,1,Math.max(sh.getMaxRows(),50),cols).setWrap(true).setVerticalAlignment('middle').setFontSize(10);
  sh.getRange(1,1,Math.max(sh.getLastRow(),2),cols).setBorder(true,true,true,true,true,true,'#d9e2f3',SpreadsheetApp.BorderStyle.SOLID);
  const filter = sh.getFilter(); if (filter) filter.remove(); sh.getRange(1,1,Math.max(sh.getLastRow(),2),cols).createFilter();
  try { sh.getBandings().forEach(b => b.remove()); sh.getRange(1,1,Math.max(sh.getLastRow(),2),cols).applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY); } catch(e) {}
  headers.forEach((h,i)=>{ const n=String(h).toLowerCase(); let w=130; if(['name','email','block_reason'].includes(n)) w=230; if(n.includes('hash')||n.includes('token')||n.includes('salt')) w=260; if(n.includes('url')||n.includes('file_id')) w=240; if(n.includes('created')||n.includes('updated')||n.includes('expires')) w=150; sh.setColumnWidth(i+1,w); });
}
function aplicarValidaciones_(ss) {
  const bool = SpreadsheetApp.newDataValidation().requireValueInList(['TRUE','FALSE'], true).build();
  const roles = SpreadsheetApp.newDataValidation().requireValueInList(['user','moderator','admin','superadmin'], true).build();
  const status = SpreadsheetApp.newDataValidation().requireValueInList(['pending','active','blocked'], true).build();
  setValidation_(ss,'Users','role',roles); setValidation_(ss,'Users','status',status); setValidation_(ss,'Users','email_verified',bool);
  ['VerificationCodes','PasswordResets','Sessions'].forEach(name => { ['used','active'].forEach(h => setValidation_(ss,name,h,bool)); });
}
function setValidation_(ss, sheetName, header, rule) {
  const sh=ss.getSheetByName(sheetName); if(!sh) return; const headers=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(String); const idx=headers.indexOf(header); if(idx<0) return; sh.getRange(2,idx+1,Math.max(sh.getMaxRows()-1,1),1).setDataValidation(rule);
}

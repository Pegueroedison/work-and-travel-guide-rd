/**
 * INSTALADOR — Web App del Foro
 * Ejecutar una sola vez. Crea tablas profesionales para publicaciones, respuestas, reportes y moderación.
 */
function instalarForo() {
  const ss = SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.create('WT Guide RD - Foro');
  crearHoja_(ss, 'Config', ['clave','valor','descripcion'], [
    ['users_api_url','','Pega aquí la URL de la Web App de Usuarios para validar sesiones y roles.'],
    ['moderation_links',true,'Enviar a moderación comentarios con enlaces.'],
    ['moderation_phone',true,'Enviar a moderación comentarios con teléfonos.'],
    ['moderation_email',true,'Enviar a moderación comentarios con correos.'],
    ['comments_require_approval',false,'Si está TRUE, todos los comentarios nuevos requieren aprobación manual.'],
    ['public_read',true,'Permitir ver publicaciones públicas sin iniciar sesión.']
  ]);
  crearHoja_(ss, 'Posts', ['id','title','body','category','author_id','author_name','author_email','author_role','author_photo_file_id','author_photo_url','status','moderation_reason','created_at','updated_at','reports_count'], []);
  crearHoja_(ss, 'Comments', ['id','post_id','body','author_id','author_name','author_email','author_role','author_photo_file_id','author_photo_url','status','moderation_reason','created_at','updated_at','reports_count'], []);
  crearHoja_(ss, 'Reports', ['id','target_type','target_id','reporter_id','reporter_email','reason','status','created_at','resolved_at','resolved_by'], []);
  crearHoja_(ss, 'ModerationQueue', ['id','target_type','target_id','reason','status','created_at','reviewed_at','reviewed_by','note'], []);
  crearHoja_(ss, 'Categories', ['id','name','description','order','active'], [
    ['CAT-001','Dudas J1','Preguntas generales del programa.',1,true],
    ['CAT-002','Entrevista','Preguntas y práctica consular.',2,true],
    ['CAT-003','Documentos','Récord, MESCyT, DS-2019, SEVIS y otros.',3,true],
    ['CAT-004','Trabajo','Empleadores, housing y horarios.',4,true],
    ['CAT-005','Internet USA','Internet, número de USA y eSIM.',5,true]
  ]);
  crearHoja_(ss, 'AdminLogs', ['id','accion','detalle','usuario','fecha'], []);
  aplicarValidaciones_(ss);
  SpreadsheetApp.flush();
  Logger.log('Instalación completada: ' + ss.getUrl());
}
function crearHoja_(ss,nombre,headers,rows){let sh=ss.getSheetByName(nombre);if(!sh)sh=ss.insertSheet(nombre);sh.clear();sh.getRange(1,1,1,headers.length).setValues([headers]);if(rows&&rows.length)sh.getRange(2,1,rows.length,headers.length).setValues(rows);formatearHoja_(sh,headers,nombre)}
function formatearHoja_(sh,headers,nombre){const cols=headers.length;sh.setFrozenRows(1);sh.setTabColor(nombre==='Posts'?'#c41e2a':'#0d1b3e');sh.getRange(1,1,1,cols).setBackground('#0d1b3e').setFontColor('#fff').setFontWeight('bold').setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);sh.setRowHeight(1,40);sh.getRange(1,1,Math.max(sh.getMaxRows(),50),cols).setWrap(true).setVerticalAlignment('middle').setFontSize(10);sh.getRange(1,1,Math.max(sh.getLastRow(),2),cols).setBorder(true,true,true,true,true,true,'#d9e2f3',SpreadsheetApp.BorderStyle.SOLID);const filter=sh.getFilter();if(filter)filter.remove();sh.getRange(1,1,Math.max(sh.getLastRow(),2),cols).createFilter();try{sh.getBandings().forEach(b=>b.remove());sh.getRange(1,1,Math.max(sh.getLastRow(),2),cols).applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY)}catch(e){}headers.forEach((h,i)=>{const n=String(h).toLowerCase();let w=130;if(['body','reason','moderation_reason','description','note'].includes(n))w=330;if(n.includes('email')||n.includes('author'))w=220;if(n==='author_photo_url')w=330;if(n==='author_photo_file_id')w=180;if(n==='author_role')w=130;if(n.includes('created')||n.includes('updated')||n.includes('resolved')||n.includes('reviewed'))w=150;sh.setColumnWidth(i+1,w)})}
function aplicarValidaciones_(ss){const status=SpreadsheetApp.newDataValidation().requireValueInList(['pending','approved','rejected','deleted'],true).build();const reportStatus=SpreadsheetApp.newDataValidation().requireValueInList(['open','reviewed','dismissed'],true).build();const bool=SpreadsheetApp.newDataValidation().requireValueInList(['TRUE','FALSE'],true).build();setValidation_(ss,'Posts','status',status);setValidation_(ss,'Comments','status',status);setValidation_(ss,'Reports','status',reportStatus);setValidation_(ss,'ModerationQueue','status',reportStatus);setValidation_(ss,'Categories','active',bool);['moderation_links','moderation_phone','moderation_email','comments_require_approval','public_read'].forEach(k=>{})}
function setValidation_(ss,sheetName,header,rule){const sh=ss.getSheetByName(sheetName);if(!sh)return;const headers=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(String);const idx=headers.indexOf(header);if(idx<0)return;sh.getRange(2,idx+1,Math.max(sh.getMaxRows()-1,1),1).setDataValidation(rule)}

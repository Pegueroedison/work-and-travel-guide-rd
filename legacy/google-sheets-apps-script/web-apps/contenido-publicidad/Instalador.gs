/**
 * INSTALADOR — Web App de Contenido y Publicidad
 * Ejecutar una sola vez. Crea las hojas con formato profesional.
 */
function instalarContenidoPublicidad() {
  const ss = SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.create('WT Guide RD - Contenido y Publicidad');
  crearHoja_(ss, 'Config', ['clave','valor','descripcion'], [
    ['site_name','Work and Travel Guide RD','Nombre público del proyecto'],
    ['community_name','Comunidad Work and Travel RD','Nombre de la comunidad'],
    ['admin_email','','Correo del administrador principal'],
    ['users_api_url','','URL de la Web App de Usuarios para validar tokens y roles del panel admin'],
    ['content_images_folder_id','','Carpeta de Drive donde se guardan imágenes subidas desde el Panel Admin'],
    ['max_content_image_mb','3','Tamaño máximo de imágenes administrables en MB']
  ]);
  crearHoja_(ss, 'Anuncios', ['id','tipo','titulo','descripcion','imagen_url','enlace','cta','posicion','orden','destacado','activo','delay_ms','fecha_inicio','fecha_fin','image_file_id','image_name','image_size','image_type'], [
    ['AD-001','banner_principal','Bienvenido a Work and Travel Guide RD','Banner administrable desde Google Sheets.','','#servicios','Ver servicios','inicio',1,true,true,0,'','','','','',''],
    ['AD-002','destacado','Aviso destacado','Aprovecha la pantalla azul del inicio para colocar anuncios sin dañar el diseño.','','#comunidad','Ver comunidad','hero',1,true,true,0,'','','','','',''],
    ['AD-003','entre_secciones','Servicio destacado','Anuncio entre secciones.','','#servicios','Más información','despues_servicios',1,false,true,0,'','','','','',''],
    ['AD-004','popup','Aviso importante','Popup emergente administrable desde Sheets.','','#comunidad','Entendido','popup',1,false,false,2500,'','','','','','']
  ]);
  crearHoja_(ss, 'ServiciosJ1', ['id','nombre','descripcion','icono','imagen_url','enlace','cta','orden','destacado','activo','image_file_id','image_name','image_size','image_type'], [
    ['SVC-001','Taxes Work and Travel','Orientación para organizar tus documentos de taxes.','🧾','','#comunidad','Solicitar información',1,false,true,'','','',''],
    ['SVC-002','Asesoría J1','Apoyo general sobre sponsor, DS-2019, SEVIS, empleo, viaje y dudas frecuentes.','🇺🇸','','#comunidad','Hablar con la comunidad',2,true,true,'','','',''],
    ['SVC-003','Preparación para entrevista','Práctica de preguntas consulares, pronunciación y respuestas naturales.','🎙️','','#preguntas','Practicar ahora',3,true,true,'','','',''],
    ['SVC-004','Ayuda con documentos','Guías para récord de notas, MESCyT, certificados y documentos universitarios.','📄','','#record','Ver guía',4,false,true,'','','',''],
    ['SVC-005','Internet USA','Guía para activar internet y número de Estados Unidos.','📱','','#internet','Ver recomendación',5,false,true,'','','','']
  ]);
  crearHoja_(ss, 'CursoIngles', ['id','titulo','descripcion','precio','imagen_url','enlace','cta','orden','destacado','activo','image_file_id','image_name','image_size','image_type'], [
    ['ENG-001','Curso de inglés para entrevista J1','Curso administrable desde Google Sheets. Puedes cambiar texto, precio, enlace y estado sin tocar GitHub.','RD$0','','#comunidad','Solicitar información',1,true,true,'','','','']
  ]);
  crearHoja_(ss, 'GruposWhatsApp', ['id','nombre','estado','descripcion','enlace','orden','destacado','principal','activo'], [
    ['WA-001','Grupo Principal Work and Travel RD','General','Comunidad principal para estudiantes dominicanos.','https://chat.whatsapp.com/',1,true,true,true],
    ['WA-002','Grupo New York J1','New York','Grupo para estudiantes que van a New York.','',2,false,false,true],
    ['WA-003','Grupo New Jersey J1','New Jersey','Grupo para estudiantes que van a New Jersey.','',3,false,false,true]
  ]);
  crearHoja_(ss, 'Instagram', ['id','url','texto_boton','mostrar_inicio','mostrar_footer','mostrar_comunidad','activo'], [
    ['IG-001','https://www.instagram.com/','Síguenos en Instagram',true,true,true,false]
  ]);
  crearHoja_(ss, 'AdminLogs', ['id','accion','hoja','detalle','usuario','fecha'], []);
  aplicarValidaciones_(ss);
  aplicarFormatoExtra_(ss);
  SpreadsheetApp.flush();
  Logger.log('Instalación completada: ' + ss.getUrl());
}
function crearHoja_(ss, nombre, headers, rows) {
  let sh = ss.getSheetByName(nombre);
  if (!sh) sh = ss.insertSheet(nombre);
  sh.clear();
  sh.getRange(1,1,1,headers.length).setValues([headers]);
  if (rows && rows.length) sh.getRange(2,1,rows.length,headers.length).setValues(rows);
  formatearHoja_(sh, headers);
}
function formatearHoja_(sh, headers) {
  const cols = headers.length;
  sh.setFrozenRows(1);
  sh.setTabColor('#0d1b3e');
  sh.getRange(1,1,1,cols)
    .setBackground('#0d1b3e').setFontColor('#ffffff').setFontWeight('bold')
    .setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);
  sh.setRowHeight(1, 38);
  const maxRows = Math.max(sh.getMaxRows(), 50);
  sh.getRange(1,1,maxRows,cols).setVerticalAlignment('middle').setWrap(true);
  sh.getRange(1,1,Math.max(sh.getLastRow(),2),cols).setBorder(true,true,true,true,true,true,'#d9e2f3',SpreadsheetApp.BorderStyle.SOLID);
  const filter = sh.getFilter(); if (filter) filter.remove();
  sh.getRange(1,1,Math.max(sh.getLastRow(),2),cols).createFilter();
  try { sh.getBandings().forEach(b => b.remove()); sh.getRange(1,1,Math.max(sh.getLastRow(),2),cols).applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY); } catch(e) {}
  headers.forEach((h, i) => {
    const name = String(h).toLowerCase();
    let width = 130;
    if (['descripcion','detalle'].includes(name)) width = 310;
    if (name.includes('url') || name === 'enlace') width = 260;
    if (name.includes('fecha')) width = 145;
    if (['id','orden','tipo','activo','cta','precio','estado'].includes(name)) width = 120;
    sh.setColumnWidth(i+1, width);
  });
}
function aplicarValidaciones_(ss) {
  const bool = SpreadsheetApp.newDataValidation().requireValueInList(['TRUE','FALSE'], true).build();
  ['Anuncios','ServiciosJ1','CursoIngles','GruposWhatsApp','Instagram'].forEach(name => {
    const sh = ss.getSheetByName(name); if (!sh) return;
    const headers = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(String);
    headers.forEach((h,i)=>{ if (['activo','destacado','principal','mostrar_inicio','mostrar_footer','mostrar_comunidad'].includes(h.toLowerCase())) sh.getRange(2,i+1,Math.max(sh.getMaxRows()-1,1),1).setDataValidation(bool); });
  });
  setList_(ss,'Anuncios','tipo',['banner_principal','popup','entre_secciones','destacado']);
  setList_(ss,'Anuncios','posicion',['inicio','hero','despues_servicios','despues_comunidad','despues_preguntas','despues_record','despues_visa','despues_internet','popup']);
}
function setList_(ss, sheetName, headerName, values) {
  const sh = ss.getSheetByName(sheetName); if (!sh) return;
  const headers = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(String);
  const idx = headers.indexOf(headerName); if (idx < 0) return;
  const rule = SpreadsheetApp.newDataValidation().requireValueInList(values, true).build();
  sh.getRange(2, idx+1, Math.max(sh.getMaxRows()-1, 1), 1).setDataValidation(rule);
}
function aplicarFormatoExtra_(ss) {
  ['Anuncios','ServiciosJ1','CursoIngles','GruposWhatsApp','Instagram'].forEach(name => {
    const sh = ss.getSheetByName(name); if (!sh) return;
    const lastCol = sh.getLastColumn();
    sh.getRange(2,1,Math.max(sh.getMaxRows()-1,1),lastCol).setFontSize(10);
  });
}

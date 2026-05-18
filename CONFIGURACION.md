# Configuración de Work and Travel Guide RD

## 1. Archivos de GitHub Pages

Sube al repositorio la parte pública del proyecto:

```text
index.html
foro.html
login.html
registro.html
recuperar.html
perfil.html
admin.html
manifest.json
sw.js
css/
js/
images/
icons/
```

`admin.html` sí va en GitHub. Solo se desbloquea para usuarios con rol `admin` o `superadmin`.

## 2. Web Apps de Google Apps Script

Crea 3 proyectos separados de Google Apps Script:

```text
1. Web App de Contenido y Publicidad
2. Web App de Usuarios
3. Web App del Foro
```

En cada proyecto copia:

```text
Instalador.gs
Codigo.gs
```

Ya no hay que crear archivo `Admin.html` dentro de Apps Script. El panel administrativo está en `admin.html` dentro de GitHub Pages.

## 3. Web App de Contenido y Publicidad

Carpeta:

```text
web-apps/contenido-publicidad/
```

Pasos:

1. Copia `Instalador.gs`.
2. Ejecuta `instalarContenidoPublicidad()` una sola vez.
3. Copia `Codigo.gs`.
4. Implementa como Web App.
5. Copia la URL y pégala en `CONTENT_API_URL` dentro de `js/config.js`.
6. En la hoja `Config`, pega la URL de la Web App de Usuarios en la clave `users_api_url`.

Administra desde el panel web:

- banner principal
- popup
- anuncios entre secciones
- anuncios destacados
- servicios J1
- curso de inglés
- Instagram
- grupos de WhatsApp

## 4. Web App de Usuarios

Carpeta:

```text
web-apps/usuarios/
```

Pasos:

1. Copia `Instalador.gs`.
2. Ejecuta `instalarUsuarios()` una sola vez.
3. El instalador crea una carpeta en Google Drive para las fotos de perfil.
4. Copia `Codigo.gs`.
5. Implementa como Web App.
6. Copia la URL y pégala en `USERS_API_URL` dentro de `js/config.js`.
7. Crea tu cuenta desde la página web.
8. Verifica tu correo.
9. En la hoja `Users`, cambia tu rol a `superadmin` la primera vez.

Incluye:

- registro
- login
- código de verificación por correo
- recuperación de contraseña
- hash + salt
- roles: `user`, `moderator`, `admin`, `superadmin`
- bloqueo de cuenta con motivo visible
- foto de perfil máximo 2 MB
- formatos: JPG, JPEG, PNG, WEBP
- guardado de imagen en Google Drive
- guardado en Sheets de `file_id` y URL
- reemplazo de foto anterior

## 5. Web App del Foro

Carpeta:

```text
web-apps/foro/
```

Pasos:

1. Copia `Instalador.gs`.
2. Ejecuta `instalarForo()` una sola vez.
3. Copia `Codigo.gs`.
4. Implementa como Web App.
5. Copia la URL y pégala en `FORUM_API_URL` dentro de `js/config.js`.
6. En la hoja `Config` del Foro, pega la URL de la Web App de Usuarios en `users_api_url`.

El foro tiene:

- publicaciones
- comentarios/respuestas
- reportes
- cola de moderación
- aprobación, rechazo y eliminación
- detección automática de enlaces, teléfonos, correos y spam

## 6. Archivo `js/config.js`

Después de implementar las Web Apps, edita:

```js
window.WT_CONFIG = {
  CONTENT_API_URL: 'https://script.google.com/macros/s/AKfycbyG31iS6HEjKcw0ZKhUG-yhXcuo6sx3FYkoNyAu_1m8kZdRdObVL9kWRMATnN-3oB9QuQ/exec',
  USERS_API_URL: 'https://script.google.com/macros/s/AKfycbx6C_64qD4nX9q2R_z1RkxYT3A5GiwOk2rV4dAuZgZAVhec61qHO6EILCwONCiXKg4Izg/exec',
  FORUM_API_URL: 'https://script.google.com/macros/s/AKfycbzVF_BJH5lXSHi1Qi89d24r_zP0sZsU2_YL6XDC8DBLhC6MWIq4NMxGRoQUoyVRqAue/exec',
  APP_NAME: 'Work and Travel Guide RD',
  DEFAULT_INSTAGRAM_URL: 'https://www.instagram.com/',
  MAX_PROFILE_PHOTO_MB: 2
};
```

## 7. Cómo funciona el Panel Admin

1. El usuario inicia sesión.
2. La Web App de Usuarios devuelve su rol.
3. Si el rol es `admin` o `superadmin`, aparece el botón “Panel Admin”.
4. Si el rol es `user` o `moderator`, el botón no aparece.
5. Si alguien abre `admin.html` manualmente sin permiso, verá: “No tienes permiso para acceder al panel administrativo.”
6. Cada acción vuelve a validar el token en la Web App antes de guardar cambios.

## 8. Acceso desde celular

Como la página es PWA, puedes agregarla como acceso directo al celular. Luego entras, inicias sesión y, si tu usuario es admin o superadmin, aparecerá el botón “Panel Admin”.

## 9. Aviso legal

El aviso legal aparece en el footer y abre como modal dentro de la misma página. No abre otra pestaña.


## Páginas internas nuevas

Además de `foro.html`, ahora las guías largas abren como páginas internas: `preguntas.html`, `record.html`, `visa.html` e `internet.html`. Esto mantiene el inicio más limpio y facilita la navegación desde celular.


## 10. Promoción del foro en el inicio

El inicio ahora incluye un bloque destacado para que el usuario sepa desde que entra que existe el **Foro de Estudiantes Work and Travel RD**. Este bloque tiene:

- texto explicando para qué sirve el foro
- botón **Entrar al Foro**
- botón **Iniciar sesión**
- diseño integrado en la pantalla azul principal

Además, el foro sigue apareciendo en el menú, la sección Comunidad, al final de las páginas internas y en el footer.

## Corrección de foto de perfil

En esta versión la foto de perfil se muestra usando el enlace tipo `https://drive.google.com/thumbnail?id=FILE_ID&sz=w400`, porque el enlace anterior `uc?export=view` puede cargar el archivo en Drive pero fallar al mostrarse dentro de `<img>` en algunos navegadores, especialmente en móvil.

También se actualizó `js/auth.js` para refrescar la sesión, actualizar `localStorage`, limpiar el selector de archivo y forzar la recarga visual de la foto después de subirla.

Para aplicar esta corrección debes reemplazar:

- `js/auth.js` en GitHub Pages.
- `web-apps/usuarios/Codigo.gs` en la Web App de Usuarios y volver a desplegarla como nueva versión.



## Mejora V7 - Alertas bonitas

Se agregó `js/ui.js` para reemplazar los cuadros nativos del navegador por avisos modernos tipo toast y modales de confirmación con el diseño de Work and Travel Guide RD.

## Actualización v8 — foro con fotos, roles y promo dinámica

Cambios agregados:

- Las publicaciones y respuestas del foro muestran foto del usuario, nombre y distintivo de rol cuando aplica: Admin, Super Admin o Moderador.
- Los comentarios aprobados se muestran debajo de cada publicación.
- El bloque del foro en el inicio cambia automáticamente si el usuario ya inició sesión:
  - si no tiene sesión: muestra “Entrar al Foro” e “Iniciar sesión”;
  - si tiene sesión: muestra saludo personalizado e “Ir al Foro”;
  - si es admin o superadmin: también ofrece acceso al Panel Admin.

### Importante si ya instalaste la Web App del Foro

No ejecutes de nuevo el instalador.

Solo reemplaza `Codigo.gs` de la Web App del Foro, guarda, ejecuta una sola vez esta función:

```javascript
actualizarColumnasForo
```

Esa función no borra datos. Solo agrega estas columnas nuevas en `Posts` y `Comments`:

```text
author_role
author_photo_file_id
author_photo_url
```

Después vuelve a implementar la Web App del Foro como nueva versión.

## Actualización v9 — fotos en comentarios y tablas del Panel Admin

Esta versión corrige dos detalles:

1. En el foro, las respuestas/comentarios ahora usan la foto de perfil del usuario. Si un comentario viejo no tiene foto guardada en la hoja `Comments`, la web intenta usar la foto del usuario que tiene la sesión iniciada.
2. En `admin.html`, las tablas de Reportes, Comentarios, Publicaciones y Cola de moderación ya no se salen de la página. En pantallas pequeñas se pueden deslizar horizontalmente dentro de la tarjeta.

### Qué actualizar

En GitHub reemplaza estos archivos:

```text
js/foro.js
js/admin.js
css/admin.css
```

En la Web App del Foro reemplaza:

```text
web-apps/foro/Codigo.gs
```

Luego guarda y vuelve a implementar la Web App del Foro como nueva versión. No ejecutes el instalador otra vez.

Si ya tenías el foro instalado desde una versión anterior, ejecuta una sola vez esta función en Apps Script:

```javascript
actualizarColumnasForo
```

Esa función no borra datos; solo asegura que existan las columnas necesarias para guardar rol y foto del autor.


## Ajustes agregados en v11

### Panel Admin

Las tarjetas del panel admin ahora se muestran una debajo de la otra para evitar que las tablas se salgan de la pantalla en computadoras pequeñas y celulares. Las tablas conservan scroll horizontal interno cuando tengan muchas columnas.

### Correos cada 2 minutos

La Web App de Usuarios limita el envío de correos del sistema a un mínimo de 2 minutos. Esto aplica a correos de verificación y recuperación de contraseña para evitar saturación. No ejecutes el instalador de nuevo; solo reemplaza `Codigo.gs` de Usuarios y vuelve a implementar la Web App.

La clave opcional en la hoja `Config` de Usuarios es:

```text
email_cooldown_seconds = 120
```

Si esa clave no existe, el código usa 120 segundos por defecto.

### Aprobar todos los comentarios

En el Panel Admin, sección Foro, se agregó el ajuste:

```text
Todos los comentarios requieren aprobación
```

Si lo activas, todo comentario nuevo quedará como `pending` hasta que un moderador, admin o superadmin lo apruebe.

Si ya instalaste el foro, no ejecutes el instalador. Reemplaza `Codigo.gs` de Foro, vuelve a implementar la Web App del Foro y ejecuta una sola vez:

```javascript
actualizarColumnasForo()
```

Esa función no borra datos; solo agrega columnas/configuración faltante.


## Carga de imágenes desde el Panel Admin

El panel `admin.html` ahora permite subir imágenes directamente desde el celular o la computadora para:

```text
Anuncios
Servicios J1
Curso de inglés
```

Ya no es obligatorio pegar un enlace de imagen manualmente.

La imagen se guarda en Google Drive usando la **Web App de Contenido y Publicidad**. En Google Sheets se guardan:

```text
imagen_url
image_file_id
image_name
image_size
image_type
```

Para activar esta mejora en una instalación existente:

```text
1. Reemplaza `web-apps/contenido-publicidad/Codigo.gs`.
2. Guarda.
3. Ejecuta una sola vez `actualizarColumnasContenido()`.
4. Vuelve a implementar la Web App de Contenido y Publicidad como nueva versión.
5. En GitHub actualiza:
   - admin.html
   - js/admin.js
   - css/admin.css
```

No ejecutes `instalarContenidoPublicidad()` otra vez si ya tienes datos.

Reglas de imagen:

```text
Máximo: 3 MB
Formatos: JPG, JPEG, PNG o WEBP
Carpeta en Drive: WT Guide RD - Imagenes de Contenido
```

## v13 — Panel de contenido más sencillo y carga de imágenes corregida

Cambios agregados:

- El panel de Contenido ahora está separado en botones simples: Anuncio, Servicio J1, Curso de inglés, Comunidad y Avanzado.
- Ya no tienes que elegir hojas manualmente para crear anuncios comunes.
- Agregado botón **Preparar carpeta Drive** en el Panel Admin. Este botón prepara la carpeta `WT Guide RD - Imagenes de Contenido`, guarda su ID en la hoja `Config` y crea las columnas necesarias.
- La Web App de Contenido ahora puede tomar la URL de Usuarios desde `js/config.js`, para evitar errores si todavía no pegaste `users_api_url` manualmente en la hoja Config.
- Si ya creaste manualmente una carpeta llamada `WT Guide RD - Imagenes de Contenido`, el sistema intentará usar esa carpeta antes de crear otra.

Para aplicar esta versión:

1. Sube a GitHub la versión completa o reemplaza:
   - `admin.html`
   - `js/admin.js`
   - `css/admin.css`
2. En la Web App de Contenido y Publicidad, reemplaza `Codigo.gs`.
3. Guarda y vuelve a implementar como nueva versión.
4. Entra al Panel Admin y pulsa **Preparar carpeta Drive** una vez.

No ejecutes el instalador si las hojas ya existen.


## v14 - Corrección Panel Admin

- El formulario de anuncios ya no recarga la página ni provoca que parezca que se cerró la sesión.
- Los botones de guardar se bloquean mientras se envía la información para evitar doble envío.
- Para imágenes de anuncios/servicios/curso debes actualizar también la Web App de Contenido y Publicidad con `Codigo.gs` y volver a implementar.


## Actualización v15 - Panel Admin sin recargas

El panel administrativo ahora evita recargas accidentales al guardar contenido. Los botones de guardar usan `type="button"` y `data-admin-save`, y `admin.js` intercepta cualquier envío de formulario como respaldo. Si el navegador muestra una versión vieja, abre `admin.html?v=15` o limpia la caché/PWA.


## Actualización v16

Corrige el botón Guardar anuncio/servicio/curso del Panel Admin para que ejecute el guardado por JavaScript, muestre estado de guardado y no recargue la página.


## v17 - Corrección de botones del Panel Admin

Se reforzó el guardado del área Contenido: los botones Guardar anuncio, Guardar servicio, Guardar curso, Instagram, WhatsApp y Avanzado ahora llaman directamente a `window.WTAdminSave`, muestran un aviso flotante y no recargan la página.


## Cambio v18 - Registro

La página de registro ya no repite el campo de correo en la verificación. El correo usado para enviar el código se toma automáticamente del formulario de registro y se guarda temporalmente en el navegador hasta verificar la cuenta.


## v21 - Moderación de publicaciones

La opción `comments_require_approval` del Foro ahora controla publicaciones y comentarios. Si está en TRUE, las publicaciones nuevas también quedan pendientes hasta aprobación.


## v25 - Corrección de likes
Se corrigió el error `truth_ is not defined` en la Web App del Foro. Actualiza `web-apps/foro/Codigo.gs` y vuelve a implementar la Web App del Foro como nueva versión.


## v26 - Diagnóstico de Contenido

Si el Panel Admin no guarda anuncios/servicios/curso:
1. Actualiza la Web App de Contenido con `web-apps/contenido-publicidad/Codigo.gs` de esta versión.
2. Implementa como nueva versión.
3. En el Panel Admin intenta guardar un anuncio.
4. Revisa la hoja `AdminLogs`:
   - Si aparece `intento_admin:adminDiagnostic` y luego un error, la solicitud sí llegó y el problema es permisos/token/configuración.
   - Si no aparece nada, el GitHub está usando caché viejo o `CONTENT_API_URL` apunta a otra Web App.


## v27 - Validaciones de Contenido

Esta versión corrige el panel de Contenido:

- No permite guardar anuncios, servicios, curso, Instagram o WhatsApp vacíos.
- Valida campos obligatorios en `admin.js` y también en `Codigo.gs`.
- Agrega `adminDiagnostic` en la Web App de Contenido.
- Registra intentos y errores en `AdminLogs` para saber si la solicitud llegó a Apps Script.
- Mantiene las hojas actuales: `Config`, `Anuncios`, `ServiciosJ1`, `CursoIngles`, `GruposWhatsApp`, `Instagram` y `AdminLogs`.

Para aplicar:
1. Subir `admin.html`, `js/admin.js`, `sw.js` a GitHub.
2. Reemplazar `web-apps/contenido-publicidad/Codigo.gs`.
3. Implementar la Web App de Contenido como nueva versión.
4. Abrir `admin.html?v=27`.


## v28 - Foro con Cargar más

El foro ahora carga publicaciones por partes para mejorar el rendimiento en celular.

- `foro.html` muestra primero 10 publicaciones.
- El botón `Cargar más publicaciones` carga las siguientes 10.
- La Web App del Foro acepta `limit` y `offset` en `listPosts`.
- No ejecutes el instalador otra vez. Solo reemplaza `Codigo.gs` del Foro y vuelve a implementar como nueva versión.


## v30 - Corrección visual y enlaces

- La foto de perfil en la tarjeta de bienvenida ahora queda ajustada y circular.
- Los servicios administrados desde Sheets con enlaces como `#preguntas`, `#record` o `#internet` ahora abren las páginas correctas: `preguntas.html`, `record.html` e `internet.html`.
- Las tarjetas de servicios también son clicables.


## v31 - Panel Admin Contenido reconectado

- Los botones del área Contenido ahora llaman funciones directas por ID: anuncio, servicio, curso, Instagram, WhatsApp y avanzado.
- Si falta un campo, se muestra el campo exacto que falta.
- Ya no aparece el mensaje genérico “Este formulario no está conectado correctamente”.
- Para aplicar: subir admin.html, js/admin.js y sw.js a GitHub. No requiere actualizar la Web App si ya tienes el Codigo.gs de Contenido v29 o superior.


## v33 - Corrección DriveApp setSharing

Si la imagen ya sube a Drive pero Apps Script muestra `Acceso denegado: DriveApp`, el problema está en `setSharing()`.  
Ahora el sistema:
- sube la imagen,
- intenta hacerla pública,
- si Google bloquea `setSharing()`, registra `advertencia_drive`,
- pero continúa y guarda el anuncio/servicio/curso.


## v34 - Anuncios visibles en la página

Corrección importante:
- La página ahora reconoce `activo` además de `active`.
- Los anuncios se ordenan por `orden`.
- Los anuncios con `posicion = inicio` o `hero` aparecen en la pantalla azul.
- Los anuncios con `posicion = despues_servicios`, `despues_comunidad`, etc. aparecen en su espacio correcto.
- Se quitó el campo manual “O pegar URL de imagen” del Panel Admin.


## v35 - Corrección popup y anuncios

Corrección crítica:
- `adHtml()` ahora reconoce `activo` y `active`.
- Antes el popup podía abrir el fondo oscuro con contenido vacío y bloquear la página.
- Si el popup no tiene HTML válido, ya no se abre.
- Se puede cerrar tocando la X, tocando fuera del popup o con Escape.


## v36 - Página de cursos de inglés

Cambios:
- Se agregó `cursos.html`.
- La tarjeta "Curso de inglés" en Servicios J1 abre `cursos.html`.
- `cursos.html` muestra todos los cursos activos desde la pestaña `CursoIngles`.
- Cada curso puede mostrar foto, título, descripción, precio, botón, destacado y orden.
- La Web App de Contenido ahora devuelve `englishCourses` además de `englishCourse`.

Para aplicar:
- GitHub: subir `cursos.html`, `css/cursos.css`, `js/cursos.js`, `index.html`, `js/main.js`, `sw.js`.
- Web App de Contenido: reemplazar `Codigo.gs` y volver a implementar como nueva versión.


## v39 - Admin estable + cursos

Esta versión restaura el área de Contenido del Panel Admin al modo estable, porque el navegador nuevo de contenido agregado después rompió el guardado de anuncios.

Incluye:
- Guardar anuncio/servicio/curso como antes.
- Página `cursos.html`.
- Tarjeta "Cursos de inglés" en Servicios J1.
- Mejor encaje de imágenes en cursos y popup.

Para aplicar:
- GitHub: subir `admin.html`, `js/admin.js`, `css/admin.css`, `index.html`, `cursos.html`, `js/main.js`, `js/cursos.js`, `css/style.css`, `css/cursos.css`, `sw.js`.
- Web App de Contenido: solo actualizar `Codigo.gs` si no habías aplicado v36.


## v40 - Moderación visual del foro y logo de cursos

Cambios:
- El Panel Admin del foro ahora tiene una revisión visual con filtros.
- Filtros: pendiente de aprobación, reportados, cola abierta, aprobados, rechazados y todo.
- Orden: más antiguos primero o más recientes primero.
- Tipo: publicaciones, respuestas o ambos.
- Cada elemento muestra vista previa del contenido antes de aprobar/rechazar/eliminar.
- Se corrigió el logo gigante/descentrado en `cursos.html`.


## v41 - Guardado directo de Contenido

Se agregó `js/admin-content-direct.js` para que los botones de Contenido no dependan de la lógica grande de `admin.js`.

Si `AdminLogs` solo muestra `adminListAll`, significa que la página cargó datos, pero el botón de guardar no envió nada.  
Con v41, al guardar anuncio debe aparecer:
- `adminSaveRow` si no tiene imagen
- `adminSaveRowWithImage` si tiene imagen


## v42 - Corrección final del guardado de Contenido

Problema corregido:
- `admin.js` estaba interceptando los botones de Contenido antes que `admin-content-direct.js`.
- Por eso el panel mostraba “Solicitud enviada...”, pero en AdminLogs solo aparecía `adminListAll`.
- Ahora `admin.js` ignora los formularios de Contenido y los deja a `admin-content-direct.js`.

Prueba esperada:
- Al guardar anuncio sin imagen: `adminSaveRow`
- Al guardar anuncio con imagen: `adminSaveRowWithImage`


## v43 - Editar contenido ya creado desde la web

Se agregó `js/admin-content-editor.js`.

Ahora el Panel Admin tiene una sección “Editar contenido creado” que permite:
- buscar anuncios, servicios, cursos, WhatsApp e Instagram;
- filtrar por tipo, activo/inactivo, destacado o incompleto;
- ver mini vista previa de la imagen;
- presionar Editar para cargar el registro en su formulario correspondiente;
- modificar y guardar sin tocar Google Sheets.

No cambia la Web App.


## v44 - Imagen de cursos corregida

Corrección:
- La imagen de cada curso ahora usa un espacio fijo y centrado.
- Se eliminó el fondo azul vacío que hacía que la imagen se viera descentrada.
- La imagen se ajusta con `object-fit: cover` y `object-position: center`.


## v45 - Posición manual de imágenes desde Admin

Cambios:
- En el Panel Admin se agregó “Posición de la imagen” para Anuncios y Cursos.
- Opciones: Centro, Arriba, Abajo, Izquierda, Derecha.
- La página respeta esa posición al mostrar imágenes de cursos, anuncios y popup.

Importante:
- Para guardar `image_position` en Google Sheets, ejecuta una vez en la Web App de Contenido:
  `actualizarColumnasImagenPosicion()`
- Luego vuelve a implementar la Web App de Contenido como nueva versión.


## v46 - Inicio de migración a Supabase

Se agregó la Fase 1 de Supabase:
- tablas SQL de contenido,
- RLS,
- buckets de imágenes,
- cliente JS de Supabase,
- carga opcional de contenido desde Supabase.

Archivo principal de guía:
`SUPABASE_FASE1_GUIA.md`

Importante:
- Por defecto `USE_SUPABASE` está en `false`.
- Puedes subir esta versión sin romper Google Sheets.
- Cuando quieras probar Supabase, cambia `USE_SUPABASE` a `true` en `js/supabase-config.js`.


## v47 - Supabase Clean Content

Se empezó a eliminar código basura:
- Web Apps de Google Sheets movidas a `legacy/`.
- Scripts viejos de contenido movidos a `legacy/old-js-content/`.
- Nuevo módulo limpio:
  - `js/supabase-client.js`
  - `js/content.js`
  - `js/courses.js`
  - `js/admin-content.js`

Esta versión usa Supabase para Contenido y Publicidad.


## v51 - Foro en Supabase

Se agregó:
- `supabase/sql/003_fase2_foro_schema.sql`
- `js/forum.js`
- `js/admin-forum.js`

El foro ahora puede usar Supabase para publicaciones, comentarios, likes, reportes y notificaciones internas.

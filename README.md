# Work and Travel Guide RD 🇩🇴✈️🇺🇸

Proyecto actualizado para GitHub Pages + PWA, manteniendo el diseño principal y agregando administración web segura por roles.

## Orden de la página principal

1. Inicio
2. Servicios para Estudiantes J1
3. Comunidad Work and Travel RD
4. Preguntas Consulares y Pronunciación
5. Récord de Notas Legalizado
6. Estado de la Visa
7. Internet y Número de USA
8. Acceso al Foro de Estudiantes
9. Footer con aviso legal

## Cambios principales

- El foro está separado en `foro.html`.
- Se agregó `admin.html` como panel administrativo web.
- El botón “Panel Admin” solo aparece para usuarios con rol `admin` o `superadmin`.
- Si alguien abre `admin.html` manualmente sin permiso, queda bloqueado.
- La seguridad real se valida en las Web Apps antes de guardar cambios.
- Se quitaron los `Admin.html` de las carpetas de Web Apps.
- Las Web Apps ahora funcionan como backend: `Instalador.gs` + `Codigo.gs`.
- Publicidad, servicios, curso de inglés, Instagram, comunidad, usuarios y foro se administran desde el panel web.
- Los instaladores crean hojas con formato profesional en Google Sheets.

## Estructura

```text
work-and-travel-guide-rd/
├── index.html
├── foro.html
├── preguntas.html
├── record.html
├── visa.html
├── internet.html
├── login.html
├── registro.html
├── recuperar.html
├── perfil.html
├── admin.html          ← Panel administrativo web para admin/superadmin
├── manifest.json
├── sw.js
├── css/
│   ├── style.css
│   ├── foro.css
│   ├── auth.css
│   └── admin.css
├── js/
│   ├── config.js
│   ├── main.js
│   ├── foro.js
│   ├── auth.js
│   └── admin.js
├── web-apps/
│   ├── contenido-publicidad/
│   │   ├── Instalador.gs
│   │   └── Codigo.gs
│   ├── usuarios/
│   │   ├── Instalador.gs
│   │   └── Codigo.gs
│   └── foro/
│       ├── Instalador.gs
│       └── Codigo.gs
├── images/
└── icons/
```

## Configuración rápida

1. Sube los archivos públicos a GitHub Pages, incluyendo `admin.html`, `css/admin.css` y `js/admin.js`.
2. Crea 3 proyectos de Google Apps Script, uno para cada Web App.
3. En cada proyecto copia `Instalador.gs` y ejecútalo una sola vez.
4. Luego copia `Codigo.gs` en el mismo proyecto.
5. Implementa cada proyecto como Web App.
6. Pega las URLs en `js/config.js`.
7. En la hoja `Config` de Contenido, pega la URL de Usuarios en `users_api_url`.
8. En la hoja `Config` del Foro, pega la URL de Usuarios en `users_api_url`.
9. Crea tu cuenta desde la web, verifica tu correo y cambia tu rol a `superadmin` en la hoja `Users` la primera vez.
10. Entra a `admin.html` desde la web o desde la PWA instalada en tu celular.

## Panel Admin

`admin.html` sí va en GitHub Pages. Que alguien pueda abrir el enlace no significa que pueda editar. El panel verifica la sesión y el rol. Además, cada Web App vuelve a validar el token antes de guardar, bloquear usuarios, cambiar roles o moderar el foro.

## PWA

La app sigue siendo instalable en celular y mantiene soporte offline básico mediante `sw.js`.


## V4 - Páginas internas

Para mejorar el diseño, las secciones largas se separaron en páginas internas: `preguntas.html`, `record.html`, `visa.html` e `internet.html`. Al final de cada una aparece el acceso al Foro de Estudiantes.


## Web Apps conectadas

Las URLs de Contenido/Publicidad, Usuarios y Foro ya están pegadas en `js/config.js`.

## Promoción del foro

El inicio incluye un bloque destacado para promocionar el Foro de Estudiantes, además del enlace en el menú, Comunidad, páginas internas y footer.


## Mejora V7 - Alertas bonitas

Se agregó `js/ui.js` para reemplazar los cuadros nativos del navegador por avisos modernos tipo toast y modales de confirmación con el diseño de Work and Travel Guide RD.

## v9 — Corrección foro/admin

- Los comentarios del foro muestran foto de perfil, nombre, rol y fecha cuando esos datos están disponibles.
- Se agregó respaldo para comentarios viejos del usuario actual que todavía no tenían foto guardada.
- El Panel Admin ahora maneja mejor tablas grandes con scroll horizontal dentro de cada tarjeta.


## Carga de imágenes desde el Panel Admin

El panel admin permite subir imágenes para anuncios, servicios J1 y curso de inglés. Las imágenes se guardan en Google Drive mediante la Web App de Contenido y Publicidad.


## Actualización v15 - Panel Admin sin recargas

El panel administrativo ahora evita recargas accidentales al guardar contenido. Los botones de guardar usan `type="button"` y `data-admin-save`, y `admin.js` intercepta cualquier envío de formulario como respaldo. Si el navegador muestra una versión vieja, abre `admin.html?v=15` o limpia la caché/PWA.


## Actualización v16

Corrige el botón Guardar anuncio/servicio/curso del Panel Admin para que ejecute el guardado por JavaScript, muestre estado de guardado y no recargue la página.


## v17 - Corrección de botones del Panel Admin

Se reforzó el guardado del área Contenido: los botones Guardar anuncio, Guardar servicio, Guardar curso, Instagram, WhatsApp y Avanzado ahora llaman directamente a `window.WTAdminSave`, muestran un aviso flotante y no recargan la página.


## v25 - Corrección de likes
Se corrigió el error `truth_ is not defined` en la Web App del Foro. Actualiza `web-apps/foro/Codigo.gs` y vuelve a implementar la Web App del Foro como nueva versión.

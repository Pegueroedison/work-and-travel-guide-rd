# v51 - Foro en Supabase

## Ejecutar en Supabase

En SQL Editor pega y ejecuta:

```text
supabase/sql/003_fase2_foro_schema.sql
```

## Qué migra esta fase

- Publicaciones
- Comentarios
- Likes
- Reportes
- Notificaciones internas
- Moderación del foro desde Panel Admin
- Cargar más publicaciones

## Archivos activos nuevos

```text
js/forum.js
js/admin-forum.js
supabase/sql/003_fase2_foro_schema.sql
```

## Importante

El foro ahora usa Supabase Auth. Para publicar, responder, dar like o reportar, el usuario debe iniciar sesión con Supabase.

Los posts aprobados se leen públicamente. Los pendientes solo los ve su autor o un admin.

## Próximo paso

Migrar el login viejo completamente a Supabase Auth para que no existan dos sistemas de usuarios.


## v52 - Botones de inicio de sesión del foro

Corrección:
- El botón superior “Iniciar sesión” del foro ya no debe abrir el login viejo.
- Ahora baja al formulario de Supabase del foro.
- Después de iniciar sesión correctamente, el foro actualiza el estado y debe mostrar tu cuenta conectada.


## v53 - Quitar login viejo del foro

Corrección:
- Los botones “Iniciar sesión” y “Crear cuenta” del foro ya no abren `login.html` ni `registro.html`.
- Ahora se quedan en `foro.html` y muestran el formulario de Supabase.
- Se añadió `preventDefault()` y captura del clic para evitar que el navegador vaya al login viejo.


## v54 - Login global conectado a Supabase

Corrección:
- `login.html` y `registro.html` ahora usan Supabase Auth.
- El formulario viejo ya no debe iniciar sesión solo en Google Sheets.
- Si entras por `login.html?redirect=foro.html`, al iniciar sesión crea sesión real de Supabase y vuelve al foro.
- El foro también mantiene su login interno de Supabase.


## v55 - Login Supabase visible en el foro

Corrección:
- El foro ahora muestra los campos de correo y contraseña directamente en la barra superior del foro.
- Ya no depende del botón que abría el login viejo.
- Botón: `Entrar Supabase`.


## v56 - Avatar gigante corregido

Corrección:
- El logo/foto del usuario dentro de las publicaciones del foro queda limitado a 52x52 px.
- En móvil baja a 44x44 px.
- Esto evita que el logo se muestre gigante dentro de cada publicación.


## v57 - Contadores y moderación corregidos

Ejecutar también:

```text
supabase/sql/004_fase2_foro_fix_counts_settings.sql
```

Correcciones:
- Los comentarios ahora se cuentan aunque estén pendientes, mientras no estén eliminados.
- `pending` ahora se muestra como “Pendiente de aprobación”.
- El Panel Admin → Foro carga publicaciones, respuestas y reportes desde Supabase con filtros.
- El botón “Guardar ajuste” de moderación ahora guarda `forum_require_approval` en Supabase.
- Las tablas viejas del App Web se marcan como viejas para no confundirlas con Supabase.


## v58 - Rechazados/eliminados se borran y admin auto aprobado

Ejecutar también:

```text
supabase/sql/005_fase2_foro_delete_rejected_admin_auto_approve.sql
```

Cambios:
- Rechazar una publicación o respuesta la borra definitivamente de Supabase.
- Eliminar también borra definitivamente de Supabase.
- Los registros ya existentes con `rejected` o `deleted` se borran con el SQL.
- Las publicaciones y respuestas de usuarios con rol `admin` o `superadmin` siempre quedan `approved`.
- Esto aplica aunque la moderación general esté configurada en “Todo requiere aprobación”.


## v59 - Admin limpio, ajuste de moderación y nombres públicos del foro

Ejecutar también:

```text
supabase/sql/006_admin_limpio_foro_perfiles_fix.sql
```

Cambios:
- Se quitó del admin la visualización de tablas viejas de App Web para no perder tiempo cargando cosas que ya no se usan.
- El botón de ajuste de moderación del foro ya no debe llamar a la App Web vieja.
- El foro puede mostrar nombre/avatar/rol de autores a visitantes sin iniciar sesión mediante `forum_public_profiles`.
- No se expone el correo completo públicamente; si no hay nombre, se muestra solo la parte antes de @.


## v60 - Login visible del foro restaurado y carga con errores claros

Corrección:
- Se restauró el login visible de Supabase directamente dentro del foro.
- Ya no debe aparecer solo “Iniciar sesión / Crear cuenta” apuntando al login viejo.
- Si el foro no carga por falta de SQL, ahora muestra un mensaje de error claro.
- Debes tener ejecutados los SQL 003, 004, 005 y 006.


## v61 - Botones viejos sustituidos y carga del foro corregida

Corrección:
- La barra del foro reemplaza los botones viejos por campos visibles de Supabase.
- Los botones antiguos `Iniciar sesión` y `Crear cuenta` ya no deben abrir el login viejo.
- El foro ya no debe quedarse eternamente en “Cargando foro...”; ahora muestra error claro si falta algún SQL.
- Abrir con `foro.html?v=61`.


## v62 - Error de JavaScript corregido

El foro no reemplazaba los botones viejos ni cargaba publicaciones porque `js/forum.js` tenía un error de sintaxis en `loadSinglePost()`:
`Identifier 'post' has already been declared`.

Corrección:
- Se reconstruyó `loadSinglePost()`.
- `forum.js` pasa validación de sintaxis.
- Al abrir `foro.html?v=62`, debe aparecer el login visible de Supabase.

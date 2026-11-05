# Comunidad — administración de iglesia

Aplicación local en español, Node.js 24 o superior. Datos persistentes en SQLite mediante `better-sqlite3`; Nodemailer se utiliza para enviar códigos de recuperación por SMTP.

## Ejecutar

```powershell
npm install
npm start
```

Abrir http://localhost:3000 y crear el primer administrador. No hay cuentas ni datos de demostración. Para verificar el servidor: `npm test` (usa una base en memoria).

Desarrollo con recarga automática: `npm run dev`.

### Si falla la instalación en Windows

El proyecto fija `better-sqlite3` en `12.11.1`, compatible con Node 24 y con binarios precompilados.
La versión 13 puede intentar ejecutar `node-gyp` incluso cuando incluye un binario.
Si descargaste la primera entrega y aparece `gyp ERR! find VS`, desde la carpeta del proyecto ejecuta:

```powershell
npm install better-sqlite3@12.11.1 --save-exact
npm start
```

Si aparecen errores `EBUSY` o `EPERM`, cierra las ventanas del proyecto y vuelve a abrir VS Code antes de reintentar.
Los avisos `npm warn deprecated` no son el error que detiene la instalación.


### Cuenta de administrador para desarrollo

Para no crear el primer administrador a mano en cada computadora del equipo:

```powershell
npm run db:seed-admin
```

Crea `admin123@gmail.com` con rol administrador (la contraseña está en `scripts/seed-admin.js`). Si ya existe, no la modifica. Con ella se crean las demás cuentas desde **Usuarios**. Se bloquea con `NODE_ENV=production`: esas credenciales son públicas dentro del repositorio y **nunca deben existir en la base real de la iglesia**.

## Estructura del proyecto

```
├── src/                         Backend (Node.js, CommonJS, sin framework)
│   ├── server.js                Punto de entrada: crea e inicia el servidor HTTP
│   ├── app.js                   Manejador principal: contexto, estáticos vs. API, errores
│   ├── config/
│   │   ├── env.js               Variables de entorno y rutas de carpetas
│   │   └── permissions.js       Roles y permisos por módulo (RF-01)
│   ├── database/
│   │   ├── connection.js        Conexión única (better-sqlite3) y llaves foráneas activas
│   │   ├── migrate.js           Ejecutor de migraciones
│   │   ├── migrations/          001_, 002_, 003_… se aplican en orden, una sola vez
│   │   └── repositories/        Todas las consultas SQL, un archivo por módulo
│   ├── http/                    Utilidades HTTP: errores, cuerpo JSON, respuestas, estáticos
│   ├── middleware/              authenticate (sesión) y verify-origin (CSRF)
│   ├── routes/                  index.js (enrutador), auth, users y records (CRUD de módulos)
│   ├── services/                Contraseñas/tokens y envío de correo
│   └── validators/              Reglas de validación de usuarios y registros
├── public/                      Frontend (ES modules, sin compilación)
│   ├── index.html
│   ├── assets/css/style.css
│   └── js/
│       ├── main.js              Punto de entrada
│       ├── core/                api, estado global, permisos, textos y utilidades
│       ├── ui/                  Componentes: formulario, modal, tabla, avisos
│       ├── views/               Una vista por pantalla (dashboard, listados, reportes…)
│       └── reports/             Cálculo de reportes y exportación Excel/PDF
├── tests/
│   ├── api.test.js              Flujo de usuarios, roles y recuperación
│   ├── database.test.js         Reglas de la base (fechas, llaves foráneas, centavos…)
│   ├── migration.test.js        Migración de datos del formato antiguo
│   ├── users-events.test.js     Edición, roles, estados, eliminación y tipos de evento
│   ├── excel.test.js            XLSX, formatos, valores numéricos y totales
│   └── helpers/                 Cliente HTTP y servidor SMTP falso
└── data/                        Base SQLite (se crea al iniciar; ignorada por git)
```

Flujo de una solicitud a la API: `server.js` → `app.js` → `routes/index.js` → (rutas públicas | `middleware` → rutas con sesión) → `validators` → `database/repositories`.

## Base de datos

SQLite con tablas relacionales:

| Tabla | Contenido |
|---|---|
| `users`, `sessions`, `resets` | Usuarios del sistema, sesiones y códigos de recuperación |
| `members` | Miembros (RF-02) |
| `ministries` + `ministry_members` | Ministerios e integrantes (RF-05) |
| `events` | Eventos (RF-04) |
| `attendance` + `attendance_members` | Listas de asistencia y su padrón con presente/ausente (RF-03) |
| `donations` | Aportaciones en **centavos** (`amount_cents`); la API usa pesos (RF-06) |
| `announcements` | Comunicados (RF-07) |
| `church_settings` | Datos de la iglesia, siempre una sola fila (RF-10) |
| `legacy_records` | Registros antiguos que no cumplieron las reglas al migrar, para revisión manual |

Reglas en la propia base: llaves foráneas activas (`PRAGMA foreign_keys = ON`), `CHECK` de fechas reales (`AAAA-MM-DD`), horas (`HH:MM`), montos mayores que cero, roles y métodos de pago válidos, y `UNIQUE(event_id, date)` en asistencia. Los validadores de `src/validators` revisan lo mismo antes para dar mensajes claros.

**Migraciones.** Se aplican solas al iniciar y quedan registradas en `schema_migrations`. Para cambiar la estructura: crea `src/database/migrations/NNN_descripcion.sql` con el siguiente número. Nunca edites una migración que ya se compartió.

**Antes de actualizar una base existente**, detén la aplicación y copia la carpeta `data`. Al iniciar, la migración 003 pasa los datos del formato antiguo (tabla `records`) a las tablas nuevas en una transacción.

La migración 004 agrega el estado activo de usuarios (las cuentas existentes siguen activas) y el tipo de evento sin borrar registros. Ejecuta `npm install` al actualizar para instalar ExcelJS.

Los permisos existen en dos lugares: `src/config/permissions.js` (los que realmente se aplican) y `public/js/core/permissions.js` (solo ocultan botones). Si cambias uno, cambia el otro.

## Funciones

- RF-01: correo y contraseña, alta, edición de nombre/correo/rol, activación, desactivación y eliminación de usuarios por administrador; cinco roles, cierre de sesión y restablecimiento con códigos de un solo uso (30 minutos). Contraseñas con scrypt, sesiones HttpOnly de ocho horas y revocación al restablecer contraseña, desactivar, eliminar o cambiar el rol. Las cuentas inactivas no pueden iniciar sesión ni recuperar contraseña. Se protege la propia cuenta y debe permanecer un administrador activo.
- RF-02: listado, búsqueda, filtros, edición y desactivación de miembros.
- RF-03: asistencia por evento y fecha, presentes y ausentes; historial y resúmenes semanales y mensuales en Reportes. El panel cuenta registros de asistencia, no personas presentes. No se permite duplicar evento y fecha.
- RF-04: eventos religiosos y administrativos con lugar, responsable, descripción, cancelación, filtro por tipo y calendario mensual con el tipo visible. Los eventos anteriores quedan como «Sin clasificar» hasta que se editen; no se presupone su categoría.
- RF-05: ministerios, coordinadores, integrantes y eventos vinculados. Las actividades se consultan al editar el ministerio.
- RF-06: aportaciones con o sin donante, filtros de fechas y resumen mensual en el panel. Solo administrador y tesorero acceden a datos financieros, también en la API.
- RF-07: comunicados con fecha de publicación e indicador de importancia; edición, eliminación y avisos futuros/importantes en el panel.
- RF-08: indicadores, próximos eventos, avisos y gráficas de asistencia y participación.
- RF-09: reportes de miembros (filtrados por fecha de ingreso), asistencia, participación por ministerio (integrantes, actividades y asistencias) e ingresos; filtros por periodo, agrupación semanal/mensual y exportación Excel nativa (.xlsx) o PDF mediante el diálogo de impresión del navegador (Guardar como PDF). Excel incluye nombre de la iglesia, título, periodo, encabezados, filas alternadas, filtros, encabezados inmovilizados, fechas e importes numéricos y total de ingresos con SUBTOTAL. ExcelJS se carga desde el servidor local al exportar; no necesita CDN ni internet durante el uso.
- RF-10: datos institucionales, horarios y logotipo local de hasta 500 KB.

## Permisos

Todos los usuarios autenticados consultan los módulos no financieros y reportes correspondientes. Administrador administra todo y registra usuarios. Pastor y secretario modifican miembros, eventos, asistencia, ministerios y comunicados. Coordinador modifica eventos, asistencia y ministerios. Tesorero modifica y consulta aportaciones. Solo administrador modifica datos institucionales.

## Correo de recuperación

Configura un servidor SMTP con variables de entorno antes de iniciar la aplicación:

```powershell
$env:SMTP_HOST='smtp.ejemplo.org'
$env:SMTP_PORT='587'
$env:SMTP_SECURE='0'
$env:SMTP_USER='usuario-smtp'
$env:SMTP_PASS='contraseña-smtp'
$env:SMTP_FROM='Comunidad <no-reply@ejemplo.org>'
npm start
```

`SMTP_SECURE='1'` habilita TLS implícito (habitualmente puerto 465); usa `'0'` para STARTTLS (habitualmente puerto 587). Usuario y contraseña SMTP son opcionales si el servidor no requiere autenticación. Si falta `SMTP_HOST` o `SMTP_FROM`, la recuperación informa que no está configurada y no genera códigos.

Para probar el flujo local sin enviar correo, `DEV_RECOVERY='1'` devuelve el código en la respuesta. No habilites este modo en un servidor compartido.

El servidor escucha solo en 127.0.0.1. Esta entrega es para uso local; no está desplegada. Antes de alojarla para múltiples usuarios se requieren HTTPS, `COOKIE_SECURE=1`, límites de intentos y revisión de seguridad de despliegue. No incluye auditoría de cambios ni copias de respaldo automatizadas. Para un respaldo local, detener la aplicación y copiar la carpeta `data` a un lugar seguro. Los montos se muestran en MXN.

Variables adicionales: `PORT` (3000), `DB_PATH` (ruta alternativa SQLite), `COOKIE_SECURE`, `DEV_RECOVERY`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` y `SMTP_FROM`. La interfaz usa la paleta de `colores.jpeg`.

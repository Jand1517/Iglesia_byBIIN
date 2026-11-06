# Guía de desarrollo — Comunidad

Documentación técnica para el equipo que instala, mantiene o modifica el sistema.
Para el uso diario de la aplicación consulta el [Manual de usuario](MANUAL_USUARIO.md).

## Contenido

1. [Requisitos e instalación](#1-requisitos-e-instalación)
2. [Comandos](#2-comandos)
3. [Actualizar después de un `git pull`](#3-actualizar-después-de-un-git-pull)
4. [Arquitectura](#4-arquitectura)
5. [Base de datos y migraciones](#5-base-de-datos-y-migraciones)
6. [Permisos](#6-permisos)
7. [Seguridad](#7-seguridad)
8. [Correo de recuperación (SMTP)](#8-correo-de-recuperación-smtp)
9. [Variables de entorno](#9-variables-de-entorno)
10. [Pruebas](#10-pruebas)
11. [Reglas del equipo](#11-reglas-del-equipo)
12. [Limitaciones conocidas](#12-limitaciones-conocidas)
13. [Solución de problemas de instalación](#13-solución-de-problemas-de-instalación)

---

## 1. Requisitos e instalación

- **Node.js 24 o superior** (`node --version`).
- Windows, macOS o Linux. No requiere servidor de base de datos: SQLite es un archivo.

```powershell
git clone <url-del-repositorio>
cd Iglesia_byBIIN
npm install
npm start
```

Abre http://localhost:3000. Si la base está vacía aparece la pantalla para crear el primer administrador.

### Cuenta de administrador para desarrollo
Para no crear el administrador a mano en cada computadora:

```powershell
npm run db:seed-admin
```

Crea `admin123@gmail.com` con rol administrador (la contraseña está en `scripts/seed-admin.js`). Si la cuenta ya existe no la modifica. Se bloquea con `NODE_ENV=production`: esas credenciales son públicas dentro del repositorio y **nunca deben existir en la base real de la iglesia**. No es una migración a propósito: las migraciones se aplican en todas las bases, incluida la de producción.

---

## 2. Comandos

| Comando | Qué hace |
|---|---|
| `npm start` | Inicia el servidor en http://localhost:3000 |
| `npm run dev` | Igual, pero se reinicia solo al guardar cambios |
| `npm test` | Ejecuta todas las pruebas con una base en memoria |
| `npm run db:seed-admin` | Crea la cuenta de administrador de desarrollo |

---

## 3. Actualizar después de un `git pull`

1. **Respalda** la carpeta `data` (ver el manual de usuario, sección 13).
2. `npm install` — por si cambiaron dependencias.
3. `npm start` — las migraciones pendientes se aplican solas y se listan en la consola («Migraciones aplicadas: …»).
4. Si se aplicó una migración que cierra sesiones (por ejemplo la 006), todos deben volver a iniciar sesión.
5. Recarga el navegador con `Ctrl + F5` para descartar archivos en caché.

---

## 4. Arquitectura

Backend en Node.js (CommonJS, servidor `node:http` sin framework) y frontend en módulos ES sin compilación.

```
├── src/                          Backend
│   ├── server.js                 Punto de entrada: servidor HTTP y limpieza periódica de sesiones
│   ├── app.js                    Manejador principal: contexto, estáticos vs. API, errores → JSON
│   ├── config/
│   │   ├── env.js                Variables de entorno (se leen en cada solicitud) y rutas
│   │   └── permissions.js        Roles y permisos por módulo (los que se aplican)
│   ├── database/
│   │   ├── connection.js         Conexión única (better-sqlite3), pragmas y migraciones
│   │   ├── migrate.js            Ejecutor de migraciones
│   │   ├── migrations/           NNN_descripcion.sql, en orden, una sola vez
│   │   └── repositories/         Todo el SQL del proyecto, un archivo por módulo
│   ├── http/                     Errores, lectura de JSON, respuestas, archivos estáticos, IP
│   ├── middleware/               authenticate (sesión) y verify-origin (CSRF)
│   ├── routes/                   index.js (enrutador), auth, users y records (CRUD de módulos)
│   ├── services/                 Contraseñas y tokens, correo, límite de intentos, limpieza de sesiones
│   └── validators/               Reglas de validación de usuarios y registros
├── public/                       Frontend
│   ├── index.html
│   ├── package.json              Solo indica a Node (pruebas) que es ESM; el servidor no lo expone
│   ├── assets/css/style.css
│   └── js/
│       ├── main.js               Punto de entrada
│       ├── core/                 api, estado, permisos (solo ocultan botones), textos, estadísticas
│       ├── ui/                   Formulario, modal, tabla, avisos y gráficas SVG
│       ├── views/                Una vista por pantalla, más detalles (historial, ministerio)
│       └── reports/              Cálculo de reportes y exportación Excel/PDF
├── scripts/seed-admin.js         Cuenta de desarrollo
├── tests/                        Pruebas (ver sección 10)
├── docs/                         Manual de usuario y esta guía
└── data/                         Base SQLite (se crea al iniciar; ignorada por git)
```

### Recorrido de una solicitud
```
server.js → app.js → routes/index.js
   ├─ rutas públicas (status, setup, login, recover, reset)
   └─ middleware/authenticate → verify-origin → rutas con sesión / users / records
        → validators → database/repositories → SQLite
```

Principios que sigue el código:
- **Solo `database/repositories/` contiene SQL.** Las rutas no saben que existe SQLite.
- **Dependencias en una dirección:** rutas → validadores → repositorios. Un repositorio nunca importa una ruta.
- **Los repositorios guardan solo las columnas que conocen:** los campos extra que envíe el cliente se ignoran.
- **En el frontend, las vistas no importan el layout:** llaman a `refresh()` / `rerender()` de `core/state.js`, y `main.js` registra la función de dibujo. Así se evitan dependencias circulares.
- **`core/stats.js` contiene cálculos puros** (sin DOM), reutilizados por la Vista general, los reportes y las vistas de detalle, y probados en Node.

---

## 5. Base de datos y migraciones

SQLite mediante `better-sqlite3`. Conexión en `src/database/connection.js` con:
- `journal_mode = WAL` (lecturas mientras se escribe),
- `busy_timeout = 5000`,
- `foreign_keys = ON` (SQLite lo trae apagado).

### Tablas
| Tabla | Contenido |
|---|---|
| `users`, `sessions`, `resets` | Usuarios, sesiones y códigos de recuperación (tokens guardados como SHA-256 en `token_hash`) |
| `members` | Miembros (RF-02) |
| `ministries` + `ministry_members` | Ministerios e integrantes (RF-05) |
| `events` + `event_responsibles` | Eventos religiosos o administrativos y sus responsables (RF-04) |
| `attendance` + `attendance_members` | Listas de asistencia y su padrón con presente/ausente (RF-03) |
| `donations` | Aportaciones en **centavos** (`amount_cents`); la API usa pesos (RF-06) |
| `announcements` | Comunicados con publicación (`date`) y vigencia opcional (`expires_on`) (RF-07) |
| `church_settings` | Datos de la iglesia, siempre una sola fila `id = 1` (RF-10) |
| `legacy_records` | Registros del formato antiguo que no cumplieron las reglas al migrar |
| `schema_migrations` | Migraciones aplicadas |

### Reglas dentro de la base
Llaves foráneas, `CHECK` de fechas reales (`date(col) IS col`), horas `HH:MM`, montos mayores que cero, roles, tipos de evento y métodos de pago válidos, vigencia posterior a la publicación, y `UNIQUE(event_id, date)` en asistencia. Los validadores de `src/validators` revisan lo mismo antes para devolver mensajes claros; la base es la última defensa. Si una regla de la base se viola, `src/http/errors.js` la traduce a 400/409.

### Dinero
Siempre en centavos enteros en la base (`toCents` / `fromCents` en `repositories/helpers.js`). Nunca sumes montos como decimales.

### Migraciones
| Migración | Cambio | Efecto al aplicarse |
|---|---|---|
| `001_initial` | Esquema original | Ninguno en bases existentes |
| `002_relational_schema` | Tablas relacionales con reglas | — |
| `003_migrate_legacy_records` | Pasa los datos JSON de `records` a las tablas nuevas | Lo inválido queda en `legacy_records` |
| `004_user_status_event_type` | Usuario activo/inactivo y tipo de evento | Eventos antiguos quedan «sin clasificar» |
| `005_event_responsibles_announcement_expiry` | Varios responsables por evento; vigencia de comunicados | El responsable único se copia a `event_responsibles` |
| `006_hashed_session_tokens` | Sesiones y códigos de recuperación como SHA-256 | **Cierra todas las sesiones** e invalida códigos pendientes |

Funcionamiento (`src/database/migrate.js`): al iniciar revisa `schema_migrations`, aplica solo las pendientes en orden, cada una dentro de una transacción, con llaves foráneas desactivadas, y al final ejecuta `PRAGMA foreign_key_check` antes de reactivarlas.

**Para cambiar la estructura** crea `src/database/migrations/NNN_descripcion.sql` con el siguiente número. Para quitar o cambiar una columna con restricciones usa el procedimiento de reconstrucción de tablas de SQLite (ver la migración 005 como ejemplo).

### Consultar la base a mano
Usa [DB Browser for SQLite](https://sqlitebrowser.org) sobre `data/church.sqlite`, con la aplicación detenida o sin cambios pendientes en ambos lados. Activa *Foreign Keys* en «Editar pragmas». No edites `users.hash`, `sessions`, `resets` ni `schema_migrations`, y nunca cambies la estructura desde el editor visual.

---

## 6. Permisos

Escritura por módulo (`src/config/permissions.js`). La lectura de módulos no financieros está abierta a todo usuario autenticado; aportaciones solo para administrador y tesorero, también en la API.

| Módulo | Pueden modificar |
|---|---|
| `members` | administrador, pastor, secretario |
| `events`, `attendance`, `ministries` | administrador, pastor, secretario, coordinador |
| `donations` (y su lectura) | administrador, tesorero |
| `announcements` | administrador, pastor, secretario |
| `settings` | administrador |
| `users` (incluida su lectura) | administrador |

Los permisos existen en **dos lugares**: `src/config/permissions.js` (los que se aplican) y `public/js/core/permissions.js` (solo ocultan botones). **Si cambias uno, cambia el otro.**

---

## 7. Seguridad

| Protección | Detalle |
|---|---|
| Contraseñas | scrypt con sal; comparación en tiempo constante; mínimo 10 caracteres |
| Límite de intentos | 5 contraseñas incorrectas por IP + correo, o 20 por IP → bloqueo de 15 min (HTTP 429 con `Retry-After`). Recuperación: 5 solicitudes por IP; códigos incorrectos: 10 por IP. Se revisa antes de verificar la contraseña. |
| Tiempo constante | El login siempre ejecuta scrypt (hash ficticio si el correo no existe); el correo de recuperación se envía en segundo plano |
| Sesiones | Cookie `HttpOnly`, `SameSite=Strict`, 8 horas; la base guarda solo el SHA-256 del token. Se revocan al cambiar contraseña o rol, desactivar o eliminar la cuenta |
| Limpieza | Sesiones y códigos vencidos se borran al iniciar, cada hora y en cada login |
| CSRF | `SameSite=Strict` y verificación de `Origin` en solicitudes que modifican datos |
| Entrada | Cuerpo máximo 2 MB; cualquier JSON que no sea objeto responde 400; validación en servidor y reglas en la base |
| Métodos | `/api/logout` solo POST y `/api/me` solo GET; método incorrecto → 405 |
| Navegador | CSP restrictiva (`script-src 'self'`), `X-Content-Type-Options: nosniff`, `frame-ancestors 'none'`; todo texto se escapa antes de insertarse en HTML |
| Archivos estáticos | Solo se sirven `.html`, `.js` y `.css` dentro de `public/` (y el bundle de ExcelJS); se bloquea salir de la carpeta |
| Excel | Los textos que empiezan con `=` se guardan como texto, no como fórmula |

El servidor escucha solo en `127.0.0.1`. Antes de publicarlo para varios equipos se requiere HTTPS, `COOKIE_SECURE=1`, ajustar la IP del cliente si hay proxy y una revisión de seguridad del despliegue.

---

## 8. Correo de recuperación (SMTP)

```powershell
$env:SMTP_HOST='smtp.ejemplo.org'
$env:SMTP_PORT='587'
$env:SMTP_SECURE='0'
$env:SMTP_USER='usuario-smtp'
$env:SMTP_PASS='contraseña-smtp'
$env:SMTP_FROM='Comunidad <no-reply@ejemplo.org>'
npm start
```

`SMTP_SECURE='1'` habilita TLS implícito (habitualmente puerto 465); `'0'` usa STARTTLS (habitualmente 587). Usuario y contraseña son opcionales si el servidor no requiere autenticación. Sin `SMTP_HOST` o `SMTP_FROM` la recuperación responde que no está configurada y no genera códigos.

Para probar sin enviar correos: `$env:DEV_RECOVERY='1'` devuelve el código en la respuesta. **No lo habilites en un servidor compartido.**

---

## 9. Variables de entorno

| Variable | Por defecto | Uso |
|---|---|---|
| `PORT` | `3000` | Puerto del servidor |
| `DB_PATH` | `data/church.sqlite` | Ruta de la base (`:memory:` en pruebas) |
| `COOKIE_SECURE` | — | `1` para marcar la cookie como `Secure` (requiere HTTPS) |
| `DEV_RECOVERY` | — | `1` devuelve el código de recuperación en la respuesta (solo desarrollo) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | — | Correo de recuperación |
| `NODE_ENV` | — | `production` bloquea `db:seed-admin` |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | — | Cambian la cuenta que crea `db:seed-admin` |

---

## 10. Pruebas

`npm test` ejecuta `tests/**/*.test.js` con el corredor nativo de Node, cada archivo en su propio proceso y con base en memoria.

| Archivo | Cubre |
|---|---|
| `api.test.js` | Flujo de usuarios, roles y recuperación por correo (SMTP falso) |
| `database.test.js` | Reglas de la base: fechas, llaves foráneas, centavos, padrón, fila única de ajustes |
| `migration.test.js` | Migración del formato antiguo con datos sucios |
| `users-events.test.js` | Edición, roles, estados y eliminación de usuarios; tipos de evento |
| `excel.test.js` | XLSX real: fechas, montos numéricos, filtros, total y protección contra fórmulas |
| `rf-completion.test.js` | Historial por miembro, responsables, vigencia, indicadores, tendencias y reportes |
| `security.test.js` | Límite de intentos, tiempo constante, JSON inválido, métodos, tokens con hash, permisos y teléfonos |

Toda corrección o función nueva debe llegar con su prueba.

---

## 11. Reglas del equipo

1. **Nunca edites una migración ya compartida**; crea una nueva con el siguiente número.
2. **Todo el SQL va en `database/repositories/`.**
3. **Valida en el servidor** aunque el formulario ya valide; la interfaz solo ayuda al usuario.
4. **Permisos en dos lugares:** servidor (aplica) y frontend (oculta). Cambia ambos.
5. **Dinero en centavos.**
6. **Escapa todo texto** con `esc()` antes de insertarlo en HTML.
7. **No mezcles reorganizaciones con correcciones** en el mismo cambio; así se puede verificar que reorganizar no rompió nada.
8. **Corre `npm test` antes de cada commit.**

---

## 12. Limitaciones conocidas

- El **límite de intentos vive en memoria**: se reinicia al reiniciar el servidor y asume un solo proceso. Con varios procesos debe moverse a un almacén compartido.
- La **IP del cliente** se toma de la conexión TCP, no de `X-Forwarded-For` (que se puede falsificar). Detrás de un proxy hay que ajustar `clientIp` en `src/http/request.js`.
- **`exceljs` 4.4.0** arrastra un aviso moderado de `npm audit` por su dependencia `uuid`; la función afectada no se usa de esa forma. La librería tiene poco mantenimiento: evaluar un reemplazo a futuro.
- **`better-sqlite3` está fijo en 12.11.1** por compatibilidad de instalación en Windows (ver sección 13).
- El administrador **no puede restablecer la contraseña de otro usuario**; sin SMTP configurado, una cuenta con contraseña olvidada debe recrearse.
- No hay **registro de auditoría** (quién cambió qué) ni **respaldos automáticos**.

---

## 13. Solución de problemas de instalación

**`gyp ERR! find VS` al instalar en Windows.** El proyecto fija `better-sqlite3` en `12.11.1`, que trae binarios precompilados para Node 24; la versión 13 puede intentar compilar con `node-gyp`. Desde la carpeta del proyecto:

```powershell
npm install better-sqlite3@12.11.1 --save-exact
npm start
```

**`EBUSY` o `EPERM`.** Cierra las ventanas del proyecto (y cualquier proceso de Node), vuelve a abrir VS Code y reintenta.

**Avisos `npm warn deprecated`.** No son los que detienen la instalación.

**«No se pudo cargar el exportador de Excel».** Falta `exceljs`: ejecuta `npm install` y reinicia el servidor.

**Errores rojos en los `.sql` dentro de VS Code.** Si tienes la extensión de SQL Server, revisa los archivos como T-SQL; las migraciones son SQLite y esos errores no son reales (las pruebas ejecutan esos mismos archivos).

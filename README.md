# Comunidad — administración de iglesia

Sistema web en español para administrar una iglesia: miembros, asistencia, eventos, ministerios, aportaciones, comunicados, reportes y datos institucionales, con acceso por roles (administrador, pastor, secretario, tesorero y coordinador).

## Documentación

| Documento | Para quién |
|---|---|
| 📘 [Manual de usuario](docs/MANUAL_USUARIO.md) | Personal de la iglesia: cómo usar cada módulo paso a paso, qué puede hacer cada rol, reportes, respaldo y problemas comunes |
| 🛠️ [Guía de desarrollo](docs/DESARROLLO.md) | Equipo técnico: arquitectura, base de datos, migraciones, seguridad, variables de entorno y pruebas |
| 📋 [Requisitos funcionales](RF.MD) | RF-01 a RF-10 |

## Inicio rápido

Requiere **Node.js 24 o superior**.

```powershell
npm install
npm start
```

Abre **http://localhost:3000**. La primera vez el sistema pide crear la cuenta del administrador; desde ella se crean las demás cuentas en **Usuarios**.

> **Si `npm install` muestra `npm warn install-scripts … better-sqlite3`**, aprueba el script de instalación de la base de datos y vuelve a iniciar:
>
> ```powershell
> npm install-scripts approve better-sqlite3
> npm start
> ```
>
> Los avisos `npm warn deprecated` y «2 moderate severity vulnerabilities» son conocidos y no impiden usar el sistema; **no ejecutes `npm audit fix --force`** (rompe la exportación a Excel). Más detalles en la [guía de desarrollo](docs/DESARROLLO.md#13-solución-de-problemas-de-instalación).
>

Para desarrollo hay una cuenta de pruebas: `npm run db:seed-admin` (ver la [guía de desarrollo](docs/DESARROLLO.md#cuenta-de-administrador-para-desarrollo)).

## Funciones principales

| Requisito | Qué ofrece |
|---|---|
| RF-01 Usuarios | Inicio de sesión por correo, cinco roles, alta/edición/desactivación de cuentas, recuperación de contraseña por correo y límite de intentos |
| RF-02 Miembros | Registro, búsqueda, filtro activos/inactivos y baja sin borrar el historial |
| RF-03 Asistencia | Listas por evento y fecha con presentes/ausentes e historial por miembro |
| RF-04 Eventos | Eventos religiosos o administrativos, varios responsables, cancelación y calendario |
| RF-05 Ministerios | Coordinador, integrantes y actividades programadas |
| RF-06 Aportaciones | Montos exactos, método de recepción, donante opcional (anónimo) y totales por periodo; solo administrador y tesorero |
| RF-07 Comunicados | Fecha de publicación real, vigencia opcional y avisos importantes |
| RF-08 Vista general | Indicadores y gráficas de tendencia de asistencia e ingresos |
| RF-09 Reportes | Miembros, asistencia por evento y por miembro, ministerios e ingresos; exportación a Excel (.xlsx) y PDF |
| RF-10 Mi iglesia | Nombre, logotipo, dirección, contacto y horarios |

## Datos y respaldo

Toda la información se guarda en la carpeta `data/` (SQLite), que **no** se sube al repositorio. Para respaldarla, detén el sistema y copia esa carpeta; el procedimiento completo está en el [manual de usuario](docs/MANUAL_USUARIO.md#13-respaldo-de-la-información).

El sistema está pensado para uso local (escucha solo en `127.0.0.1`). Antes de publicarlo en una red revisa la sección de seguridad de la [guía de desarrollo](docs/DESARROLLO.md#7-seguridad).

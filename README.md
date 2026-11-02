# Comunidad — administración de iglesia

Aplicación local en español, Node.js 24 o superior. Datos persistentes en SQLite; Nodemailer se utiliza para enviar códigos de recuperación por SMTP.

## Ejecutar

```powershell
npm start
```

Abrir http://localhost:3000 y crear el primer administrador. No hay cuentas ni datos de demostración. Para verificar el servidor: `npm test` (usa una base en memoria).

## Funciones

- RF-01: correo y contraseña, registro de usuarios por administrador, cinco roles, cierre de sesión y restablecimiento con códigos de un solo uso (30 minutos). Contraseñas con scrypt, sesiones HttpOnly de ocho horas y revocación al restablecer contraseña.
- RF-02: listado, búsqueda, filtros, edición y desactivación de miembros.
- RF-03: asistencia por evento y fecha, presentes y ausentes; historial y resúmenes semanales y mensuales en Reportes. El panel cuenta registros de asistencia, no personas presentes. No se permite duplicar evento y fecha.
- RF-04: eventos con lugar, responsable, descripción, cancelación y calendario mensual.
- RF-05: ministerios, coordinadores, integrantes y eventos vinculados. Las actividades se consultan al editar el ministerio.
- RF-06: aportaciones con o sin donante, filtros de fechas y resumen mensual en el panel. Solo administrador y tesorero acceden a datos financieros, también en la API.
- RF-07: comunicados con fecha de publicación e indicador de importancia; edición, eliminación y avisos futuros/importantes en el panel.
- RF-08: indicadores, próximos eventos, avisos y gráficas de asistencia y participación.
- RF-09: reportes de miembros (filtrados por fecha de ingreso), asistencia, participación por ministerio (integrantes, actividades y asistencias) e ingresos; filtros por periodo, agrupación semanal/mensual y exportación Excel XML (.xls) o PDF mediante el diálogo de impresión del navegador (Guardar como PDF). La exportación Excel usa formato XML Spreadsheet 2003, no XLSX.
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

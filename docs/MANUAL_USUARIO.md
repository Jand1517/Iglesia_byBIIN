# Manual de usuario — Comunidad

Guía para el personal de la iglesia que usa el sistema todos los días: administración, pastoral, secretaría, tesorería y coordinación de ministerios.

> ¿Necesitas instalar el sistema o modificar su código? Eso está en [DESARROLLO.md](DESARROLLO.md).

## Contenido

1. [Primeros pasos](#1-primeros-pasos)
2. [Qué puede hacer cada rol](#2-qué-puede-hacer-cada-rol)
3. [Vista general](#3-vista-general)
4. [Miembros](#4-miembros)
5. [Asistencia](#5-asistencia)
6. [Eventos](#6-eventos)
7. [Ministerios](#7-ministerios)
8. [Aportaciones](#8-aportaciones)
9. [Comunicados](#9-comunicados)
10. [Reportes y exportación a Excel o PDF](#10-reportes-y-exportación-a-excel-o-pdf)
11. [Usuarios (solo administrador)](#11-usuarios-solo-administrador)
12. [Mi iglesia](#12-mi-iglesia)
13. [Respaldo de la información](#13-respaldo-de-la-información)
14. [Preguntas frecuentes y problemas comunes](#14-preguntas-frecuentes-y-problemas-comunes)

---

## 1. Primeros pasos

### Abrir el sistema
Con el sistema en marcha, abre en el navegador: **http://localhost:3000**

### La primera vez: crear el administrador
Si nadie ha usado el sistema, aparece la pantalla **«Comencemos juntos»**. Escribe tu nombre completo, tu correo y una contraseña de **al menos 10 caracteres**, y pulsa **Crear administrador**. Esta pantalla solo aparece una vez; las demás cuentas las crea el administrador desde **Usuarios**.

### Iniciar sesión
1. Escribe tu correo y tu contraseña.
2. Pulsa **Iniciar sesión**.

La sesión dura **8 horas**; después el sistema vuelve a pedir tus datos. Para salir antes, pulsa **Cerrar sesión** (abajo a la izquierda). Cierra siempre sesión en computadoras compartidas.

> **Si te equivocas 5 veces seguidas** con la contraseña, el sistema bloquea ese correo durante **15 minutos** en esa computadora (también se bloquea si desde la misma computadora se prueban 20 contraseñas incorrectas con correos distintos). Es una protección contra quien intenta adivinar contraseñas. Espera y vuelve a intentarlo.

### Olvidé mi contraseña
1. En la pantalla de inicio pulsa **Restablecer contraseña**.
2. Escribe tu correo y pulsa **Guardar**.
3. Revisa tu correo (también la carpeta de *no deseado*): llega un **código de recuperación**.
4. Pega el código, escribe tu **nueva contraseña** (mínimo 10 caracteres) y pulsa **Guardar**.

El código sirve **una sola vez** y vence en **30 minutos**. Al cambiar la contraseña se cierran tus sesiones abiertas en otras computadoras.

> Si aparece «La recuperación por correo no está configurada», tu iglesia aún no configuró el envío de correos. Pide ayuda al administrador.

### Cómo se usa la pantalla
- **Menú de la izquierda:** cada opción es un módulo. Solo ves los módulos que tu rol permite.
- **Botón «+ Nuevo registro»** (arriba a la derecha): agrega un registro. Si no aparece, tu rol solo puede consultar ese módulo.
- **Buscar:** la caja de búsqueda filtra mientras escribes.
- **Editar:** cada fila tiene sus botones en la columna **Acciones**.
- Los mensajes de confirmación o de error aparecen unos segundos en la parte inferior.

---

## 2. Qué puede hacer cada rol

✏️ = consultar y modificar · 👁️ = solo consultar · — = no lo ve

| Módulo | Administrador | Pastor | Secretario | Coordinador | Tesorero |
|---|:-:|:-:|:-:|:-:|:-:|
| Vista general | 👁️ | 👁️ | 👁️ | 👁️ | 👁️ |
| Miembros | ✏️ | ✏️ | ✏️ | 👁️ | 👁️ |
| Asistencia | ✏️ | ✏️ | ✏️ | ✏️ | 👁️ |
| Eventos | ✏️ | ✏️ | ✏️ | ✏️ | 👁️ |
| Ministerios | ✏️ | ✏️ | ✏️ | ✏️ | 👁️ |
| Aportaciones | ✏️ | — | — | — | ✏️ |
| Comunicados | ✏️ | ✏️ | ✏️ | 👁️ | 👁️ |
| Reportes | 👁️ | 👁️ | 👁️ | 👁️ | 👁️ |
| Reporte de ingresos | 👁️ | — | — | — | 👁️ |
| Usuarios | ✏️ | — | — | — | — |
| Mi iglesia | ✏️ | 👁️ | 👁️ | 👁️ | 👁️ |

La información financiera (aportaciones, ingresos del mes y reporte de ingresos) **solo** la ven el administrador y el tesorero.

---

## 3. Vista general

Es la primera pantalla después de iniciar sesión. Muestra:

| Indicador | Qué significa |
|---|---|
| **Miembros activos** | Personas con estado *Activo*. |
| **Próximos eventos** | Eventos desde hoy en adelante que no están cancelados. |
| **Asistencias registradas** | Total de **personas presentes** sumando todas las listas de asistencia (debajo dice en cuántas listas). |
| **Ministerios** | Cantidad de ministerios registrados. |
| **Ingresos del mes** | Suma de aportaciones del mes actual *(solo administrador y tesorero)*. |

Gráficas:
- **Asistencia por semana:** personas presentes en las últimas 12 semanas. Pasa el cursor sobre la línea para ver el número exacto de cada semana.
- **Ingresos por mes:** últimos 6 meses *(solo administrador y tesorero)*.
- **Participación por ministerio:** integrantes de cada ministerio.

También aparecen los **próximos encuentros** y los **avisos vigentes** (los importantes primero).

---

## 4. Miembros

### Registrar un miembro
1. **Miembros → + Nuevo registro**.
2. Llena **nombre completo** y **fecha de ingreso** (obligatorios); teléfono y correo son opcionales.
3. Deja el estado en **Activo** y pulsa **Guardar**.

**Formato del teléfono:** solo números, espacios y los signos `+ - ( ) .` — por ejemplo `9991234567` o `+52 (999) 123-4567`. No se aceptan letras.

### Buscar y filtrar
- Escribe en **Buscar en miembros…** (nombre, teléfono o correo).
- Usa el selector **Todos los estados / Activos / Inactivos**.

### Dar de baja a un miembro
Los miembros **no se eliminan**, para conservar su historial de asistencia y aportaciones. Pulsa **Editar**, cambia el estado a **Inactivo** y guarda. Puedes reactivarlo cuando quieras.

### Historial de asistencia de un miembro
Pulsa **Historial** en la fila del miembro. Verás cuántas veces asistió, cuántas faltó, su porcentaje de asistencia, su última asistencia y el detalle fecha por fecha. Este botón está disponible para todos los roles.

---

## 5. Asistencia

### Registrar la asistencia de un culto o actividad
1. Primero el evento debe existir en **Eventos** (ver sección 6).
2. **Asistencia → + Registrar asistencia**.
3. Elige el **evento** y la **fecha**.
4. **Marca a las personas presentes.** Todos los miembros activos que no marques quedan como **ausentes**.
5. Pulsa **Guardar**.

> Solo puede haber **una lista por evento y fecha**. Si ya existe, el sistema avisa «Ya existe asistencia para ese evento y fecha»: búscala en la tabla y usa **Editar**.

### Corregir una lista
Pulsa **Editar** en la lista, cambia las marcas y guarda. La lista conserva a las personas que eran miembros activos el día que se creó, aunque después alguna se haya dado de baja.

### Consultar el historial
La tabla muestra cada lista con su evento, fecha, presentes y ausentes. Para el historial de una persona usa **Miembros → Historial**. Para resúmenes semanales o mensuales usa **Reportes** (sección 10).

---

## 6. Eventos

### Crear un evento
1. **Eventos → + Nuevo registro**.
2. Llena:
   - **Título**, **fecha**, **hora** y **lugar** (obligatorios).
   - **Tipo de evento:** *Religioso* (cultos, oraciones, estudios) o *Administrativo* (juntas, reuniones de trabajo). Es obligatorio.
   - **Descripción** (opcional).
   - **Responsables:** marca una o varias personas.
   - **Ministerio relacionado** (opcional): así el evento aparece en las actividades de ese ministerio.
3. Pulsa **Guardar**.

### Cancelar o modificar
Pulsa **Editar**. Para cancelar cambia el **Estado** a *Cancelado*; el evento se conserva en el historial pero deja de contar como próximo.

> Los eventos anteriores a la clasificación por tipo aparecen como **«Sin clasificar»**. Al editarlos, asígnales *Religioso* o *Administrativo*.

### Calendario
Pulsa **Ver calendario** y elige el mes. Si antes filtraste por tipo, el calendario muestra solo ese tipo. **Volver al listado** regresa a la tabla.

---

## 7. Ministerios

### Registrar un ministerio
1. **Ministerios → + Nuevo registro**.
2. Escribe el **nombre** (por ejemplo: Música, Jóvenes, Niños, Enseñanza, Servicio).
3. Elige al **coordinador** (debe estar registrado como miembro).
4. Marca a los **integrantes** y guarda.

### Consultar un ministerio
Pulsa **Ver**: muestra coordinador, integrantes, **actividades programadas** (eventos futuros no cancelados vinculados a ese ministerio) y, plegadas, las actividades ya realizadas. Disponible para todos los roles.

Para que un evento aparezca aquí, al crearlo elige el ministerio en **Ministerio relacionado**.

---

## 8. Aportaciones

*Solo administrador y tesorero.*

### Registrar una aportación
1. **Aportaciones → + Nuevo registro**.
2. Llena **fecha**, **monto en pesos (MXN)** con máximo 2 decimales, **concepto** (por ejemplo: Ofrenda, Diezmo) y **método de recepción** (Efectivo, Transferencia, Tarjeta u Otro).
3. **Donante:** elige al miembro o deja **Anónimo**; no es obligatorio asociarla a una persona.
4. Pulsa **Guardar**.

### Consultar por periodo
Usa **Desde** y **Hasta**: la tabla se filtra y arriba aparece el **total del periodo**.

Las aportaciones no se eliminan, para conservar el registro financiero; si hubo un error, corrígela con **Editar**.

---

## 9. Comunicados

### Publicar un aviso
1. **Comunicados → + Nuevo registro**.
2. Escribe **título** y **mensaje**.
3. **Fecha de publicación:** el aviso se muestra **a partir de ese día**. Puedes programarlo con una fecha futura.
4. **Vigente hasta** (opcional): último día en que se muestra. Déjalo vacío si no vence.
5. Marca **Aviso importante** si debe aparecer primero.
6. Pulsa **Guardar**.

### Estados
| Estado | Significa |
|---|---|
| **Programado** | Su fecha de publicación aún no llega; no se muestra en la Vista general. |
| **Publicado** | Se muestra en la Vista general. |
| **Vencido** | Pasó su fecha «Vigente hasta»; ya no se muestra. |

Usa el filtro de estados para encontrarlos rápido. Los comunicados sí se pueden **Eliminar**.

---

## 10. Reportes y exportación a Excel o PDF

### Generar un reporte
1. Abre **Reportes**.
2. Elige el tipo:

| Reporte | Muestra |
|---|---|
| **General de miembros** | Listado de miembros (el periodo filtra por fecha de ingreso). |
| **Asistencia por evento** | Por cada evento: listas, presencias, ausencias y % de asistencia. |
| **Asistencia por miembro** | Por cada persona: veces convocada, asistencias, ausencias, % y última asistencia. |
| **Participación por ministerio** | Integrantes, actividades y participaciones de cada ministerio. |
| **Ingresos por periodo** | Aportaciones del periodo *(solo administrador y tesorero)*. |

3. Opcional: limita las fechas con **Desde / Hasta**.
4. Elige la agrupación: **Detalle**, **Semanal** o **Mensual** (para resúmenes por semana o por mes).

### Exportar a Excel
Pulsa **Exportar Excel (.xlsx)**. Se descarga un archivo como `reporte-donations-2026-11-05.xlsx` con:
- El nombre de la iglesia, el título y el periodo en las primeras filas.
- Encabezados fijos al desplazarte y filtros en cada columna.
- Fechas y montos como valores reales: puedes sumarlos, ordenarlos y graficarlos en Excel.
- En ingresos, una fila **Total de ingresos** que se recalcula si filtras filas.

### Exportar a PDF
Pulsa **Imprimir / PDF** y en el diálogo de impresión elige **Guardar como PDF**. El menú y los botones no se imprimen.

---

## 11. Usuarios (solo administrador)

Los **usuarios** son las personas que entran al sistema; los **miembros** son la congregación. Son cosas distintas.

### Crear una cuenta
1. **Usuarios → + Nuevo registro**.
2. Escribe nombre, correo, una **contraseña inicial** (mínimo 10 caracteres) y el **rol** (consulta la tabla de la sección 2).
3. Guarda y entrega la contraseña a la persona por un medio privado.

### Modificar, desactivar o eliminar
| Acción | Efecto |
|---|---|
| **Editar** | Cambia nombre, correo o rol. Si cambias el rol, la persona debe volver a iniciar sesión. |
| **Desactivar** | La persona deja de poder entrar **de inmediato**; su cuenta se conserva y puedes **Activarla** después. Úsalo cuando alguien deja su cargo. |
| **Eliminar** | Borra la cuenta definitivamente. |

Por seguridad: no puedes desactivar, eliminar ni cambiar el rol de **tu propia cuenta**, y siempre debe quedar **al menos un administrador activo**.

---

## 12. Mi iglesia

El **administrador** registra y actualiza:
- Nombre de la iglesia (aparece arriba en todas las pantallas).
- Dirección, teléfono y correo de contacto.
- Horarios habituales de reuniones.
- Logotipo: imagen PNG, JPEG o WebP de hasta 500 KB; aparece en el menú.

Pulsa **Guardar información** para aplicar los cambios. Los demás roles ven esta información **en modo de solo consulta**.

---

## 13. Respaldo de la información

Toda la información vive en la carpeta **`data`** del sistema. Haz un respaldo al menos una vez por semana y antes de actualizar el sistema.

### Hacer un respaldo
1. Pide a todos que cierren sesión y **detén el sistema** (en la ventana donde corre, presiona `Ctrl + C`).
2. Copia la carpeta **`data` completa** (con sus tres archivos `church.sqlite`, `church.sqlite-shm` y `church.sqlite-wal`, si existen) a una memoria USB o a una nube privada. Nómbrala con la fecha, por ejemplo `respaldo-2026-11-05`.
3. Vuelve a iniciar el sistema.

### Restaurar un respaldo
1. Detén el sistema.
2. Renombra la carpeta `data` actual (por ejemplo `data-anterior`) por si la necesitas.
3. Copia la carpeta del respaldo en su lugar con el nombre `data`.
4. Inicia el sistema y revisa que la información sea la esperada.

> El respaldo contiene datos personales y financieros: guárdalo en un lugar seguro y no lo compartas.

---

## 14. Preguntas frecuentes y problemas comunes

**Dice «Demasiados intentos. Espera 15 minutos…»**
Hubo varias contraseñas incorrectas seguidas. Espera el tiempo indicado. Si olvidaste la contraseña, usa **Restablecer contraseña**.

**Dice «Correo o contraseña incorrectos» y estoy segura de que es correcta**
Revisa mayúsculas en la contraseña. Si tu cuenta fue **desactivada**, el mensaje es el mismo por seguridad: consulta con el administrador.

**No aparece el botón «+ Nuevo registro»**
Tu rol solo puede consultar ese módulo (ver sección 2).

**No veo «Aportaciones» ni los ingresos**
Solo el administrador y el tesorero tienen acceso a la información financiera.

**Dice «Teléfono inválido»**
Usa solo números, espacios y `+ - ( ) .`, con al menos 7 dígitos.

**El botón de Excel dice «No se pudo cargar el exportador de Excel»**
Avisa a quien administra la instalación: falta un componente del sistema (se resuelve con `npm install` y reiniciando el sistema).

**Hice un cambio y no lo veo**
Recarga la página con `Ctrl + F5`.

**Un aviso que publiqué no aparece en la Vista general**
Revisa su estado en **Comunicados**: si está *Programado*, aún no llega su fecha de publicación; si está *Vencido*, ya pasó su fecha «Vigente hasta».

**Se cerró mi sesión sola**
Las sesiones duran 8 horas. También se cierran si el administrador cambió tu rol o desactivó tu cuenta, o si cambiaste tu contraseña.

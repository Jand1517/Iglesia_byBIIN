const $ = (s) => document.querySelector(s),
  esc = (v) =>
    String(v ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
let me,
  data = {},
  page = "dashboard",
  reportRows = [],
  reportCols = [],
  month = new Date().toISOString().slice(0, 7);
const today = () => new Date().toLocaleDateString("en-CA"),
  money = (v) =>
    Number(v).toLocaleString("es-MX", { style: "currency", currency: "MXN" });
const names = {
  dashboard: "Vista general",
  members: "Miembros",
  attendance: "Asistencia",
  events: "Eventos",
  ministries: "Ministerios",
  donations: "Aportaciones",
  announcements: "Comunicados",
  reports: "Reportes",
  users: "Usuarios",
  settings: "Mi iglesia",
};
const rights = {
  members: ["administrador", "pastor", "secretario"],
  attendance: ["administrador", "pastor", "secretario", "coordinador"],
  events: ["administrador", "pastor", "secretario", "coordinador"],
  ministries: ["administrador", "pastor", "secretario", "coordinador"],
  donations: ["administrador", "tesorero"],
  announcements: ["administrador", "pastor", "secretario"],
  users: ["administrador"],
  settings: ["administrador"],
};
const can = (k) => rights[k]?.includes(me.role),
  financial = () => can("donations");
async function api(p, b, method) {
  const r = await fetch("/api/" + p, {
    method: method || (b ? "POST" : "GET"),
    headers: { "Content-Type": "application/json" },
    ...(b ? { body: JSON.stringify(b) } : {}),
  });
  const v = await r.json();
  if (!r.ok) throw Error(v.error);
  return v;
}
function notice(t) {
  $("#notice").textContent = t;
  $("#notice").style.display = "block";
  setTimeout(() => ($("#notice").style.display = "none"), 4500);
}
async function run(fn) {
  try {
    await fn();
  } catch (e) {
    notice(e.message);
  }
}
function field(
  name,
  label,
  type = "text",
  value = "",
  required = true,
  options = [],
) {
  return `<label>${esc(label)}${type === "select" ? `<select name="${name}" ${required ? "required" : ""}>${options.map((o) => `<option value="${esc(o[0])}" ${String(value) === String(o[0]) ? "selected" : ""}>${esc(o[1])}</option>`).join("")}</select>` : type === "textarea" ? `<textarea name="${name}" ${required ? "required" : ""}>${esc(value)}</textarea>` : `<input name="${name}" type="${type}" value="${esc(value)}" ${required ? "required" : ""} ${type === "password" ? 'minlength="10"' : ""} ${type === "number" ? 'min="0.01" step="0.01"' : ""}>`}</label>`;
}
function showModal(title, body, submit) {
  $("#modal-content").innerHTML =
    `<h2>${esc(title)}</h2><form id="editform">${body}<div class="actions"><button type="button" id="close">Cancelar</button><button class="primary">Guardar</button></div></form>`;
  $("#close").onclick = () => $("#modal").close();
  $("#editform").onsubmit = (e) => {
    e.preventDefault();
    run(async () => {
      await submit(new FormData(e.target));
      $("#modal").close();
      if (me) {
        await load();
        render();
      }
      notice("Cambios guardados");
    });
  };
  $("#modal").showModal();
}
async function auth() {
  const status = await api("status");
  $("#app").innerHTML =
    `<main class="auth"><div class="brand"><span class="mark">✦</span> Comunidad</div><p class="eyebrow">Administración de iglesia</p><h1>${status.setup ? "Comencemos juntos" : "Bienvenido de nuevo"}</h1><p class="muted">${status.setup ? "Crea la cuenta del primer administrador." : "Un espacio para cuidar de tu comunidad."}</p><form id="login">${status.setup ? field("name", "Nombre completo") : ""}${field("email", "Correo electrónico", "email")}${field("password", "Contraseña", "password")}<button class="primary">${status.setup ? "Crear administrador" : "Iniciar sesión"}</button></form>${!status.setup ? '<p><button id="recover">Restablecer contraseña</button></p>' : ""}</main>`;
  $("#login").onsubmit = (e) => {
    e.preventDefault();
    run(async () => {
      let b = Object.fromEntries(new FormData(e.target));
      if (status.setup) await api("setup", b);
      await api("login", b);
      await start();
    });
  };
  if ($("#recover"))
    $("#recover").onclick = () =>
      showModal(
        "Recuperar acceso",
        field("email", "Correo electrónico", "email"),
        async (f) => {
          const v = await api("recover", { email: f.get("email") });
          setTimeout(() => {
            showModal(
              "Restablecer contraseña",
              `<p>${esc(v.message)} ${v.token ? `Modo desarrollo: código ${esc(v.token)}.` : "Revisa tu correo y la carpeta de correo no deseado."}</p>` +
                field(
                  "token",
                  "Código de recuperación",
                  "text",
                  v.token || "",
                ) +
                field("password", "Nueva contraseña", "password"),
              async (g) => {
                await api("reset", Object.fromEntries(g));
                notice("Contraseña restablecida");
              },
            );
          }, 0);
        },
      );
}
async function load() {
  const keys = [
    "members",
    "events",
    "attendance",
    "ministries",
    "announcements",
    "settings",
    ...(financial() ? ["donations"] : []),
    ...(can("users") ? ["users"] : []),
  ];
  await Promise.all(keys.map(async (k) => (data[k] = await api(k))));
}
async function start() {
  me = await api("me");
  await load();
  render();
}
function render() {
  const church = data.settings?.[0] || { name: "Mi iglesia" };
  $("#app").innerHTML =
    `<div class="layout"><aside class="sidebar"><div class="brand">${church.logo ? `<img class="logo" src="${esc(church.logo)}" alt="Logotipo">` : '<span class="mark">✦</span>'}<span>Comunidad<br><small style="font:11px Segoe UI;letter-spacing:2px">VIDA EN COMUNIDAD</small></span></div><nav class="nav">${Object.entries(
      names,
    )
      .filter(([k]) => !["donations", "users"].includes(k) || can(k))
      .map(
        ([k, v], i) =>
          `<button data-page="${k}" class="${page === k ? "active" : ""}"><span style="opacity:.5;margin-right:12px">${String(i + 1).padStart(2, "0")}</span>${v}</button>`,
      )
      .join(
        "",
      )}</nav><div class="profile"><div>${esc(me.name)}<br><small>${esc(me.role)}</small></div><button id="logout">Cerrar sesión ↗</button></div></aside><main class="main"><header class="topbar"><span>${esc(church.name)}</span><small>${new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}</small></header><div class="heading"><div><p class="eyebrow">Tu comunidad, más cerca</p><h1>${names[page]}</h1><span class="muted">${page === "dashboard" ? "Lo que sucede en la vida de nuestra iglesia." : "Organiza, consulta y acompaña a tu comunidad."}</span></div>${can(page) && page !== "settings" ? '<button class="primary" id="add">+ ' + (page === "attendance" ? "Registrar asistencia" : "Nuevo registro") + "</button>" : ""}</div><section id="content"></section><footer class="muted" style="margin-top:30px;font-size:12px">COMUNIDAD &nbsp; / &nbsp; Unidos para servir.</footer></main></div>`;
  document.querySelectorAll("[data-page]").forEach(
    (b) =>
      (b.onclick = () => {
        page = b.dataset.page;
        render();
      }),
  );
  $("#logout").onclick = () =>
    run(async () => {
      await api("logout", {});
      me = null;
      await auth();
    });
  if ($("#add")) $("#add").onclick = () => edit(page);
  if (page === "dashboard") dashboard();
  else if (page === "reports") reports();
  else if (page === "settings") settings();
  else listing();
}
function dashboard() {
  const active = data.members.filter((m) => m.active !== false).length,
    upcoming = data.events
      .filter((e) => e.date >= today() && !e.cancelled)
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)),
    notices = data.announcements
      .filter((a) => a.important || a.date >= today())
      .sort(
        (a, b) =>
          Number(b.important) - Number(a.important) ||
          a.date.localeCompare(b.date),
      );
  $("#content").innerHTML =
    `<div class="hero"><p class="eyebrow">Cada persona cuenta</p><h2>Una comunidad que crece unida.</h2><p>Acompañar, organizar y servir. Aquí encontrarás una mirada a los miembros, encuentros y ministerios de tu iglesia.</p></div><div class="stats">${[
      ["Miembros activos", active, "Personas en nuestra comunidad"],
      ["Próximos eventos", upcoming.length, "Encuentros por compartir"],
      [
        "Asistencias registradas",
        data.attendance.length,
        "Eventos con lista de asistencia",
      ],
      ["Ministerios", data.ministries.length, "Espacios para servir"],
    ]
      .map(
        ([l, n, t]) =>
          `<div class="stat"><small>${l}</small><strong>${n}</strong><small>${t}</small></div>`,
      )
      .join(
        "",
      )}</div><div class="grid"><div class="panel"><h2>Próximos encuentros</h2>${
      upcoming
        .slice(0, 5)
        .map(
          (e) =>
            `<div class="row"><div><strong>${esc(e.title)}</strong><p class="muted" style="margin:7px 0 0">${esc(e.place)} · ${esc(e.time)}</p></div><span class="badge">${esc(e.date)}</span></div>`,
        )
        .join("") || '<p class="empty">Aún no hay próximos eventos.</p>'
    }</div><div class="panel"><h2>Participación por ministerio</h2>${data.ministries.map((m) => `<div class="bar"><span>${esc(m.name)}</span><i style="width:${Math.min(100, ((m.members || []).length / Math.max(1, active)) * 100)}%"></i><b>${(m.members || []).length}</b></div>`).join("") || '<p class="empty">Registra tu primer ministerio.</p>'}</div><div class="panel"><h2>Avisos importantes y próximos</h2>${
      notices
        .slice(0, 4)
        .map(
          (a) =>
            `<div class="row"><div><strong>${esc(a.title)}${a.important ? ' <span class="badge important">Importante</span>' : ""}</strong><p>${esc(a.body)}</p><small>${esc(a.date)}</small></div></div>`,
        )
        .join("") || '<p class="muted">Sin avisos publicados.</p>'
    }</div><div class="panel"><h2>Asistencia reciente</h2>${
      data.attendance
        .slice(-6)
        .map(
          (a) =>
            `<div class="bar"><span>${esc(a.date)}</span><i style="width:${(a.present.length / Math.max(1, a.roster?.length || active)) * 100}%"></i><b>${a.present.length}</b></div>`,
        )
        .join("") ||
      '<p class="muted">Registra asistencia para ver las estadísticas.</p>'
    }${financial() ? `<hr><small>Ingresos de ${esc(month)}</small><h2 style="margin-top:12px">${money(data.donations.filter((d) => d.date.startsWith(month)).reduce((s, d) => s + Number(d.amount), 0))}</h2>` : ""}</div></div>`;
}
const memberName = (id) =>
    data.members.find((m) => m.id === id)?.name || "Sin asignar",
  eventName = (id) => data.events.find((e) => e.id === id)?.title || "Evento";
const cols = {
  members: [
    ["name", "Nombre"],
    ["phone", "Teléfono"],
    ["email", "Correo"],
    ["joined", "Ingreso"],
    ["active", "Estado"],
  ],
  events: [
    ["title", "Evento"],
    ["date", "Fecha"],
    ["time", "Hora"],
    ["place", "Lugar"],
    ["responsible", "Responsable"],
    ["cancelled", "Estado"],
  ],
  ministries: [
    ["name", "Ministerio"],
    ["coordinator", "Coordinador"],
    ["members", "Integrantes"],
  ],
  donations: [
    ["date", "Fecha"],
    ["amount", "Monto"],
    ["concept", "Concepto"],
    ["method", "Método"],
    ["member", "Donante"],
  ],
  announcements: [
    ["title", "Título"],
    ["body", "Mensaje"],
    ["date", "Publicación"],
    ["important", "Prioridad"],
  ],
  attendance: [
    ["event", "Evento"],
    ["date", "Fecha"],
    ["present", "Presentes"],
    ["absent", "Ausentes"],
  ],
  users: [
    ["name", "Nombre"],
    ["email", "Correo"],
    ["role", "Rol"],
  ],
};
function val(row, key) {
  if (key === "active") return row.active === false ? "Inactivo" : "Activo";
  if (key === "important") return row.important ? "Importante" : "Normal";
  if (key === "cancelled") return row.cancelled ? "Cancelado" : "Programado";
  if (key === "amount") return money(row.amount);
  if (key === "member") return row.member ? memberName(row.member) : "Anónimo";
  if (key === "coordinator" || key === "responsible")
    return memberName(row[key]);
  if (key === "members")
    return (row.members || []).map(memberName).join(", ") || "Sin integrantes";
  if (key === "event") return eventName(row.event);
  if (key === "present") return row.present.length;
  if (key === "absent")
    return (row.roster || []).filter((id) => !row.present.includes(id)).length;
  return row[key] || "—";
}
function table(rows, columns, actions = false) {
  return `<div class="tablewrap"><table><thead><tr>${columns.map((c) => `<th>${esc(c[1])}</th>`).join("")}${actions ? "<th>Acciones</th>" : ""}</tr></thead><tbody>${rows.map((r) => `<tr>${columns.map((c) => `<td>${esc(val(r, c[0]))}</td>`).join("")}${actions ? `<td><button data-edit="${esc(r.id)}">Editar</button>${page === "announcements" ? ` <button data-delete="${esc(r.id)}">Eliminar</button>` : ""}</td>` : ""}</tr>`).join("")}</tbody></table>${rows.length ? "" : '<div class="empty">Aún no hay registros para mostrar.</div>'}</div>`;
}
function listing() {
  const k = page;
  $("#content").innerHTML =
    `<div class="toolbar"><input id="search" placeholder="Buscar en ${names[k].toLowerCase()}…" aria-label="Buscar">${k === "members" ? '<select id="active" aria-label="Estado"><option value="all">Todos los estados</option><option value="yes">Activos</option><option value="no">Inactivos</option></select>' : ""}${k === "donations" ? '<label>Desde <input id="from" type="date"></label><label>Hasta <input id="to" type="date"></label>' : ""}${k === "events" ? '<button id="calendar">Ver calendario</button>' : ""}</div><div id="rows"></div>`;
  const update = () => {
    let rows = data[k].filter((r) =>
      Object.values(r)
        .join(" ")
        .toLowerCase()
        .includes($("#search").value.toLowerCase()),
    );
    if ($("#active") && $("#active").value !== "all")
      rows = rows.filter(
        (r) => (r.active !== false) === ($("#active").value === "yes"),
      );
    if ($("#from")?.value)
      rows = rows.filter((r) => r.date >= $("#from").value);
    if ($("#to")?.value) rows = rows.filter((r) => r.date <= $("#to").value);
    $("#rows").innerHTML =
      (k === "donations"
        ? `<p>Total del periodo: <strong>${money(rows.reduce((s, r) => s + Number(r.amount), 0))}</strong></p>`
        : "") + table(rows, cols[k], can(k) && k !== "users");
    document.querySelectorAll("[data-edit]").forEach(
      (b) =>
        (b.onclick = () =>
          edit(
            k,
            data[k].find((r) => r.id === b.dataset.edit),
          )),
    );
    document.querySelectorAll("[data-delete]").forEach(
      (b) =>
        (b.onclick = () => {
          if (confirm("¿Eliminar este comunicado?"))
            run(async () => {
              await api(k, { id: b.dataset.delete }, "DELETE");
              await load();
              render();
            });
        }),
    );
  };
  $("#search").oninput = update;
  ["active", "from", "to"].forEach((id) => {
    if ($("#" + id)) $("#" + id).onchange = update;
  });
  if ($("#calendar")) $("#calendar").onclick = calendar;
  update();
}
function calendar() {
  const [y, m] = month.split("-").map(Number),
    first = new Date(y, m - 1, 1).getDay(),
    days = new Date(y, m, 0).getDate();
  $("#rows").innerHTML =
    `<div class="toolbar"><label>Mes <input id="month" type="month" value="${month}"></label><button id="list">Volver al listado</button></div><div class="calendar">${["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((d) => `<b>${d}</b>`).join("")}${"<div></div>".repeat(first)}${Array.from(
      { length: days },
      (_, i) => {
        const date = month + "-" + String(i + 1).padStart(2, "0");
        return `<div class="day">${i + 1}${data.events
          .filter((e) => e.date === date)
          .map(
            (e) =>
              `<small>${esc(e.time)} ${esc(e.title)}${e.cancelled ? " · Cancelado" : ""}</small>`,
          )
          .join("")}</div>`;
      },
    ).join("")}</div>`;
  $("#month").onchange = (e) => {
    if (e.target.value) {
      month = e.target.value;
      calendar();
    }
  };
  $("#list").onclick = listing;
}
function edit(k, r = {}) {
  const people = [
    ["", "Sin asignar"],
    ...data.members.map((m) => [m.id, m.name]),
  ];
  let f = "";
  if (k === "members")
    f =
      field("name", "Nombre completo", "text", r.name) +
      field("phone", "Teléfono", "tel", r.phone, false) +
      field("email", "Correo", "email", r.email, false) +
      field("joined", "Fecha de ingreso", "date", r.joined || today()) +
      field(
        "active",
        "Estado",
        "select",
        r.active === false ? "false" : "true",
        true,
        [
          ["true", "Activo"],
          ["false", "Inactivo"],
        ],
      );
  if (k === "events")
    f =
      field("title", "Título", "text", r.title) +
      field("date", "Fecha", "date", r.date || today()) +
      field("time", "Hora", "time", r.time) +
      field("place", "Lugar", "text", r.place) +
      field("description", "Descripción", "textarea", r.description, false) +
      field(
        "responsible",
        "Responsable",
        "select",
        r.responsible,
        false,
        people,
      ) +
      field("ministry", "Ministerio relacionado", "select", r.ministry, false, [
        ["", "Ninguno"],
        ...data.ministries.map((m) => [m.id, m.name]),
      ]) +
      field(
        "cancelled",
        "Estado",
        "select",
        r.cancelled ? "true" : "false",
        true,
        [
          ["false", "Programado"],
          ["true", "Cancelado"],
        ],
      );
  if (k === "ministries")
    f =
      field("name", "Nombre del ministerio", "text", r.name) +
      field(
        "coordinator",
        "Coordinador",
        "select",
        r.coordinator,
        true,
        people,
      ) +
      `<label>Integrantes</label><div class="checks">${data.members.map((m) => `<label><input type="checkbox" name="members" value="${m.id}" ${(r.members || []).includes(m.id) ? "checked" : ""}>${esc(m.name)}</label>`).join("")}</div>` +
      (r.id
        ? `<p>Actividades: ${esc(
            data.events
              .filter((e) => e.ministry === r.id)
              .map((e) => e.date + " " + e.title)
              .join(" · ") || "Sin actividades programadas",
          )}</p>`
        : "");
  if (k === "donations")
    f =
      field("date", "Fecha", "date", r.date || today()) +
      field("amount", "Monto (MXN)", "number", r.amount) +
      field("concept", "Concepto", "text", r.concept) +
      field(
        "method",
        "Método de recepción",
        "select",
        r.method || "Efectivo",
        true,
        ["Efectivo", "Transferencia", "Tarjeta", "Otro"].map((x) => [x, x]),
      ) +
      field("member", "Donante (opcional)", "select", r.member, false, [
        ["", "Anónimo"],
        ...people.slice(1),
      ]);
  if (k === "announcements")
    f =
      field("title", "Título", "text", r.title) +
      field("body", "Mensaje", "textarea", r.body) +
      field("date", "Fecha de publicación", "date", r.date || today()) +
      `<label class="checkbox-field"><input type="checkbox" name="important" ${r.important ? "checked" : ""}>Aviso importante</label>`;
  if (k === "users")
    f =
      field("name", "Nombre", "text") +
      field("email", "Correo", "email") +
      field("password", "Contraseña inicial", "password") +
      field(
        "role",
        "Rol",
        "select",
        "secretario",
        true,
        [
          "administrador",
          "pastor",
          "secretario",
          "tesorero",
          "coordinador",
        ].map((x) => [x, x]),
      );
  if (k === "attendance")
    f =
      field(
        "event",
        "Evento",
        "select",
        r.event,
        true,
        data.events.map((e) => [
          e.id,
          e.title + (e.cancelled ? " (cancelado)" : ""),
        ]),
      ) +
      field("date", "Fecha", "date", r.date || today()) +
      '<p class="muted">Marca a los presentes. Los demás integrantes del listado quedarán ausentes.</p><div class="checks">' +
      data.members
        .filter((m) => m.active !== false || (r.roster || []).includes(m.id))
        .map(
          (m) =>
            `<label><input type="checkbox" name="present" value="${m.id}" ${(r.present || []).includes(m.id) ? "checked" : ""}>${esc(m.name)}</label>`,
        )
        .join("") +
      "</div>";
  showModal(r.id ? "Editar registro" : "Nuevo registro", f, async (form) => {
    const b = { ...r, ...Object.fromEntries(form) };
    if (k === "members") b.active = b.active === "true";
    if (k === "events") b.cancelled = b.cancelled === "true";
    if (k === "announcements") b.important = form.get("important") === "on";
    if (k === "ministries") b.members = form.getAll("members");
    if (k === "attendance") b.present = form.getAll("present");
    await api(k, b);
  });
}
function settings() {
  const r = data.settings[0] || {};
  $("#content").innerHTML =
    `<div class="panel" style="max-width:750px"><form id="settingsform">${field("name", "Nombre de la iglesia", "text", r.name)}${field("address", "Dirección", "textarea", r.address, false)}${field("phone", "Teléfono", "tel", r.phone, false)}${field("email", "Correo de contacto", "email", r.email, false)}${field("schedule", "Horarios habituales de reuniones", "textarea", r.schedule, false)}<label>Logotipo (PNG, JPEG o WebP; máximo 500 KB)<input id="logo" type="file" accept="image/png,image/jpeg,image/webp"></label>${r.logo ? `<img src="${esc(r.logo)}" class="logo" alt="Logo actual">` : ""}${can("settings") ? '<button class="primary">Guardar información</button>' : '<p class="muted">Solo el administrador puede actualizar esta información.</p>'}</form></div>`;
  $("#settingsform").onsubmit = (e) => {
    e.preventDefault();
    if (!can("settings")) return;
    run(async () => {
      const b = { ...r, ...Object.fromEntries(new FormData(e.target)) };
      const file = $("#logo").files[0];
      if (file) {
        if (
          file.size > 500000 ||
          !["image/png", "image/jpeg", "image/webp"].includes(file.type)
        )
          throw Error("Selecciona una imagen válida de hasta 500 KB");
        b.logo = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }
      await api("settings", b);
      await load();
      render();
      notice("Información actualizada");
    });
  };
}
function isWithinRange(date, from, to) {
  if (!from && !to) return true;
  if (!date) return false;
  return (!from || date >= from) && (!to || date <= to);
}
function reportPeriod(date, period) {
  if (period === "month") return date.slice(0, 7);
  const monday = new Date(date + "T12:00:00");
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return monday.toISOString().slice(0, 10);
}
function ministryReport(from, to, period) {
  const detail = period === "detail";
  const result = [];
  for (const ministry of data.ministries) {
    const members = new Set(ministry.members || []);
    const activities = data.events.filter(
      (event) =>
        event.ministry === ministry.id &&
        !event.cancelled &&
        isWithinRange(event.date, from, to),
    );
    const attendanceByEvent = data.attendance.filter(
      (attendance) =>
        activities.some((event) => event.id === attendance.event) &&
        isWithinRange(attendance.date, from, to),
    );
    const coordinator = memberName(ministry.coordinator);
    if (detail) {
      result.push([
        ministry.name,
        coordinator,
        members.size,
        activities.length,
        attendanceByEvent.reduce(
          (sum, attendance) =>
            sum + attendance.present.filter((id) => members.has(id)).length,
          0,
        ),
      ]);
      continue;
    }

    const groups = new Map();
    const getGroup = (date) => {
      const key = reportPeriod(date, period);
      if (!groups.has(key))
        groups.set(key, { activities: 0, participations: 0 });
      return groups.get(key);
    };
    activities.forEach((event) => getGroup(event.date).activities++);
    attendanceByEvent.forEach((attendance) => {
      getGroup(attendance.date).participations += attendance.present.filter(
        (id) => members.has(id),
      ).length;
    });
    [...groups.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([date, group]) => {
        result.push([
          date,
          ministry.name,
          coordinator,
          members.size,
          group.activities,
          group.participations,
        ]);
      });
  }
  return result;
}
function reports() {
  const types = [
    ["members", "General de miembros"],
    ["attendance", "Asistencia por evento"],
    ["ministries", "Participación por ministerio"],
    ...(financial() ? [["donations", "Ingresos por periodo"]] : []),
  ];
  $("#content").innerHTML =
    `<div class="toolbar"><select id="reporttype" aria-label="Reporte">${types.map(([k, n]) => `<option value="${k}">${n}</option>`).join("")}</select><label>Desde<input id="from" type="date"></label><label>Hasta<input id="to" type="date"></label><select id="period" aria-label="Agrupación"><option value="detail">Detalle</option><option value="week">Semanal</option><option value="month">Mensual</option></select><button id="excel">Exportar Excel (.xls)</button><button id="pdf">Imprimir / PDF</button></div><h2 class="report-title">${esc(data.settings[0]?.name)} · Reporte</h2><div id="report"></div>`;
  const update = () => {
    const kind = $("#reporttype").value;
    const from = $("#from").value;
    const to = $("#to").value;
    const period = $("#period").value;
    if (from && to && from > to) {
      reportCols = [];
      reportRows = [];
      $("#report").innerHTML =
        '<p class="empty">La fecha inicial debe ser anterior a la fecha final.</p>';
      return;
    }

    if (kind === "ministries") {
      reportCols =
        period === "detail"
          ? [
              ["ministry", "Ministerio"],
              ["coordinator", "Coordinador"],
              ["members", "Integrantes"],
              ["activities", "Actividades"],
              ["participations", "Participaciones"],
            ]
          : [
              ["period", "Periodo"],
              ["ministry", "Ministerio"],
              ["coordinator", "Coordinador"],
              ["members", "Integrantes"],
              ["activities", "Actividades"],
              ["participations", "Participaciones"],
            ];
      reportRows = ministryReport(from, to, period);
    } else {
      const dateField = kind === "members" ? "joined" : "date";
      const rows = data[kind].filter((row) =>
        isWithinRange(row[dateField], from, to),
      );
      reportCols = cols[kind];
      reportRows = rows.map((row) =>
        reportCols.map((column) => val(row, column[0])),
      );
      if (["attendance", "donations"].includes(kind) && period !== "detail") {
        const groups = new Map();
        rows.forEach((row) => {
          const key = reportPeriod(row.date, period);
          groups.set(
            key,
            (groups.get(key) || 0) +
              (kind === "donations" ? Number(row.amount) : row.present.length),
          );
        });
        reportCols = [
          ["period", "Periodo"],
          ["total", kind === "donations" ? "Ingresos MXN" : "Presencias"],
        ];
        reportRows = [...groups.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, total]) => [
            date,
            kind === "donations" ? money(total) : total,
          ]);
      }
    }

    $("#report").innerHTML =
      `<div class="panel"><h2>${types.find((type) => type[0] === kind)[1]}</h2><p class="muted">${reportRows.length} registros · ${esc(from || "Inicio")} a ${esc(to || "la fecha")}</p><div class="tablewrap"><table><thead><tr>${reportCols.map((column) => `<th>${esc(column[1])}</th>`).join("")}</tr></thead><tbody>${reportRows.map((row) => `<tr>${row.map((value) => `<td>${esc(value)}</td>`).join("")}</tr>`).join("")}</tbody></table>${reportRows.length ? "" : '<div class="empty">No hay datos para el periodo seleccionado.</div>'}</div></div>`;
  };
  ["reporttype", "from", "to", "period"].forEach(
    (id) => ($("#" + id).onchange = update),
  );
  $("#pdf").onclick = () => window.print();
  $("#excel").onclick = () => {
    const cell = (value) =>
      '<Cell><Data ss:Type="String">' +
      esc(String(value ?? "")) +
      "</Data></Cell>";
    const xml =
      '<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Reporte"><Table>' +
      [reportCols.map((column) => column[1]), ...reportRows]
        .map((row) => "<Row>" + row.map(cell).join("") + "</Row>")
        .join("") +
      "</Table></Worksheet></Workbook>";
    const link = document.createElement("a");
    link.href = URL.createObjectURL(
      new Blob([xml], { type: "application/vnd.ms-excel" }),
    );
    link.download = "reporte-" + today() + ".xls";
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  };
  update();
}
run(async () => {
  try {
    await start();
  } catch {
    await auth();
  }
});

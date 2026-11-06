/**
 * Cierre de requisitos: RF-03 (historial por miembro), RF-04 (varios
 * responsables y tipo obligatorio), RF-05 (actividades del ministerio),
 * RF-07 (vigencia de comunicados), RF-08 (indicadores y tendencias) y
 * RF-09 (asistencia agrupada por evento y por miembro).
 */
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
process.env.DB_PATH = ":memory:";
const { server, db } = require("../src/server");
const { createClient, listen, close } = require("./helpers/api-client");

let req;
let ana;
let luis;

before(async () => {
  await listen(server);
  req = createClient(server);
  const admin = { name: "Admin", email: "admin@example.org", password: "una-clave-segura" };
  await req("setup", admin);
  await req("login", admin);
  ana = (await req("members", { name: "Ana", joined: "2026-01-10" })).body;
  luis = (await req("members", { name: "Luis", joined: "2026-02-10" })).body;
});

after(async () => {
  await close(server);
  db.close();
});

const event = (extra) => ({
  title: "Culto", type: "religioso", date: "2026-11-08", time: "10:00", place: "Templo", ...extra,
});

// --- API --------------------------------------------------------------------

test("RF-04: un evento guarda varios responsables y valida cada uno", async () => {
  const saved = await req("events", event({ responsibles: [ana.id, luis.id, ana.id] }));
  assert.equal(saved.status, 200);
  assert.deepEqual(saved.body.responsibles.sort(), [ana.id, luis.id].sort());

  const edited = await req("events", { ...saved.body, responsibles: [luis.id] });
  assert.deepEqual(edited.body.responsibles, [luis.id]);

  assert.equal((await req("events", event({ responsibles: [ana.id, "fantasma"] }))).status, 400);
  assert.equal((await req("events", event({ responsibles: "no-es-lista" }))).status, 400);

  // Clientes anteriores que envían un solo `responsible`.
  const legacy = await req("events", event({ responsible: ana.id }));
  assert.deepEqual(legacy.body.responsibles, [ana.id]);
});

test("RF-04: un evento nuevo debe ser religioso o administrativo", async () => {
  const { type, ...withoutType } = event();
  assert.equal((await req("events", withoutType)).status, 400);
  assert.equal((await req("events", event({ type: "sin_clasificar" }))).status, 400);

  // Un evento antiguo sin clasificar sí puede conservarse al editarlo.
  db.prepare(
    "INSERT INTO events (id,title,type,date,time,place) VALUES ('viejo','Antiguo','sin_clasificar','2026-01-01','09:00','Templo')",
  ).run();
  const old = (await req("events")).body.find((e) => e.id === "viejo");
  assert.equal((await req("events", { ...old, title: "Antiguo editado" })).status, 200);
});

test("RF-07: los comunicados tienen vigencia válida", async () => {
  const saved = await req("announcements", {
    title: "Retiro", body: "Inscripciones", date: "2026-11-10", expires: "2026-11-20",
  });
  assert.equal(saved.status, 200);
  assert.equal(saved.body.expires, "2026-11-20");
  assert.equal(
    (await req("announcements", { title: "X", body: "Y", date: "2026-11-10", expires: "2026-11-01" })).status,
    400,
  );
  const noExpiry = await req("announcements", { title: "X", body: "Y", date: "2026-11-10" });
  assert.equal(noExpiry.body.expires, null);
});

// --- Cálculos del frontend --------------------------------------------------

async function frontend() {
  const { state } = await import("../public/js/core/state.js");
  const stats = await import("../public/js/core/stats.js");
  const { buildReport } = await import("../public/js/views/reports.view.js");
  state.me = { role: "administrador" };
  state.data = {
    members: [
      { id: "a", name: "Ana", active: true },
      { id: "l", name: "Luis", active: true },
      { id: "m", name: "Marta", active: false },
    ],
    events: [
      { id: "c", title: "Culto", type: "religioso", date: "2026-11-01", time: "10:00", ministry: "j", cancelled: false },
      { id: "e", title: "Ensayo", type: "religioso", date: "2026-11-20", time: "18:00", ministry: "j", cancelled: false },
      { id: "x", title: "Cancelado", type: "administrativo", date: "2026-11-25", time: "18:00", ministry: "j", cancelled: true },
    ],
    attendance: [
      { id: "1", event: "c", date: "2026-11-01", roster: ["a", "l"], present: ["a", "l"] },
      { id: "2", event: "c", date: "2026-11-08", roster: ["a", "l"], present: ["a"] },
      { id: "3", event: "e", date: "2026-11-12", roster: ["a", "l"], present: [] },
    ],
    ministries: [{ id: "j", name: "Jóvenes", coordinator: "a", members: ["a", "l"] }],
    announcements: [],
    donations: [
      { date: "2026-10-05", amount: 0.1 },
      { date: "2026-11-02", amount: 0.2 },
      { date: "2026-11-03", amount: 100 },
    ],
    settings: [{ name: "Iglesia" }],
  };
  return { state, stats, buildReport };
}

test("RF-08: cuenta personas presentes, no listas", async () => {
  const { stats } = await frontend();
  assert.equal(stats.totalPresences(), 3);
});

test("RF-03: historial de asistencia por miembro", async () => {
  const { stats } = await frontend();
  const luis = stats.memberAttendanceHistory("l");
  assert.equal(luis.summoned, 3);
  assert.equal(luis.attended, 1);
  assert.equal(luis.absent, 2);
  assert.equal(luis.rate, 33.3);
  assert.equal(luis.lastAttended, "2026-11-01");
  assert.deepEqual(luis.entries.map((e) => e.date), ["2026-11-12", "2026-11-08", "2026-11-01"]);
  assert.equal(stats.memberAttendanceHistory("m").summoned, 0);
});

test("RF-05: actividades del ministerio separadas en próximas y pasadas", async () => {
  const { stats } = await frontend();
  const activities = stats.ministryActivities("j", "2026-11-10");
  assert.deepEqual(activities.upcoming.map((e) => e.id), ["e"]);
  assert.deepEqual(activities.past.map((e) => e.id), ["c"]);
  assert.deepEqual(activities.cancelled.map((e) => e.id), ["x"]);
});

test("RF-07: estado del comunicado según publicación y vencimiento", async () => {
  const { stats } = await frontend();
  const a = { date: "2026-11-10", expires: "2026-11-20" };
  assert.equal(stats.announcementStatus(a, "2026-11-09"), "programado");
  assert.equal(stats.announcementStatus(a, "2026-11-10"), "vigente");
  assert.equal(stats.announcementStatus(a, "2026-11-20"), "vigente");
  assert.equal(stats.announcementStatus(a, "2026-11-21"), "vencido");
  assert.equal(stats.announcementStatus({ date: "2026-01-01" }, "2030-01-01"), "vigente");
});

test("RF-09: la asistencia se agrupa por evento", async () => {
  const { buildReport } = await frontend();
  const detail = buildReport("attendance", "", "", "detail");
  assert.deepEqual(detail.columns.map((c) => c[0]), ["event", "type", "sessions", "presences", "absences", "rate"]);
  assert.deepEqual(detail.rows, [
    ["Culto", "Religioso", 2, 3, 1, 75],
    ["Ensayo", "Religioso", 1, 0, 2, 0],
  ]);
  const monthly = buildReport("attendance", "", "", "month");
  assert.equal(monthly.columns[0][0], "period");
  assert.deepEqual(monthly.rows[0], ["2026-11", "Culto", "Religioso", 2, 3, 1, 75]);
});

test("RF-09: reporte de asistencia por miembro", async () => {
  const { buildReport } = await frontend();
  const report = buildReport("memberAttendance", "2026-11-05", "", "detail");
  assert.deepEqual(report.rows, [
    ["Ana", "Activo", 2, 1, 1, 50, "2026-11-08"],
    ["Luis", "Activo", 2, 0, 2, 0, "—"],
  ]);
});

test("RF-08: tendencias semanal y mensual sin errores de redondeo", async () => {
  const { stats } = await frontend();
  const weekly = stats.weeklyPresences(3, "2026-11-12");
  // Semanas que empiezan en lunes: 1-nov (domingo) cae en la semana del 26-oct.
  assert.deepEqual(weekly, [
    { label: "2026-10-26", value: 2 },
    { label: "2026-11-02", value: 1 },
    { label: "2026-11-09", value: 0 },
  ]);
  const monthly = stats.monthlyIncome(2, "2026-11-30");
  assert.deepEqual(monthly, [
    { label: "2026-10", value: 0.1 },
    { label: "2026-11", value: 100.2 },
  ]);
});

test("RF-08: las gráficas generan un SVG con una marca por punto", async () => {
  const { lineChart, barChart } = await import("../public/js/ui/charts.js");
  const points = [{ label: "2026-11-02", value: 3 }, { label: "2026-11-09", value: 7 }];
  const fmt = { value: String, axis: String, x: String };
  const line = lineChart(points, fmt, "Asistencia");
  assert.match(line, /^<div class="chart"><svg/);
  assert.equal((line.match(/class="chart-dot"/g) || []).length, 2);
  assert.equal((line.match(/data-tip=/g) || []).length, 2);
  const bars = barChart(points, fmt, "Ingresos");
  assert.equal((bars.match(/class="chart-bar"/g) || []).length, 2);
  assert.match(bars, /aria-label="Ingresos"/);
});

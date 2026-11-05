/** Estructura principal: menú lateral, encabezado y área de contenido. */
import { api } from "../core/api.js";
import { $, esc } from "../core/utils.js";
import { state } from "../core/state.js";
import { can } from "../core/permissions.js";
import { PAGE_TITLES } from "../core/labels.js";
import { run } from "../ui/notice.js";
import { renderAuth } from "./auth.view.js";
import { renderDashboard } from "./dashboard.view.js";
import { renderListing } from "./listing.view.js";
import { renderReports } from "./reports.view.js";
import { renderSettings } from "./settings.view.js";
import { openRecordForm } from "./record-form.view.js";

/** Páginas visibles solo para quien puede modificarlas. */
const RESTRICTED_PAGES = ["donations", "users"];

const PAGE_VIEWS = {
  dashboard: renderDashboard,
  reports: renderReports,
  settings: renderSettings,
};

function navigation() {
  return Object.entries(PAGE_TITLES)
    .filter(([k]) => !RESTRICTED_PAGES.includes(k) || can(k))
    .map(
      ([k, title], i) =>
        `<button data-page="${k}" class="${state.page === k ? "active" : ""}"><span style="opacity:.5;margin-right:12px">${String(i + 1).padStart(2, "0")}</span>${title}</button>`,
    )
    .join("");
}

export function renderLayout() {
  const { me, page } = state;
  const church = state.data.settings?.[0] || { name: "Mi iglesia" };
  const logo = church.logo
    ? `<img class="logo" src="${esc(church.logo)}" alt="Logotipo">`
    : '<span class="mark">✦</span>';
  const addButton =
    can(page) && page !== "settings"
      ? '<button class="primary" id="add">+ ' +
        (page === "attendance" ? "Registrar asistencia" : "Nuevo registro") +
        "</button>"
      : "";
  const subtitle =
    page === "dashboard"
      ? "Lo que sucede en la vida de nuestra iglesia."
      : "Organiza, consulta y acompaña a tu comunidad.";
  const date = new Date().toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  $("#app").innerHTML =
    `<div class="layout"><aside class="sidebar"><div class="brand">${logo}<span>Comunidad<br><small style="font:11px Segoe UI;letter-spacing:2px">VIDA EN COMUNIDAD</small></span></div><nav class="nav">${navigation()}</nav><div class="profile"><div>${esc(me.name)}<br><small>${esc(me.role)}</small></div><button id="logout">Cerrar sesión ↗</button></div></aside><main class="main"><header class="topbar"><span>${esc(church.name)}</span><small>${date}</small></header><div class="heading"><div><p class="eyebrow">Tu comunidad, más cerca</p><h1>${PAGE_TITLES[page]}</h1><span class="muted">${subtitle}</span></div>${addButton}</div><section id="content"></section><footer class="muted" style="margin-top:30px;font-size:12px">COMUNIDAD &nbsp; / &nbsp; Unidos para servir.</footer></main></div>`;

  document.querySelectorAll("[data-page]").forEach(
    (button) =>
      (button.onclick = () => {
        state.page = button.dataset.page;
        renderLayout();
      }),
  );
  $("#logout").onclick = () =>
    run(async () => {
      await api("logout", {});
      state.me = null;
      await renderAuth();
    });
  if ($("#add")) $("#add").onclick = () => openRecordForm(page);

  (PAGE_VIEWS[page] || renderListing)();
}

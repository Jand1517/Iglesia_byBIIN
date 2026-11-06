/**
 * RF-10: datos institucionales, horarios y logotipo.
 * Solo el administrador ve el formulario; los demás roles ven una ficha de
 * solo lectura (el servidor también rechaza cualquier cambio con 403).
 */
import { api } from "../core/api.js";
import { $, esc } from "../core/utils.js";
import { state, refresh } from "../core/state.js";
import { can } from "../core/permissions.js";
import { field } from "../ui/form.js";
import { notice, run } from "../ui/notice.js";

const MAX_LOGO_BYTES = 500000;
const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"];

const readAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const logoImage = (r) =>
  r.logo ? `<img src="${esc(r.logo)}" class="logo" alt="Logotipo de la iglesia">` : "";

/** Ficha de solo lectura para roles sin permiso de edición. */
function readOnlyView(r) {
  const row = (label, value) =>
    `<div class="info-row"><dt>${esc(label)}</dt><dd>${esc(value || "—")}</dd></div>`;
  return (
    `<div class="panel" style="max-width:750px">` +
    `<p class="muted">Consulta de solo lectura. Solo el administrador puede actualizar esta información.</p>` +
    `<dl class="info-list">` +
    row("Nombre de la iglesia", r.name) +
    row("Dirección", r.address) +
    row("Teléfono", r.phone) +
    row("Correo de contacto", r.email) +
    row("Horarios habituales de reuniones", r.schedule) +
    `</dl>${logoImage(r)}</div>`
  );
}

function editForm(r) {
  return (
    `<div class="panel" style="max-width:750px"><form id="settingsform">` +
    field("name", "Nombre de la iglesia", "text", r.name) +
    field("address", "Dirección", "textarea", r.address, false) +
    field("phone", "Teléfono", "tel", r.phone, false) +
    field("email", "Correo de contacto", "email", r.email, false) +
    field("schedule", "Horarios habituales de reuniones", "textarea", r.schedule, false) +
    `<label>Logotipo (PNG, JPEG o WebP; máximo 500 KB)<input id="logo" type="file" accept="${LOGO_TYPES.join(",")}"></label>` +
    logoImage(r) +
    '<button class="primary">Guardar información</button>' +
    `</form></div>`
  );
}

export function renderSettings() {
  const r = state.data.settings[0] || {};
  if (!can("settings")) {
    $("#content").innerHTML = readOnlyView(r);
    return;
  }

  $("#content").innerHTML = editForm(r);
  $("#settingsform").onsubmit = (e) => {
    e.preventDefault();
    run(async () => {
      const body = { ...r, ...Object.fromEntries(new FormData(e.target)) };
      const file = $("#logo").files[0];
      if (file) {
        if (file.size > MAX_LOGO_BYTES || !LOGO_TYPES.includes(file.type))
          throw Error("Selecciona una imagen válida de hasta 500 KB");
        body.logo = await readAsDataUrl(file);
      }
      await api("settings", body);
      await refresh();
      notice("Información actualizada");
    });
  };
}

/** RF-10: datos institucionales, horarios y logotipo. */
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

export function renderSettings() {
  const r = state.data.settings[0] || {};
  const submit = can("settings")
    ? '<button class="primary">Guardar información</button>'
    : '<p class="muted">Solo el administrador puede actualizar esta información.</p>';

  $("#content").innerHTML =
    `<div class="panel" style="max-width:750px"><form id="settingsform">` +
    field("name", "Nombre de la iglesia", "text", r.name) +
    field("address", "Dirección", "textarea", r.address, false) +
    field("phone", "Teléfono", "tel", r.phone, false) +
    field("email", "Correo de contacto", "email", r.email, false) +
    field("schedule", "Horarios habituales de reuniones", "textarea", r.schedule, false) +
    `<label>Logotipo (PNG, JPEG o WebP; máximo 500 KB)<input id="logo" type="file" accept="${LOGO_TYPES.join(",")}"></label>` +
    (r.logo ? `<img src="${esc(r.logo)}" class="logo" alt="Logo actual">` : "") +
    submit +
    `</form></div>`;

  $("#settingsform").onsubmit = (e) => {
    e.preventDefault();
    if (!can("settings")) return;
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

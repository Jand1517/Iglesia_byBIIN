/** RF-01: pantalla de acceso, primer administrador y recuperación. */
import { api } from "../core/api.js";
import { $, esc } from "../core/utils.js";
import { startSession } from "../core/state.js";
import { field } from "../ui/form.js";
import { showModal } from "../ui/modal.js";
import { notice, run } from "../ui/notice.js";

export async function renderAuth() {
  const status = await api("status");
  const isSetup = status.setup;
  $("#app").innerHTML =
    `<main class="auth"><div class="brand"><span class="mark">✦</span> Comunidad</div><p class="eyebrow">Administración de iglesia</p><h1>${isSetup ? "Comencemos juntos" : "Bienvenido de nuevo"}</h1><p class="muted">${isSetup ? "Crea la cuenta del primer administrador." : "Un espacio para cuidar de tu comunidad."}</p><form id="login">${isSetup ? field("name", "Nombre completo") : ""}${field("email", "Correo electrónico", "email")}${field("password", "Contraseña", "password")}<button class="primary">${isSetup ? "Crear administrador" : "Iniciar sesión"}</button></form>${!isSetup ? '<p><button id="recover">Restablecer contraseña</button></p>' : ""}</main>`;

  $("#login").onsubmit = (e) => {
    e.preventDefault();
    run(async () => {
      const body = Object.fromEntries(new FormData(e.target));
      if (isSetup) await api("setup", body);
      await api("login", body);
      await startSession();
    });
  };

  if ($("#recover")) $("#recover").onclick = openRecoveryDialog;
}

/** Paso 1: pedir el correo. Paso 2: capturar código y nueva contraseña. */
function openRecoveryDialog() {
  showModal(
    "Recuperar acceso",
    field("email", "Correo electrónico", "email"),
    async (form) => {
      const result = await api("recover", { email: form.get("email") });
      // Se difiere para abrir el segundo modal después de cerrar el primero.
      setTimeout(() => openResetDialog(result), 0);
    },
  );
}

function openResetDialog(result) {
  const hint = result.token
    ? `Modo desarrollo: código ${esc(result.token)}.`
    : "Revisa tu correo y la carpeta de correo no deseado.";
  showModal(
    "Restablecer contraseña",
    `<p>${esc(result.message)} ${hint}</p>` +
      field("token", "Código de recuperación", "text", result.token || "") +
      field("password", "Nueva contraseña", "password"),
    async (form) => {
      await api("reset", Object.fromEntries(form));
      notice("Contraseña restablecida");
    },
  );
}

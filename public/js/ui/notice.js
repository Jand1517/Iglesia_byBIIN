/** Mensaje flotante temporal y ejecución segura de acciones asíncronas. */
import { $ } from "../core/utils.js";

const NOTICE_DURATION_MS = 4500;

export function notice(text) {
  $("#notice").textContent = text;
  $("#notice").style.display = "block";
  setTimeout(() => ($("#notice").style.display = "none"), NOTICE_DURATION_MS);
}

/** Ejecuta `fn` y muestra cualquier error como aviso. */
export async function run(fn) {
  try {
    await fn();
  } catch (error) {
    notice(error.message);
  }
}

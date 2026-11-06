/** Ventana modal con formulario. */
import { $, esc } from "../core/utils.js";
import { state, refresh } from "../core/state.js";
import { notice, run } from "./notice.js";

/**
 * Muestra un formulario modal. Al guardar ejecuta `submit(formData)`, cierra
 * el modal y, si hay sesión, recarga los datos.
 */
export function showModal(title, body, submit) {
  $("#modal-content").innerHTML =
    `<h2>${esc(title)}</h2><form id="editform">${body}<div class="actions"><button type="button" id="close">Cancelar</button><button class="primary">Guardar</button></div></form>`;
  $("#close").onclick = () => $("#modal").close();
  $("#editform").onsubmit = (e) => {
    e.preventDefault();
    run(async () => {
      await submit(new FormData(e.target));
      $("#modal").close();
      if (state.me) await refresh();
      notice("Cambios guardados");
    });
  };
  $("#modal").showModal();
}

/** Muestra información de solo lectura (historiales, detalles). */
export function showDetails(title, body) {
  $("#modal-content").innerHTML =
    `<h2>${esc(title)}</h2><div class="details">${body}</div><div class="actions"><button type="button" class="primary" id="close">Cerrar</button></div>`;
  $("#close").onclick = () => $("#modal").close();
  $("#modal").showModal();
}

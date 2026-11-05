/** Punto de entrada del frontend. */
import { setRenderer, startSession } from "./core/state.js";
import { run } from "./ui/notice.js";
import { renderLayout } from "./views/layout.view.js";
import { renderAuth } from "./views/auth.view.js";

setRenderer(renderLayout);

// Si ya hay sesión se abre la app; si no, la pantalla de acceso.
run(async () => {
  try {
    await startSession();
  } catch {
    await renderAuth();
  }
});

/**
 * Estado global de la aplicación y ciclo de carga/redibujado.
 *
 * Las vistas no importan el layout directamente (evita dependencias
 * circulares): llaman a `rerender()` o `refresh()`, y main.js registra la
 * función de dibujo con `setRenderer()`.
 */
import { api } from "./api.js";
// permissions.js también importa este archivo; es seguro porque ambos solo
// usan lo importado dentro de funciones, nunca al cargar el módulo.
import { can, financial } from "./permissions.js";

export const state = {
  /** Usuario con sesión: { id, name, email, role }. */
  me: null,
  /** Registros por módulo: { members: [], events: [], ... }. */
  data: {},
  /** Página activa del menú. */
  page: "dashboard",
  /** Mes mostrado en el calendario y en el resumen de ingresos (AAAA-MM). */
  month: new Date().toISOString().slice(0, 7),
};

let renderer = () => {};

export const setRenderer = (fn) => {
  renderer = fn;
};

export const rerender = () => renderer();

const BASE_MODULES = [
  "members",
  "events",
  "attendance",
  "ministries",
  "announcements",
  "settings",
];

/** Descarga todos los módulos a los que el usuario tiene acceso. */
export async function loadData() {
  const keys = [
    ...BASE_MODULES,
    ...(financial() ? ["donations"] : []),
    ...(can("users") ? ["users"] : []),
  ];
  await Promise.all(keys.map(async (k) => (state.data[k] = await api(k))));
}

/** Recarga los datos y redibuja la pantalla actual. */
export async function refresh() {
  state.me = await api("me");
  await loadData();
  rerender();
}

/** Obtiene el usuario de la sesión, carga datos y dibuja la app. */
export async function startSession() {
  state.me = await api("me");
  await refresh();
}

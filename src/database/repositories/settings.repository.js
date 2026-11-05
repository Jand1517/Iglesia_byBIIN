/**
 * RF-10 · Datos de la iglesia. Siempre existe una sola fila (id = 1).
 * La API la expone con id "church" para mantener compatibilidad.
 */
const { db } = require("../connection");
const { requiredText, optionalText, NOW_SQL } = require("./helpers");

const API_ID = "church";

const statements = {
  get: db.prepare(
    "SELECT name, address, phone, email, schedule, logo FROM church_settings WHERE id = 1",
  ),
  update: db.prepare(`
    UPDATE church_settings SET
      name = @name, address = @address, phone = @phone, email = @email,
      schedule = @schedule, logo = @logo, updated_at = ${NOW_SQL}
    WHERE id = 1`),
};

const settingsRepository = {
  get: () => ({ id: API_ID, ...statements.get.get() }),

  /** Para el CRUD genérico: la lista siempre tiene un solo elemento. */
  list: () => [settingsRepository.get()],

  save(body) {
    statements.update.run({
      name: requiredText(body.name),
      address: optionalText(body.address),
      phone: optionalText(body.phone),
      email: optionalText(body.email),
      schedule: optionalText(body.schedule),
      logo: optionalText(body.logo),
    });
    return settingsRepository.get();
  },
};

module.exports = { settingsRepository };

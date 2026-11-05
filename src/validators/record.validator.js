/**
 * Validación de los registros de cada módulo antes de guardarlos.
 * Algunas reglas también normalizan el cuerpo (p. ej. `important`, `roster`).
 */
const { recordsRepository } = require("../database/repositories/records.repository");
const { fail } = require("../http/errors");
const { EMAIL_PATTERN } = require("./user.validator");

const REQUIRED_FIELDS = {
  members: ["name", "joined"],
  events: ["title", "date", "time", "place"],
  ministries: ["name", "coordinator"],
  donations: ["date", "amount", "concept", "method"],
  announcements: ["title", "body", "date"],
  attendance: ["event", "date"],
  settings: ["name"],
};

function requireFields(kind, body) {
  for (const field of REQUIRED_FIELDS[kind])
    if (body[field] === undefined || String(body[field]).trim() === "")
      fail(400, "Completa el campo " + field);
}

/** Reglas específicas por módulo. */
const moduleRules = {
  members(body) {
    if (body.email && !EMAIL_PATTERN.test(body.email))
      fail(400, "Correo inválido");
  },

  donations(body) {
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0)
      fail(400, "El monto debe ser mayor que cero");
  },

  announcements(body) {
    body.important = body.important === true;
  },

  attendance(body) {
    if (!recordsRepository.list("events").some((e) => e.id === body.event))
      fail(400, "Evento inválido");

    const existing = recordsRepository.list("attendance");
    if (
      existing.some(
        (x) => x.event === body.event && x.date === body.date && x.id !== body.id,
      )
    )
      fail(409, "Ya existe asistencia para ese evento y fecha");

    const members = recordsRepository.list("members");
    const memberIds = new Set(members.map((m) => m.id));
    if (!Array.isArray(body.present) || body.present.some((x) => !memberIds.has(x)))
      fail(400, "Miembros inválidos");

    // El padrón (roster) se fija al crear la asistencia: los miembros activos
    // en ese momento. Al editar se conserva el padrón original.
    body.roster =
      existing.find((x) => x.id === body.id)?.roster ||
      members.filter((m) => m.active !== false).map((m) => m.id);
  },
};

function validateRecord(kind, body) {
  requireFields(kind, body);
  moduleRules[kind]?.(body);
}

module.exports = { validateRecord };

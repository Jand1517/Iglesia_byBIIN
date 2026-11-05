/**
 * Validación de los registros de cada módulo antes de guardarlos.
 *
 * La base de datos tiene las mismas reglas (CHECK, FOREIGN KEY, UNIQUE) como
 * última línea de defensa; validar aquí primero permite responder mensajes
 * claros en español en lugar de un error genérico.
 */
const { membersRepository } = require("../database/repositories/members.repository");
const { eventsRepository } = require("../database/repositories/events.repository");
const { ministriesRepository } = require("../database/repositories/ministries.repository");
const { attendanceRepository } = require("../database/repositories/attendance.repository");
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

const DONATION_METHODS = ["Efectivo", "Transferencia", "Tarjeta", "Otro"];
const AMOUNT_PATTERN = /^\d{1,9}(\.\d{1,2})?$/;
const LOGO_PATTERN = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;
const MAX_LOGO_LENGTH = 700000; // ≈ 500 KB en base64

// --- Reglas reutilizables ---------------------------------------------------

/** Fecha real en formato AAAA-MM-DD (rechaza 2026-02-30). */
function isDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T00:00:00Z");
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

const isTime = (value) =>
  typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

function requireFields(kind, body) {
  for (const field of REQUIRED_FIELDS[kind])
    if (body[field] === undefined || body[field] === null || String(body[field]).trim() === "")
      fail(400, "Completa el campo " + field);
}

function requireDate(value, label) {
  if (!isDate(value)) fail(400, `La ${label} no es válida (usa AAAA-MM-DD)`);
}

function optionalEmail(value) {
  if (value && !EMAIL_PATTERN.test(value)) fail(400, "Correo inválido");
}

/** Si viene una referencia, debe existir. */
function optionalReference(id, exists, message) {
  if (id && !exists(id)) fail(400, message);
}

function memberList(ids, message) {
  if (!Array.isArray(ids) || ids.some((id) => !membersRepository.exists(id)))
    fail(400, message);
}

// --- Reglas por módulo ------------------------------------------------------

const moduleRules = {
  members(body) {
    requireDate(body.joined, "fecha de ingreso");
    optionalEmail(body.email);
  },

  events(body) {
    if (body.type === undefined) {
      // Compatibilidad con clientes anteriores. Los eventos antiguos requieren clasificación.
      body.type = (body.id && eventsRepository.findById(body.id)?.type) || 'sin_clasificar';
    }
    if (!["religioso", "administrativo", "sin_clasificar"].includes(body.type))
      fail(400, "Tipo de evento inválido");
    requireDate(body.date, "fecha");
    if (!isTime(body.time)) fail(400, "La hora no es válida (usa HH:MM)");
    optionalReference(body.responsible, membersRepository.exists, "Responsable inválido");
    optionalReference(body.ministry, ministriesRepository.exists, "Ministerio inválido");
  },

  ministries(body) {
    if (!membersRepository.exists(body.coordinator)) fail(400, "Coordinador inválido");
    memberList(body.members ?? [], "Integrantes inválidos");
  },

  donations(body) {
    requireDate(body.date, "fecha");
    if (!AMOUNT_PATTERN.test(String(body.amount).trim()) || Number(body.amount) <= 0)
      fail(400, "El monto debe ser mayor que cero y tener máximo 2 decimales");
    if (!DONATION_METHODS.includes(body.method)) fail(400, "Método de recepción inválido");
    optionalReference(body.member, membersRepository.exists, "Donante inválido");
  },

  announcements(body) {
    requireDate(body.date, "fecha de publicación");
    body.important = body.important === true;
  },

  attendance(body) {
    if (!eventsRepository.exists(body.event)) fail(400, "Evento inválido");
    requireDate(body.date, "fecha");
    const existingId = attendanceRepository.findIdByEventAndDate(body.event, body.date);
    if (existingId && existingId !== body.id)
      fail(409, "Ya existe asistencia para ese evento y fecha");
    memberList(body.present, "Miembros inválidos");
  },

  settings(body) {
    optionalEmail(body.email);
    if (body.logo && (body.logo.length > MAX_LOGO_LENGTH || !LOGO_PATTERN.test(body.logo)))
      fail(400, "El logotipo debe ser PNG, JPEG o WebP de hasta 500 KB");
  },
};

function validateRecord(kind, body) {
  requireFields(kind, body);
  moduleRules[kind]?.(body);
}

module.exports = { validateRecord, isDate, isTime };

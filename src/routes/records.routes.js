/**
 * CRUD genérico de los módulos RF-02 a RF-07 y RF-10:
 * members, events, attendance, ministries, donations, announcements, settings.
 *
 *   GET    /api/:module  → lista
 *   POST   /api/:module  → crea o actualiza (según `id`)
 *   PUT    /api/:module  → igual que POST
 *   DELETE /api/:module  → solo módulos en DELETABLE_MODULES
 */
const {
  DELETABLE_MODULES,
  isModule,
  canRead,
  canWrite,
} = require("../config/permissions");
const { recordsRepository } = require("../database/repositories/records.repository");
const { fail } = require("../http/errors");
const { sendJson } = require("../http/response");
const { newId } = require("../services/password.service");
const { validateRecord } = require("../validators/record.validator");

/** Extrae el módulo de `/api/:module`. */
const moduleFromPath = (pathname) => pathname.split("/")[2];

function handleRecords(ctx) {
  const { req, res, body, user } = ctx;
  const kind = moduleFromPath(ctx.path);

  if (!isModule(kind)) fail(404, "Recurso desconocido");
  if (!canRead(user.role, kind)) fail(403, "Información financiera restringida");

  if (req.method === "GET") return sendJson(res, 200, recordsRepository.list(kind));

  if (!canWrite(user.role, kind))
    fail(403, "Tu rol no permite modificar este módulo");

  if (req.method === "POST" || req.method === "PUT") {
    body.id = body.id || newId();
    validateRecord(kind, body);
    return sendJson(res, 200, recordsRepository.save(kind, body));
  }

  if (req.method === "DELETE") {
    if (!DELETABLE_MODULES.includes(kind))
      fail(405, "Usa desactivación o cancelación para conservar el historial");
    recordsRepository.remove(kind, body.id);
    return sendJson(res, 200, { ok: true });
  }

  fail(405, "Método no permitido");
}

module.exports = { handleRecords };

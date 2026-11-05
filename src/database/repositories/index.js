/**
 * Repositorio de cada módulo del CRUD genérico (/api/:module).
 * Todos implementan list() y save(body); remove(id) solo los eliminables.
 */
const { membersRepository } = require("./members.repository");
const { eventsRepository } = require("./events.repository");
const { attendanceRepository } = require("./attendance.repository");
const { ministriesRepository } = require("./ministries.repository");
const { donationsRepository } = require("./donations.repository");
const { announcementsRepository } = require("./announcements.repository");
const { settingsRepository } = require("./settings.repository");

const moduleRepositories = {
  members: membersRepository,
  events: eventsRepository,
  attendance: attendanceRepository,
  ministries: ministriesRepository,
  donations: donationsRepository,
  announcements: announcementsRepository,
  settings: settingsRepository,
};

module.exports = { moduleRepositories };

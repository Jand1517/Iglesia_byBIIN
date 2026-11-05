const { env } = require("../config/env");

const SESSION_MAX_AGE_SECONDS = 8 * 3600;

function sendJson(res, status, value) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(value));
}

function setSessionCookie(res, token) {
  res.setHeader(
    "Set-Cookie",
    `session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_MAX_AGE_SECONDS}${env.cookieSecure() ? "; Secure" : ""}`,
  );
}

function clearSessionCookie(res) {
  res.setHeader(
    "Set-Cookie",
    "session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0",
  );
}

module.exports = {
  sendJson,
  setSessionCookie,
  clearSessionCookie,
  SESSION_MAX_AGE_SECONDS,
};

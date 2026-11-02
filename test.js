const { test } = require("node:test");
const assert = require("node:assert/strict");
const net = require("node:net");
process.env.DB_PATH = ":memory:";
process.env.DEV_RECOVERY = "1";
const { server, db } = require("./server");

function createSmtpServer() {
  let deliver;
  const delivered = new Promise((resolve) => {
    deliver = resolve;
  });
  const smtp = net.createServer((socket) => {
    socket.setEncoding("utf8");
    socket.write("220 test.local ESMTP\r\n");
    let input = "";
    let receivingMessage = false;
    socket.on("data", (chunk) => {
      input += chunk;
      while (true) {
        if (receivingMessage) {
          const end = input.indexOf("\r\n.\r\n");
          if (end < 0) return;
          deliver(input.slice(0, end));
          input = input.slice(end + 5);
          receivingMessage = false;
          socket.write("250 Message accepted\r\n");
          continue;
        }
        const end = input.indexOf("\r\n");
        if (end < 0) return;
        const line = input.slice(0, end);
        input = input.slice(end + 2);
        if (/^(EHLO|HELO)/i.test(line))
          socket.write("250-test.local\r\n250 SIZE 52428800\r\n");
        else if (/^DATA/i.test(line)) {
          socket.write("354 Send message\r\n");
          receivingMessage = true;
        } else if (/^QUIT/i.test(line)) {
          socket.end("221 Closing connection\r\n");
        } else socket.write("250 OK\r\n");
      }
    });
  });
  return { smtp, delivered };
}

test("Usuarios, roles, registros, asistencia y recuperación", async () => {
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = "http://127.0.0.1:" + server.address().port + "/api/";
  let cookie = "";
  const mailServer = createSmtpServer();
  await new Promise((resolve) =>
    mailServer.smtp.listen(0, "127.0.0.1", resolve),
  );
  async function req(p, b, method) {
    const r = await fetch(base + p, {
      method: method || (b ? "POST" : "GET"),
      headers: { "Content-Type": "application/json", Cookie: cookie },
      ...(b ? { body: JSON.stringify(b) } : {}),
    });
    if (r.headers.get("set-cookie"))
      cookie = r.headers.get("set-cookie").split(";")[0];
    return { status: r.status, body: await r.json() };
  }
  try {
    assert.equal((await req("members")).status, 401);
    const admin = {
      name: "Administrador",
      email: "admin@example.org",
      password: "una-clave-segura",
    };
    assert.equal((await req("setup", admin)).status, 201);
    assert.equal((await req("setup", admin)).status, 409);
    assert.equal((await req("login", admin)).status, 200);
    const announcement = (
      await req("announcements", {
        title: "Reunión especial",
        body: "Nos vemos el domingo.",
        date: "2026-11-08",
        important: true,
      })
    ).body;
    assert.equal(announcement.important, true);
    const normalAnnouncement = (
      await req("announcements", {
        title: "Aviso regular",
        body: "Información general.",
        date: "2026-11-08",
      })
    ).body;
    assert.equal(normalAnnouncement.important, false);
    const m = (
      await req("members", {
        name: "María López",
        joined: "2026-11-01",
        active: true,
      })
    ).body;
    const event = (
      await req("events", {
        title: "Culto",
        date: "2026-11-08",
        time: "10:00",
        place: "Templo",
      })
    ).body;
    assert.equal(
      (
        await req("attendance", {
          event: event.id,
          date: "2026-11-08",
          present: [m.id],
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await req("attendance", {
          event: event.id,
          date: "2026-11-08",
          present: [],
        })
      ).status,
      409,
    );
    assert.equal(
      (
        await req("donations", {
          date: "2026-11-01",
          amount: -1,
          concept: "Ofrenda",
          method: "Efectivo",
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await req("donations", {
          date: "2026-11-01",
          amount: 150,
          concept: "Ofrenda",
          method: "Efectivo",
        })
      ).status,
      200,
    );
    assert.equal((await req("members", { ...m, active: false })).status, 200);
    assert.equal((await req("members")).body[0].active, false);
    const coordinator = {
      name: "Coordinador",
      email: "coord@example.org",
      password: "clave-coordinador",
      role: "coordinador",
    };
    assert.equal((await req("users", coordinator)).status, 201);
    await req("logout", {});
    await req("login", coordinator);
    assert.equal((await req("donations")).status, 403);
    assert.equal((await req("users")).status, 403);
    assert.equal(
      (await req("members", { name: "X", joined: "2026-11-01" })).status,
      403,
    );
    process.env.DEV_RECOVERY = "0";
    process.env.SMTP_HOST = "127.0.0.1";
    process.env.SMTP_PORT = String(mailServer.smtp.address().port);
    process.env.SMTP_SECURE = "0";
    process.env.SMTP_FROM = "Comunidad <no-reply@example.org>";
    const sentEmail = mailServer.delivered;
    const emailRecovery = await req("recover", { email: coordinator.email });
    assert.equal(emailRecovery.status, 200);
    assert.equal(emailRecovery.body.token, undefined);
    const message = await sentEmail;
    const emailedToken = message.match(/[a-f0-9]{64}/)?.[0];
    assert.ok(emailedToken);
    assert.equal(
      (
        await req("reset", {
          token: emailedToken,
          password: "clave-restablecida-por-correo",
        })
      ).status,
      200,
    );
    assert.equal((await req("me")).status, 401);
    assert.equal(
      (
        await req("login", {
          email: coordinator.email,
          password: "clave-restablecida-por-correo",
        })
      ).status,
      200,
    );
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
    delete process.env.SMTP_SECURE;
    delete process.env.SMTP_FROM;
    assert.equal(
      (await req("recover", { email: coordinator.email })).status,
      503,
    );
    process.env.DEV_RECOVERY = "1";
    const reset = await req("recover", { email: coordinator.email });
    assert.ok(reset.body.token);
    assert.equal(
      (
        await req("reset", {
          token: reset.body.token,
          password: "nueva-clave-segura",
        })
      ).status,
      200,
    );
    assert.equal((await req("me")).status, 401);
    assert.equal(
      (
        await req("reset", {
          token: reset.body.token,
          password: "nueva-clave-segura",
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await req("login", {
          email: coordinator.email,
          password: "nueva-clave-segura",
        })
      ).status,
      200,
    );
  } finally {
    await new Promise((r) => server.close(r));
    await new Promise((r) => mailServer.smtp.close(r));
    db.close();
  }
});

/** Envío de correos por SMTP (código de recuperación de contraseña). */
const nodemailer = require("nodemailer");
const { env } = require("../config/env");
const { fail } = require("../http/errors");

async function sendRecoveryEmail(to, token) {
  const smtp = env.smtp();
  if (!smtp.host || !smtp.from)
    fail(503, "La recuperación por correo no está configurada.");

  const port = Number(smtp.port || 587);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    fail(500, "La configuración del correo no es válida.");

  const transport = nodemailer.createTransport({
    host: smtp.host,
    port,
    secure: smtp.secure,
    ...(smtp.user && smtp.pass
      ? { auth: { user: smtp.user, pass: smtp.pass } }
      : {}),
  });

  try {
    await transport.sendMail({
      from: smtp.from,
      to,
      subject: "Código para restablecer tu contraseña",
      text: `Tu código para restablecer la contraseña es:\n\n${token}\n\nEl código vence en 30 minutos. Si no solicitaste este cambio, ignora este correo.`,
    });
  } catch (error) {
    console.error("No se pudo enviar el correo de recuperación:", error.message);
    fail(502, "No se pudo enviar el correo. Inténtalo más tarde.");
  } finally {
    transport.close();
  }
}

module.exports = { sendRecoveryEmail };

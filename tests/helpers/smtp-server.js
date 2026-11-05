/**
 * Servidor SMTP mínimo para pruebas. `delivered` se resuelve con el contenido
 * del primer mensaje recibido.
 */
const net = require("node:net");

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

module.exports = { createSmtpServer };

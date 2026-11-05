/** Cliente HTTP para pruebas que conserva la cookie de sesión. */
function createClient(server) {
  const base = "http://127.0.0.1:" + server.address().port + "/api/";
  let cookie = "";
  return async function request(path, body, method) {
    const response = await fetch(base + path, {
      method: method || (body ? "POST" : "GET"),
      headers: { "Content-Type": "application/json", Cookie: cookie },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (response.headers.get("set-cookie"))
      cookie = response.headers.get("set-cookie").split(";")[0];
    return { status: response.status, body: await response.json() };
  };
}

const listen = (server) =>
  new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

const close = (server) => new Promise((resolve) => server.close(resolve));

module.exports = { createClient, listen, close };

/** Cliente de la API REST. Lanza un Error con el mensaje del servidor. */
export async function api(path, body, method) {
  const response = await fetch("/api/" + path, {
    method: method || (body ? "POST" : "GET"),
    headers: { "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const value = await response.json();
  if (!response.ok) throw Error(value.error);
  return value;
}

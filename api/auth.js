import { clearSessionCookie, currentUser, isAuthConfigured, login } from "../lib/auth.js";

export default async function handler(request, response) {
  response.setHeader("Cache-Control", "private, no-store");
  response.setHeader("Vary", "Cookie");

  if (request.method === "GET") {
    if (!isAuthConfigured()) {
      return response.status(503).json({ authenticated: false, error: "El acceso todavía no está configurado" });
    }
    const user = currentUser(request);
    return user
      ? response.status(200).json({ authenticated: true, user })
      : response.status(401).json({ authenticated: false });
  }

  if (request.method === "POST") {
    let body;
    try {
      body = typeof request.body === "string" ? JSON.parse(request.body || "{}") : (request.body || {});
    } catch {
      return response.status(400).json({ authenticated: false, error: "Solicitud inválida" });
    }
    const result = await login(request, response, body.username, body.password);
    return response.status(result.status || 200).json(result.ok
      ? { authenticated: true, user: result.user }
      : { authenticated: false, error: result.error });
  }

  if (request.method === "DELETE") {
    clearSessionCookie(request, response);
    return response.status(200).json({ authenticated: false });
  }

  response.setHeader("Allow", "GET, POST, DELETE");
  return response.status(405).json({ error: "Método no permitido" });
}

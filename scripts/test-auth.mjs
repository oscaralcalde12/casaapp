import assert from "node:assert/strict";
import { pbkdf2Sync } from "node:crypto";
import authHandler from "../api/auth.js";
import tasksHandler from "../api/tasks.js";

function responseMock() {
  return {
    statusCode: 200,
    headers: {},
    body: undefined,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; },
  };
}

async function invoke(handler, request) {
  const response = responseMock();
  await handler({ headers: {}, socket: {}, ...request }, response);
  return response;
}

const username = "usuario-prueba@example.com";
const password = "Contrasena-Prueba-123!";
const secondUsername = "segunda-persona@example.com";
const secondPassword = "Otra-Contrasena-456!";
function testHash(passwordValue, saltValue) {
  const salt = Buffer.from(saltValue);
  return `pbkdf2_sha256.100000.${salt.toString("base64url")}.${pbkdf2Sync(passwordValue, salt, 100000, 32, "sha256").toString("base64url")}`;
}
process.env.APP_AUTH_USERS = JSON.stringify({
  [username]: testHash(password, "casa-plan-test-salt"),
  [secondUsername]: testHash(secondPassword, "casa-plan-other-salt"),
});
process.env.APP_AUTH_SECRET = "casa-plan-test-secret-with-more-than-32-characters";

const malformed = await invoke(authHandler, { method: "POST", body: "{" });
assert.equal(malformed.statusCode, 400);

const rejected = await invoke(authHandler, {
  method: "POST",
  headers: { "x-forwarded-for": "192.0.2.10" },
  body: { username, password: "incorrecta" },
});
assert.equal(rejected.statusCode, 401);

const accepted = await invoke(authHandler, {
  method: "POST",
  headers: { "x-forwarded-for": "192.0.2.10", "x-forwarded-proto": "https" },
  body: { username, password },
});
assert.equal(accepted.statusCode, 200);
assert.match(accepted.headers["Set-Cookie"], /HttpOnly/);
assert.match(accepted.headers["Set-Cookie"], /SameSite=Strict/);
assert.match(accepted.headers["Set-Cookie"], /Secure/);

const cookie = accepted.headers["Set-Cookie"].split(";")[0];
const session = await invoke(authHandler, { method: "GET", headers: { cookie } });
assert.equal(session.statusCode, 200);
assert.equal(session.body.user.username, username);

const secondAccepted = await invoke(authHandler, {
  method: "POST",
  headers: { "x-forwarded-for": "192.0.2.11", "x-forwarded-proto": "https" },
  body: { username: secondUsername.toUpperCase(), password: secondPassword },
});
assert.equal(secondAccepted.statusCode, 200);
assert.equal(secondAccepted.body.user.username, secondUsername);

const crossedCredentials = await invoke(authHandler, {
  method: "POST",
  headers: { "x-forwarded-for": "192.0.2.12" },
  body: { username, password: secondPassword },
});
assert.equal(crossedCredentials.statusCode, 401);

const tampered = await invoke(authHandler, { method: "GET", headers: { cookie: `${cookie}x` } });
assert.equal(tampered.statusCode, 401);

const malformedCookie = await invoke(authHandler, { method: "GET", headers: { cookie: "casa_plan_session=%E0%A4%A" } });
assert.equal(malformedCookie.statusCode, 401);

const protectedTasks = await invoke(tasksHandler, { method: "GET" });
assert.equal(protectedTasks.statusCode, 401);

const loggedOut = await invoke(authHandler, { method: "DELETE", headers: { "x-forwarded-proto": "https" } });
assert.equal(loggedOut.statusCode, 200);
assert.match(loggedOut.headers["Set-Cookie"], /Max-Age=0/);

console.log("Flujo de autenticación validado correctamente.");

import { createHmac, pbkdf2, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const deriveKey = promisify(pbkdf2);
const COOKIE_NAME = "casa_plan_session";
const SESSION_SECONDS = 60 * 60 * 24 * 7;
const MAX_ATTEMPTS = 8;
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;

const attempts = globalThis.__casaPlanLoginAttempts || new Map();
globalThis.__casaPlanLoginAttempts = attempts;

function safeEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && timingSafeEqual(a, b);
}

function normalizeUsername(value) {
  return String(value || "").trim().toLowerCase();
}

function configuredUsers() {
  const raw = process.env.APP_AUTH_USERS || "";
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      const entries = Array.isArray(parsed)
        ? parsed.map((user) => [user?.username || user?.email, user?.passwordHash])
        : Object.entries(parsed);
      return entries
        .map(([username, passwordHash]) => ({ username: normalizeUsername(username), passwordHash: String(passwordHash || "") }))
        .filter((user) => user.username && user.passwordHash);
    } catch {
      return [];
    }
  }

  const username = normalizeUsername(process.env.APP_AUTH_USERNAME);
  const passwordHash = process.env.APP_AUTH_PASSWORD_HASH || "";
  return username && passwordHash ? [{ username, passwordHash }] : [];
}

function parseCookies(header = "") {
  return header.split(";").reduce((result, part) => {
    const separator = part.indexOf("=");
    if (separator < 0) return result;
    const key = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (key) {
      try { result[key] = decodeURIComponent(value); }
      catch { result[key] = ""; }
    }
    return result;
  }, {});
}

function signature(value, secret) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function createSession(username) {
  const payload = Buffer.from(JSON.stringify({
    sub: username,
    exp: Date.now() + SESSION_SECONDS * 1000,
  })).toString("base64url");
  return `${payload}.${signature(payload, process.env.APP_AUTH_SECRET)}`;
}

function readSession(request) {
  const secret = process.env.APP_AUTH_SECRET || "";
  if (secret.length < 32) return null;
  const token = parseCookies(request.headers.cookie)[COOKIE_NAME];
  if (!token) return null;
  const separator = token.lastIndexOf(".");
  if (separator < 1) return null;
  const payload = token.slice(0, separator);
  const providedSignature = token.slice(separator + 1);
  if (!safeEqual(providedSignature, signature(payload, secret))) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!session.sub || !Number.isFinite(session.exp) || session.exp <= Date.now()) return null;
    const username = normalizeUsername(session.sub);
    if (!configuredUsers().some((user) => safeEqual(username, user.username))) return null;
    return { username };
  } catch {
    return null;
  }
}

function clientKey(request) {
  const forwarded = String(request.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return forwarded || request.socket?.remoteAddress || "unknown";
}

function attemptState(request) {
  const key = clientKey(request);
  const now = Date.now();
  let state = attempts.get(key);
  if (!state || now - state.startedAt > ATTEMPT_WINDOW_MS) {
    state = { count: 0, startedAt: now };
    attempts.set(key, state);
  }
  return { key, state };
}

function recordFailure(request) {
  const { key, state } = attemptState(request);
  state.count += 1;
  attempts.set(key, state);
}

function clearFailures(request) {
  attempts.delete(clientKey(request));
}

export function isAuthConfigured() {
  return Boolean(
    configuredUsers().length > 0 &&
    (process.env.APP_AUTH_SECRET || "").length >= 32
  );
}

async function passwordMatches(password, stored) {
  if (typeof password !== "string" || password.length > 512) return false;
  const [algorithm, iterationsText, saltText, hashText] = stored.split(".");
  const iterations = Number(iterationsText);
  if (algorithm !== "pbkdf2_sha256" || !Number.isInteger(iterations) || iterations < 100000 || !saltText || !hashText) return false;
  try {
    const expected = Buffer.from(hashText, "base64url");
    const actual = await deriveKey(String(password), Buffer.from(saltText, "base64url"), iterations, expected.length, "sha256");
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

function setSessionCookie(request, response, username) {
  const forwardedProto = String(request.headers["x-forwarded-proto"] || "");
  const secure = forwardedProto === "https" || process.env.NODE_ENV === "production";
  response.setHeader("Set-Cookie", [
    `${COOKIE_NAME}=${encodeURIComponent(createSession(username))}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    `Max-Age=${SESSION_SECONDS}`,
    secure ? "Secure" : "",
  ].filter(Boolean).join("; "));
}

export function clearSessionCookie(request, response) {
  const forwardedProto = String(request.headers["x-forwarded-proto"] || "");
  const secure = forwardedProto === "https" || process.env.NODE_ENV === "production";
  response.setHeader("Set-Cookie", [
    `${COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    "Max-Age=0",
    secure ? "Secure" : "",
  ].filter(Boolean).join("; "));
}

export async function login(request, response, username, password) {
  if (!isAuthConfigured()) return { ok: false, status: 503, error: "El acceso todavía no está configurado" };
  const { state } = attemptState(request);
  if (state.count >= MAX_ATTEMPTS) {
    return { ok: false, status: 429, error: "Demasiados intentos. Probá de nuevo en 15 minutos" };
  }
  const users = configuredUsers();
  const normalizedUsername = normalizeUsername(username);
  const matchedUser = users.find((user) => safeEqual(normalizedUsername, user.username));
  const passwordHash = matchedUser?.passwordHash || users[0].passwordHash;
  const userMatches = Boolean(matchedUser);
  const validPassword = await passwordMatches(password, passwordHash);
  if (!userMatches || !validPassword) {
    recordFailure(request);
    await new Promise((resolve) => setTimeout(resolve, 450));
    return { ok: false, status: 401, error: "Usuario o contraseña incorrectos" };
  }
  clearFailures(request);
  setSessionCookie(request, response, matchedUser.username);
  return { ok: true, user: { username: matchedUser.username } };
}

export function currentUser(request) {
  return isAuthConfigured() ? readSession(request) : null;
}

export function requireAuth(request, response) {
  response.setHeader("Cache-Control", "private, no-store");
  response.setHeader("Vary", "Cookie");
  if (!isAuthConfigured()) {
    response.status(503).json({ error: "El acceso todavía no está configurado" });
    return null;
  }
  const user = readSession(request);
  if (!user) {
    response.status(401).json({ error: "Iniciá sesión para continuar" });
    return null;
  }
  return user;
}

import { pbkdf2Sync, randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { createInterface } from "node:readline/promises";

function readSecret(label) {
  if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== "function") {
    throw new Error("Este comando necesita una terminal interactiva.");
  }
  return new Promise((resolve, reject) => {
    let value = "";
    process.stdout.write(label);
    process.stdin.setRawMode(true);
    process.stdin.setEncoding("utf8");
    process.stdin.resume();
    function finish() {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.removeListener("data", onData);
      process.stdout.write("\n");
    }
    function onData(chunk) {
      for (const character of chunk) {
        if (character === "\u0003") {
          finish();
          reject(new Error("Operación cancelada."));
          return;
        }
        if (character === "\r" || character === "\n") {
          finish();
          resolve(value);
          return;
        }
        if (character === "\u007f" || character === "\b") {
          if (value) {
            value = value.slice(0, -1);
            process.stdout.write("\b \b");
          }
          continue;
        }
        if (character >= " ") {
          value += character;
          process.stdout.write("•");
        }
      }
    }
    process.stdin.on("data", onData);
  });
}

const args = process.argv.slice(2);
const generatePasswords = args.includes("--generate");
const writeLocal = args.includes("--write-local");
let emails = args.filter((arg) => !arg.startsWith("--"));
const prompt = createInterface({ input: process.stdin, output: process.stdout });
if (!emails.length) {
  emails = (await prompt.question("Correos separados por coma: ")).split(",");
}
emails = [...new Set(emails.map((email) => email.trim().toLowerCase()).filter(Boolean))];
if (!emails.length || emails.some((email) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)) {
  prompt.close();
  throw new Error("Ingresá al menos un correo electrónico válido.");
}
prompt.close();

const credentials = [];
for (const email of emails) {
  let password;
  if (generatePasswords) {
    password = `${randomBytes(18).toString("base64url")}!aA7`;
  } else {
    password = await readSecret(`Contraseña para ${email} (mínimo 12 caracteres): `);
    if (password.length < 12) throw new Error("La contraseña debe tener al menos 12 caracteres.");
    const confirmation = await readSecret(`Repetí la contraseña para ${email}: `);
    if (password !== confirmation) throw new Error("Las contraseñas no coinciden.");
  }
  credentials.push({ email, password });
}

const iterations = 310000;
const users = Object.fromEntries(credentials.map(({ email, password }) => {
  const salt = randomBytes(18);
  const hash = pbkdf2Sync(password, salt, iterations, 32, "sha256");
  return [email, `pbkdf2_sha256.${iterations}.${salt.toString("base64url")}.${hash.toString("base64url")}`];
}));
const authUsers = JSON.stringify(users);
const authSecret = randomBytes(48).toString("base64url");

async function updateEnvFile(path, values) {
  let contents = "";
  try { contents = await readFile(path, "utf8"); } catch {}
  const lines = contents.split(/\r?\n/).filter(Boolean);
  const keys = new Set(Object.keys(values));
  const kept = lines.filter((line) => !keys.has(line.split("=", 1)[0]));
  const next = [...kept, ...Object.entries(values).map(([key, value]) => `${key}=${value}`), ""].join("\n");
  await writeFile(path, next, { mode: 0o600 });
}

if (writeLocal) {
  await updateEnvFile(new URL("../.env.local", import.meta.url), { APP_AUTH_USERS: authUsers, APP_AUTH_SECRET: authSecret });
  await writeFile(new URL("../.credentials.local.json", import.meta.url), `${JSON.stringify(credentials, null, 2)}\n`, { mode: 0o600 });
  console.log(`Credenciales generadas para ${credentials.length} usuarios y guardadas localmente.`);
} else {
  console.log("\nCopiá estas variables en Vercel y en .env.local:");
  console.log(`APP_AUTH_USERS=${authUsers}`);
  console.log(`APP_AUTH_SECRET=${authSecret}`);
  if (generatePasswords) {
    console.log("\nCredenciales iniciales:");
    credentials.forEach(({ email, password }) => console.log(`${email}: ${password}`));
  }
}

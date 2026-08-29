import { neon } from "@neondatabase/serverless";
import { readdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

try {
  const envFile = await readFile(resolve(root, ".env.local"), "utf8");
  for (const line of envFile.split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 1) continue;
    const key = line.slice(0, separator);
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (!process.env[key]) process.env[key] = value;
  }
} catch {}

const connection = process.env.DATABASE_URL_UNPOOLED;
if (!connection) throw new Error("Falta DATABASE_URL_UNPOOLED para ejecutar migraciones.");

const sql = neon(connection);
await sql`CREATE TABLE IF NOT EXISTS app_migrations (
  filename text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
)`;

const directory = resolve(root, "db", "migrations");
const files = (await readdir(directory)).filter((file) => file.endsWith(".sql")).sort();
for (const filename of files) {
  const applied = await sql`SELECT 1 FROM app_migrations WHERE filename = ${filename}`;
  if (applied.length) continue;
  const source = await readFile(resolve(directory, filename), "utf8");
  const statements = source.split(/;\s*(?:\r?\n|$)/).map((item) => item.trim()).filter(Boolean);
  for (const statement of statements) await sql.query(statement);
  await sql`INSERT INTO app_migrations (filename) VALUES (${filename})`;
  console.log(`Aplicada: ${filename}`);
}

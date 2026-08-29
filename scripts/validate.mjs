import { access, readFile } from "node:fs/promises";

const required = [
  "public/index.html", "api/tasks.js", "api/health.js", "lib/db.js", "lib/seed.js",
  "db/schema.js", "db/migrations/001_create_tasks.sql", "scripts/migrate.mjs", "neon.ts",
];
await Promise.all(required.map((file) => access(new URL(`../${file}`, import.meta.url))));
const html = await readFile(new URL("../public/index.html", import.meta.url), "utf8");
if (!html.includes("Plano de Obra") || !html.includes("/api/tasks") || !html.includes("m-start") || !html.includes("renderRoadmap")) {
  throw new Error("La interfaz no contiene la integración esperada.");
}
console.log("Aplicación validada correctamente.");

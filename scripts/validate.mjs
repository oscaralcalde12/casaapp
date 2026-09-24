import { access, readFile } from "node:fs/promises";

const required = [
  "public/index.html", "api/tasks.js", "api/auth.js", "api/health.js", "lib/auth.js", "lib/db.js", "lib/seed.js",
  "db/schema.js", "db/migrations/001_create_tasks.sql", "db/migrations/002_add_task_checklist.sql", "db/migrations/003_add_task_tools.sql", "scripts/migrate.mjs", "neon.ts",
  "public/manifest.webmanifest", "public/sw.js", "public/icons/icon-192.png", "public/icons/icon-512.png",
  "public/icons/icon-maskable-512.png", "public/icons/apple-touch-icon.png", "scripts/create-auth-secrets.mjs", "scripts/test-auth.mjs",
];
await Promise.all(required.map((file) => access(new URL(`../${file}`, import.meta.url))));
const html = await readFile(new URL("../public/index.html", import.meta.url), "utf8");
if (!html.includes("Plano de Obra") || !html.includes("/api/tasks") || !html.includes("/api/auth") || !html.includes("auth-screen") || !html.includes("logout-btn") || !html.includes("m-start") || !html.includes("renderRoadmap") || !html.includes("timeline-thumb") || !html.includes("renderDateList") || !html.includes("dates-view") || !html.includes("date-list") || !html.includes("renderProgress") || !html.includes("progress-view") || !html.includes("progress-sectors") || !html.includes("renderMaterials") || !html.includes("materials-view") || !html.includes("m-checklist-list") || !html.includes("m-tool-list") || !html.includes("mat-unit-cost") || !html.includes("materialQuantity") || !html.includes("/manifest.webmanifest") || !html.includes("serviceWorker.register")) {
  throw new Error("La interfaz no contiene la integración esperada.");
}
if (html.indexOf('id="fl-search"') > html.indexOf('id="fl-road"')) {
  throw new Error("El buscador debe aparecer antes que los demás filtros.");
}
const manifest = JSON.parse(await readFile(new URL("../public/manifest.webmanifest", import.meta.url), "utf8"));
if (manifest.display !== "standalone" || manifest.start_url !== "/" || !Array.isArray(manifest.icons) || manifest.icons.length < 3) {
  throw new Error("El manifiesto PWA no contiene la configuración esperada.");
}
const worker = await readFile(new URL("../public/sw.js", import.meta.url), "utf8");
if (!worker.includes("APP_SHELL") || !worker.includes("/api/") || !worker.includes("networkFirst") || !worker.includes("CLEAR_PRIVATE_DATA")) {
  throw new Error("El service worker no contiene la estrategia de caché esperada.");
}
console.log("Aplicación validada correctamente.");

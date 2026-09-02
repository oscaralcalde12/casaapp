import { asc } from "drizzle-orm";
import { tasks as tasksTable } from "../db/schema.js";
import { database, ensureSeed, rowToTask } from "../lib/db.js";

function normalizeCostItems(items, includeUrl = false) {
  if (!Array.isArray(items)) return [];
  return items.slice(0, 100).map((item) => {
    const parsedCost = Number(item?.cost);
    const normalized = {
      name: String(item?.name || "").trim().slice(0, 160),
      cost: Number.isFinite(parsedCost) ? Math.max(0, parsedCost) : 0,
    };
    if (includeUrl) {
      const parsedQuantity = Number(item?.quantity);
      const parsedUnitCost = Number(item?.unitCost ?? item?.cost);
      normalized.quantity = Number.isFinite(parsedQuantity) && parsedQuantity > 0 ? Math.min(parsedQuantity, 1000000) : 1;
      normalized.unitCost = Number.isFinite(parsedUnitCost) ? Math.max(0, parsedUnitCost) : 0;
      normalized.cost = normalized.quantity * normalized.unitCost;
      const url = String(item?.url || "").trim().slice(0, 1000);
      normalized.url = /^https?:\/\//i.test(url) ? url : "";
    }
    return normalized;
  }).filter((item) => item.name || item.cost);
}

export default async function handler(request, response) {
  try {
    const db = database();
    await ensureSeed(db);
    if (request.method === "GET") {
      const rows = await db.select().from(tasksTable).orderBy(asc(tasksTable.position));
      return response.status(200).json(rows.map(rowToTask));
    }
    if (request.method === "PUT") {
      const tasks = Array.isArray(request.body) ? request.body : request.body?.tasks;
      if (!Array.isArray(tasks)) return response.status(400).json({ error: "Se esperaba una lista de tareas" });
      await db.delete(tasksTable);
      if (tasks.length) {
        const rows = tasks.map((task, position) => ({
          id: String(task.id || crypto.randomUUID().slice(0, 10)), position,
          sector: String(task.sector || ""), name: String(task.name || ""),
          cost: task.cost === "" || task.cost == null ? null : Number(task.cost),
          eff: Number(task.eff || 0), prio: String(task.prio || "none"),
          exec: String(task.exec || ""), road: String(task.road || "Sin asignar"),
          status: ["pendiente", "curso", "hecho"].includes(task.status) ? task.status : "pendiente",
          materials: normalizeCostItems(task.materials, true),
          tools: normalizeCostItems(task.tools),
          comments: String(task.comments || ""),
          checklist: Array.isArray(task.checklist) ? task.checklist.slice(0, 100).map((item) => ({
            id: String(item?.id || crypto.randomUUID().slice(0, 10)),
            text: String(item?.text || "").trim().slice(0, 240),
            done: Boolean(item?.done),
          })).filter((item) => item.text) : [],
          imgActual: String(task.imgActual || ""),
          imgFuturo: String(task.imgFuturo || ""),
          startDate: task.startDate || null, endDate: task.endDate || null,
        }));
        await db.insert(tasksTable).values(rows);
      }
      return response.status(200).json({ ok: true, count: tasks.length });
    }
    response.setHeader("Allow", "GET, PUT");
    return response.status(405).json({ error: "Método no permitido" });
  } catch (error) {
    console.error(error);
    return response.status(500).json({ error: "No se pudo acceder a la base de datos" });
  }
}

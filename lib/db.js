import { neon } from "@neondatabase/serverless";
import { count } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { SEED } from "./seed.js";
import { tasks } from "../db/schema.js";

let db;

export function database() {
  if (!process.env.DATABASE_URL) throw new Error("Falta DATABASE_URL");
  if (!db) db = drizzle(neon(process.env.DATABASE_URL), { schema: { tasks } });
  return db;
}

export async function ensureSeed(currentDb = database()) {
  const [{ value }] = await currentDb.select({ value: count() }).from(tasks);
  if (Number(value) === 0) {
    const rows = SEED.map((item, position) => ({
      id: crypto.randomUUID().slice(0, 10), position, sector: item.s, name: item.n,
    }));
    await currentDb.insert(tasks).values(rows);
  }
}

export function rowToTask(row) {
  return {
    id: row.id, sector: row.sector, name: row.name,
    cost: row.cost == null ? null : Number(row.cost), eff: row.eff,
    prio: row.prio, exec: row.exec, road: row.road, status: row.status,
    materials: row.materials || [], comments: row.comments,
    checklist: Array.isArray(row.checklist) ? row.checklist : [],
    imgActual: row.imgActual, imgFuturo: row.imgFuturo,
    startDate: row.startDate || "", endDate: row.endDate || "",
  };
}

import { date, index, integer, jsonb, numeric, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const tasks = pgTable("tasks", {
  id: text("id").primaryKey(),
  position: integer("position").notNull(),
  sector: text("sector").notNull().default(""),
  name: text("name").notNull().default(""),
  cost: numeric("cost"),
  eff: integer("eff").notNull().default(0),
  prio: text("prio").notNull().default("none"),
  exec: text("exec").notNull().default(""),
  road: text("road").notNull().default("Sin asignar"),
  status: text("status").notNull().default("pendiente"),
  materials: jsonb("materials").notNull().default([]),
  tools: jsonb("tools").notNull().default([]),
  comments: text("comments").notNull().default(""),
  checklist: jsonb("checklist").notNull().default([]),
  imgActual: text("img_actual").notNull().default(""),
  imgFuturo: text("img_futuro").notNull().default(""),
  startDate: date("start_date"),
  endDate: date("end_date"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("tasks_position_idx").on(table.position),
  index("tasks_schedule_idx").on(table.startDate, table.endDate),
]);

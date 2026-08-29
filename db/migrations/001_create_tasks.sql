CREATE TABLE IF NOT EXISTS tasks (
  id text PRIMARY KEY,
  position integer NOT NULL,
  sector text NOT NULL DEFAULT '',
  name text NOT NULL DEFAULT '',
  cost numeric,
  eff integer NOT NULL DEFAULT 0,
  prio text NOT NULL DEFAULT 'none',
  exec text NOT NULL DEFAULT '',
  road text NOT NULL DEFAULT 'Sin asignar',
  status text NOT NULL DEFAULT 'pendiente',
  materials jsonb NOT NULL DEFAULT '[]'::jsonb,
  comments text NOT NULL DEFAULT '',
  img_actual text NOT NULL DEFAULT '',
  img_futuro text NOT NULL DEFAULT '',
  start_date date,
  end_date date,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS start_date date;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS end_date date;

CREATE INDEX IF NOT EXISTS tasks_position_idx ON tasks(position);
CREATE INDEX IF NOT EXISTS tasks_schedule_idx ON tasks(start_date, end_date);

-- LumenClass Supabase schema
-- Run this once in the Supabase SQL editor (Dashboard → SQL Editor → New query)

-- ── Tables ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sensor_readings (
  id          bigserial    PRIMARY KEY,
  inserted_at timestamptz  DEFAULT now() NOT NULL,
  lux         integer      NOT NULL,
  lux_raw     integer      NOT NULL,
  duty        integer      NOT NULL,
  occupancy   integer      NOT NULL,
  motion      jsonb        NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS zone_events (
  id           bigserial    PRIMARY KEY,
  inserted_at  timestamptz  DEFAULT now() NOT NULL,
  zone_index   integer      NOT NULL,
  zone_name    text         NOT NULL,
  on_state     boolean      NOT NULL,
  override     boolean      NOT NULL DEFAULT false,
  triggered_by text         NOT NULL
);

CREATE TABLE IF NOT EXISTS alerts (
  id          bigserial    PRIMARY KEY,
  inserted_at timestamptz  DEFAULT now() NOT NULL,
  type        text         NOT NULL CHECK (type IN ('ok', 'info', 'warn', 'error')),
  title       text         NOT NULL,
  body        text         NOT NULL
);

-- ── Indexes ──────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS sensor_readings_inserted_at_idx ON sensor_readings (inserted_at DESC);
CREATE INDEX IF NOT EXISTS zone_events_inserted_at_idx     ON zone_events     (inserted_at DESC);
CREATE INDEX IF NOT EXISTS alerts_inserted_at_idx          ON alerts          (inserted_at DESC);

-- ── Row Level Security ────────────────────────────────────────
-- The browser (anon key) can only read.
-- The bridge (service-role key) bypasses RLS and can insert.

ALTER TABLE sensor_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE zone_events     ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts          ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon read" ON sensor_readings FOR SELECT USING (true);
CREATE POLICY "anon read" ON zone_events     FOR SELECT USING (true);
CREATE POLICY "anon read" ON alerts          FOR SELECT USING (true);

-- ── Realtime ─────────────────────────────────────────────────
-- Enables real-time INSERT events for the alerts table so the
-- dashboard updates immediately when the bridge writes a new alert.

ALTER PUBLICATION supabase_realtime ADD TABLE alerts;

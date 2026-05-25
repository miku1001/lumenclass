-- LumenClass Supabase schema
-- Run this once in the Supabase SQL editor (Dashboard → SQL Editor → New query)

-- ── Migration: drop old tables no longer in use ───────────────
DROP TABLE IF EXISTS sensor_readings;
DROP TABLE IF EXISTS zone_events;

-- ── Tables ───────────────────────────────────────────────────
-- Single event log for all system activity shown in the dashboard.
-- Event types recorded:
--   • Zone occupancy / lights ON-OFF
--   • Significant brightness transitions (dim / moderate / bright)
--   • ESP8266 connection status changes
--   • Supabase connection status changes (logged on recovery)

CREATE TABLE IF NOT EXISTS alerts (
  id          bigserial    PRIMARY KEY,
  inserted_at timestamptz  DEFAULT now() NOT NULL,
  type        text         NOT NULL CHECK (type IN ('ok', 'info', 'warn', 'error')),
  title       text         NOT NULL,
  body        text         NOT NULL
);

-- ── Indexes ──────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS alerts_inserted_at_idx ON alerts (inserted_at DESC);

-- ── Row Level Security ────────────────────────────────────────
-- The browser (Publishable API key) can only read.
-- The bridge (Secret API key) bypasses RLS and can insert.

ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon read" ON alerts;
CREATE POLICY "anon read" ON alerts FOR SELECT USING (true);

-- ── Realtime ─────────────────────────────────────────────────
-- Enables real-time INSERT events so the dashboard updates immediately.

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'alerts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE alerts;
  END IF;
END $$;

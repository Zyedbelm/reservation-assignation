
-- 1) Source calendrier sur activities
ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS calendar_source text DEFAULT 'unknown';

CREATE INDEX IF NOT EXISTS activities_calendar_source_idx
  ON public.activities (calendar_source);

-- Unicité par calendrier (seulement pour les events Make qui ont un make_event_id)
CREATE UNIQUE INDEX IF NOT EXISTS activities_unique_make_event_per_calendar
  ON public.activities (make_event_id, calendar_source)
  WHERE make_event_id IS NOT NULL;

-- 2) Journalisation : enrichir make_sync_logs
ALTER TABLE public.make_sync_logs
  ADD COLUMN IF NOT EXISTS calendar_source text;

ALTER TABLE public.make_sync_logs
  ADD COLUMN IF NOT EXISTS is_full_snapshot boolean DEFAULT false;

ALTER TABLE public.make_sync_logs
  ADD COLUMN IF NOT EXISTS date_range jsonb;

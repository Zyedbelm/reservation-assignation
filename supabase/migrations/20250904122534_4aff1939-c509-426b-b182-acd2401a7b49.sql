-- Drop the single unique index on make_event_id to resolve conflicts
-- Keep the composite unique index (make_event_id, calendar_source)
DROP INDEX IF EXISTS public.activities_make_event_id_key;

-- Add a non-unique index on make_event_id for performance
CREATE INDEX IF NOT EXISTS activities_make_event_id_idx ON public.activities(make_event_id) WHERE make_event_id IS NOT NULL;
-- Drop the unique constraint instead of the index
-- This will allow the same make_event_id with different calendar_sources
ALTER TABLE public.activities DROP CONSTRAINT IF EXISTS activities_make_event_id_key;

-- Add a non-unique index on make_event_id for performance
CREATE INDEX IF NOT EXISTS activities_make_event_id_idx ON public.activities(make_event_id) WHERE make_event_id IS NOT NULL;
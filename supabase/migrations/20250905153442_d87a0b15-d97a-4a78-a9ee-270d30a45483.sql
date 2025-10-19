-- Add unique index to prevent duplicate events
CREATE UNIQUE INDEX IF NOT EXISTS idx_activities_make_event_calendar_unique 
ON public.activities (make_event_id, calendar_source) 
WHERE make_event_id IS NOT NULL AND calendar_source IS NOT NULL;

-- Add cascade delete for gm_notifications to handle cleanup properly
ALTER TABLE public.gm_notifications 
DROP CONSTRAINT IF EXISTS gm_notifications_event_id_fkey;

ALTER TABLE public.gm_notifications 
ADD CONSTRAINT gm_notifications_event_id_fkey 
FOREIGN KEY (event_id) REFERENCES public.activities(id) 
ON DELETE CASCADE;
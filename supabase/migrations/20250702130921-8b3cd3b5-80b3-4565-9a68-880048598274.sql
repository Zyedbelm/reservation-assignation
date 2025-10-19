-- 1. Fix function search_path security issue
DROP FUNCTION IF EXISTS public.get_next_sync_time();

CREATE OR REPLACE FUNCTION public.get_next_sync_time()
RETURNS TIMESTAMP WITH TIME ZONE
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    next_sync TIMESTAMP WITH TIME ZONE;
    current_hour INTEGER;
BEGIN
    current_hour := EXTRACT(hour FROM NOW())::integer;
    
    -- Calculate next 6-hour interval (0, 6, 12, 18)
    IF current_hour < 6 THEN
        next_sync := date_trunc('day', NOW()) + INTERVAL '6 hours';
    ELSIF current_hour < 12 THEN
        next_sync := date_trunc('day', NOW()) + INTERVAL '12 hours';
    ELSIF current_hour < 18 THEN
        next_sync := date_trunc('day', NOW()) + INTERVAL '18 hours';
    ELSE
        next_sync := date_trunc('day', NOW()) + INTERVAL '1 day';
    END IF;
    
    RETURN next_sync;
END;
$$;

-- 2. Fix extension schema security issue
-- Create extensions schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS extensions;

-- Move pg_net extension to extensions schema
DROP EXTENSION IF EXISTS pg_net CASCADE;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Re-create the cron job with the updated extension reference
SELECT cron.unschedule('auto-sync-every-6-hours');

SELECT cron.schedule(
  'auto-sync-every-6-hours',
  '0 */6 * * *', -- At minute 0 of every 6th hour
  $$
  SELECT
    extensions.http_post(
        url:='https://dnxyidnkmtrmkxucqrry.supabase.co/functions/v1/auto-sync-scheduler',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRueHlpZG5rbXRybWt4dWNxcnJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3NTM4NTUsImV4cCI6MjA2NjMyOTg1NX0.CQNSkJFpA1y_p2tpwzvavV0Ee4Cn1WrBcEx1IhIOdJo"}'::jsonb,
        body:='{"trigger": "cron_job"}'::jsonb
    ) as request_id;
  $$
);
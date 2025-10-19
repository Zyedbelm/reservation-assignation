-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule auto sync every 6 hours
SELECT cron.schedule(
  'auto-sync-every-6-hours',
  '0 */6 * * *', -- At minute 0 of every 6th hour
  $$
  SELECT
    net.http_post(
        url:='https://dnxyidnkmtrmkxucqrry.supabase.co/functions/v1/auto-sync-scheduler',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRueHlpZG5rbXRybWt4dWNxcnJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3NTM4NTUsImV4cCI6MjA2NjMyOTg1NX0.CQNSkJFpA1y_p2tpwzvavV0Ee4Cn1WrBcEx1IhIOdJo"}'::jsonb,
        body:='{"trigger": "cron_job"}'::jsonb
    ) as request_id;
  $$
);

-- Create a function to get next scheduled sync time
CREATE OR REPLACE FUNCTION get_next_sync_time()
RETURNS TIMESTAMP WITH TIME ZONE
LANGUAGE plpgsql
AS $$
DECLARE
    next_sync TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Calculate next 6-hour interval from current time
    SELECT 
        date_trunc('hour', NOW()) + 
        (6 - EXTRACT(hour FROM NOW())::integer % 6) * INTERVAL '1 hour'
    INTO next_sync;
    
    RETURN next_sync;
END;
$$;
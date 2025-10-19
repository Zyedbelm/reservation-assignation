-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule weekly unassigned events webhook to run every Monday at 9:00 AM
SELECT cron.schedule(
  'weekly-unassigned-events',
  '0 9 * * 1', -- Every Monday at 9:00 AM
  $$
  SELECT
    net.http_post(
        url:='https://dnxyidnkmtrmkxucqrry.supabase.co/functions/v1/weekly-unassigned-events',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRueHlpZG5rbXRybWt4dWNxcnJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3NTM4NTUsImV4cCI6MjA2NjMyOTg1NX0.CQNSkJFpA1y_p2tpwzvavV0Ee4Cn1WrBcEx1IhIOdJo"}'::jsonb,
        body:=concat('{"triggered_by": "cron", "time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);
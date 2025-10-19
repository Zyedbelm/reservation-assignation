-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA extensions TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA extensions TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA extensions TO postgres;
GRANT ALL ON ALL ROUTINES IN SCHEMA extensions TO postgres;

-- Schedule monthly GM emails to run on the 1st of each month at 08:45 UTC (09:45 Swiss winter time)
SELECT cron.schedule(
  'monthly-gm-emails-job',
  '45 8 1 * *',
  $$
  SELECT
    net.http_post(
        url:='https://dnxyidnkmtrmkxucqrry.supabase.co/functions/v1/monthly-gm-emails',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRueHlpZG5rbXRybWt4dWNxcnJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3NTM4NTUsImV4cCI6MjA2NjMyOTg1NX0.CQNSkJFpA1y_p2tpwzvavV0Ee4Cn1WrBcEx1IhIOdJo"}'::jsonb,
        body:='{"trigger_type": "cron"}'::jsonb
    ) as request_id;
  $$
);
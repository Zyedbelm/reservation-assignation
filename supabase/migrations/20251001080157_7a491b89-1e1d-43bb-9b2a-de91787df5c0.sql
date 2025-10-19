-- Drop existing cron job if exists
SELECT cron.unschedule('monthly-gm-emails-job');

-- Schedule monthly GM emails to run on the 1st of each month at 08:02 UTC (10:02 Swiss summer time)
SELECT cron.schedule(
  'monthly-gm-emails-job',
  '2 8 1 * *',
  $$
  SELECT
    net.http_post(
        url:='https://dnxyidnkmtrmkxucqrry.supabase.co/functions/v1/monthly-gm-emails',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRueHlpZG5rbXRybWt4dWNxcnJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3NTM4NTUsImV4cCI6MjA2NjMyOTg1NX0.CQNSkJFpA1y_p2tpwzvavV0Ee4Cn1WrBcEx1IhIOdJo"}'::jsonb,
        body:='{"trigger_type": "cron"}'::jsonb
    ) as request_id;
  $$
);
-- Créer le cron job pour les notifications quotidiennes GM à 18h00
SELECT cron.schedule(
  'daily-gm-notifications',
  '0 18 * * *', -- Tous les jours à 18h00
  $$
  SELECT
    net.http_post(
        url:='https://dnxyidnkmtrmkxucqrry.supabase.co/functions/v1/daily-gm-notifications',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRueHlpZG5rbXRybWt4dWNxcnJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3NTM4NTUsImV4cCI6MjA2NjMyOTg1NX0.CQNSkJFpA1y_p2tpwzvavV0Ee4Cn1WrBcEx1IhIOdJo"}'::jsonb,
        body:=concat('{"scheduled": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);

-- Supprimer les anciens cron jobs s'ils existent
SELECT cron.unschedule('auto-sync-every-6-hours');
SELECT cron.unschedule('auto-assignment-every-6-hours');

-- Créer le cron job pour la synchronisation des calendriers toutes les 6 heures
SELECT cron.schedule(
  'calendar-sync-every-6-hours',
  '0 */6 * * *', -- À la minute 0 de chaque 6ème heure
  $$
  SELECT
    extensions.http_post(
        url:='https://dnxyidnkmtrmkxucqrry.supabase.co/functions/v1/auto-sync-scheduler',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRueHlpZG5rbXRybWt4dWNxcnJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3NTM4NTUsImV4cCI6MjA2NjMyOTg1NX0.CQNSkJFpA1y_p2tpwzvavV0Ee4Cn1WrBcEx1IhIOdJo"}'::jsonb,
        body:='{"source": "auto_cron", "timestamp": "' || now() || '"}'::jsonb
    ) as request_id;
  $$
);

-- Créer le cron job pour l'auto-assignation des GM toutes les 6 heures
SELECT cron.schedule(
  'gm-auto-assignment-every-6-hours',
  '30 */6 * * *', -- À la minute 30 de chaque 6ème heure (décalé de 30 min)
  $$
  SELECT
    extensions.http_post(
        url:='https://dnxyidnkmtrmkxucqrry.supabase.co/functions/v1/auto-assign-gms',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRueHlpZG5rbXRybWt4dWNxcnJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3NTM4NTUsImV4cCI6MjA2NjMyOTg1NX0.CQNSkJFpA1y_p2tpwzvavV0Ee4Cn1WrBcEx1IhIOdJo"}'::jsonb,
        body:='{"trigger": "auto_cron", "timestamp": "' || now() || '"}'::jsonb
    ) as request_id;
  $$
);

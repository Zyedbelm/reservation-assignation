-- Supprimer les anciens cron jobs défectueux (ignorer les erreurs si inexistants)
DO $$
BEGIN
    BEGIN
        PERFORM cron.unschedule('calendar-sync-every-6-hours');
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Job calendar-sync-every-6-hours not found, continuing...';
    END;
    
    BEGIN
        PERFORM cron.unschedule('gm-auto-assignment-every-6-hours');
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Job gm-auto-assignment-every-6-hours not found, continuing...';
    END;
    
    BEGIN
        PERFORM cron.unschedule('auto-sync-every-6-hours');
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Job auto-sync-every-6-hours not found, continuing...';
    END;
    
    BEGIN
        PERFORM cron.unschedule('auto-assignment-every-6-hours');
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Job auto-assignment-every-6-hours not found, continuing...';
    END;
END $$;

-- Créer le cron job pour la synchronisation avec la bonne fonction
SELECT cron.schedule(
  'sync-make-calendar-every-6-hours',
  '0 */6 * * *', -- À la minute 0 de chaque 6ème heure
  $$
  SELECT
    extensions.http_post(
        url:='https://dnxyidnkmtrmkxucqrry.supabase.co/functions/v1/sync-make-calendar',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRueHlpZG5rbXRybWt4dWNxcnJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3NTM4NTUsImV4cCI6MjA2NjMyOTg1NX0.CQNSkJFpA1y_p2tpwzvavV0Ee4Cn1WrBcEx1IhIOdJo"}'::jsonb,
        body:='{"source": "auto_cron_scheduler", "trigger": "auto_scheduler", "timestamp": "' || now() || '"}'::jsonb
    ) as request_id;
  $$
);

-- Créer le cron job pour l'auto-assignation
SELECT cron.schedule(
  'auto-assign-gms-every-6-hours',
  '30 */6 * * *', -- À la minute 30 de chaque 6ème heure (décalé de 30 min)
  $$
  SELECT
    extensions.http_post(
        url:='https://dnxyidnkmtrmkxucqrry.supabase.co/functions/v1/auto-assign-gms',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRueHlpZG5rbXRybWt4dWNxcnJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3NTM4NTUsImV4cCI6MjA2NjMyOTg1NX0.CQNSkJFpA1y_p2tpwzvavV0Ee4Cn1WrBcEx1IhIOdJo"}'::jsonb,
        body:='{"trigger": "auto_cron", "source": "auto_cron_scheduler", "timestamp": "' || now() || '"}'::jsonb
    ) as request_id;
  $$
);

-- Supprimer tous les anciens cron jobs défectueux
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
    
    BEGIN
        PERFORM cron.unschedule('sync-make-calendar-every-6-hours');
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Job sync-make-calendar-every-6-hours not found, continuing...';
    END;
    
    BEGIN
        PERFORM cron.unschedule('auto-assign-gms-every-6-hours');
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Job auto-assign-gms-every-6-hours not found, continuing...';
    END;
END $$;

-- Créer le cron job CORRIGÉ pour la synchronisation avec net.http_post et dates par défaut
SELECT cron.schedule(
  'sync-make-calendar-auto-6h',
  '0 */6 * * *', -- À la minute 0 de chaque 6ème heure
  $$
  SELECT
    net.http_post(
        url:='https://dnxyidnkmtrmkxucqrry.supabase.co/functions/v1/sync-make-calendar',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRueHlpZG5rbXRybWt4dWNxcnJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3NTM4NTUsImV4cCI6MjA2NjMyOTg1NX0.CQNSkJFpA1y_p2tpwzvavV0Ee4Cn1WrBcEx1IhIOdJo"}'::jsonb,
        body:=('{"source": "auto_cron_scheduler", "trigger": "auto_scheduler", "timestamp": "' || now() || '", "startDate": "' || CURRENT_DATE || '", "endDate": "' || (CURRENT_DATE + INTERVAL ''3 months'') || '"}')::jsonb
    ) as request_id;
  $$
);

-- Créer le cron job CORRIGÉ pour l'auto-assignation avec net.http_post
SELECT cron.schedule(
  'auto-assign-gms-auto-6h',
  '30 */6 * * *', -- À la minute 30 de chaque 6ème heure (décalé de 30 min)
  $$
  SELECT
    net.http_post(
        url:='https://dnxyidnkmtrmkxucqrry.supabase.co/functions/v1/auto-assign-gms',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRueHlpZG5rbXRybWt4dWNxcnJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3NTM4NTUsImV4cCI6MjA2NjMyOTg1NX0.CQNSkJFpA1y_p2tpwzvavV0Ee4Cn1WrBcEx1IhIOdJo"}'::jsonb,
        body:=('{"trigger": "auto_cron", "source": "auto_cron_scheduler", "timestamp": "' || now() || '"}')::jsonb
    ) as request_id;
  $$
);

-- Vérifier que les nouveaux cron jobs sont bien créés
SELECT jobname, schedule, active, command FROM cron.job WHERE jobname LIKE '%auto%';

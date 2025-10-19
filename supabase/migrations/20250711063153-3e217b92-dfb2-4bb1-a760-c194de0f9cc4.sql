-- Supprimer les cron jobs actuels qui passent par l'Edge Function
DO $$
BEGIN
    BEGIN
        PERFORM cron.unschedule('sync-make-calendar-auto-6h');
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Job sync-make-calendar-auto-6h not found, continuing...';
    END;
    
    BEGIN
        PERFORM cron.unschedule('auto-assign-gms-auto-6h');
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Job auto-assign-gms-auto-6h not found, continuing...';
    END;
END $$;

-- Créer le cron job DIRECT vers Make.com pour la synchronisation
SELECT cron.schedule(
  'direct-make-sync-auto-6h',
  '0 */6 * * *', -- À la minute 0 de chaque 6ème heure
  $$
  SELECT
    net.http_post(
        url:='https://hook.eu2.make.com/your-webhook-url',
        headers:='{"Content-Type": "application/json"}'::jsonb,
        body:=('{"sync_request": {"date_range": {"start": "' || CURRENT_DATE || '", "end": "' || (CURRENT_DATE + INTERVAL ''3 months'') || '"}}, "trigger": "auto_scheduler", "timestamp": "' || now() || '", "source": "postgres_cron"}')::jsonb
    ) as make_request_id;
  $$
);

-- Garder le cron job pour l'auto-assignation via Edge Function
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

-- Vérifier les nouveaux cron jobs
SELECT jobname, schedule, active, command FROM cron.job WHERE jobname LIKE '%auto%';
-- Supprimer le cron job avec l'URL placeholder
DO $$
BEGIN
    BEGIN
        PERFORM cron.unschedule('direct-make-sync-auto-6h');
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Job direct-make-sync-auto-6h not found, continuing...';
    END;
END $$;

-- Créer le cron job avec la vraie URL webhook Make.com
SELECT cron.schedule(
  'direct-make-sync-auto-6h',
  '0 */6 * * *',
  $$
  SELECT
    net.http_post(
        url:='https://hook.eu2.make.com/9os8jbgh6x8my7tv8arloca4utslj62q',
        headers:='{"Content-Type": "application/json"}'::jsonb,
        body:=concat('{"sync_request": {"date_range": {"start": "', CURRENT_DATE, '", "end": "', (CURRENT_DATE + INTERVAL '3 months'), '"}}, "trigger": "auto_scheduler", "timestamp": "', now(), '", "source": "postgres_cron"}')::jsonb
    ) as make_request_id;
  $$
);

-- Vérifier que les cron jobs sont bien configurés
SELECT jobname, schedule, active, command FROM cron.job WHERE jobname LIKE '%make%' OR jobname LIKE '%auto%';
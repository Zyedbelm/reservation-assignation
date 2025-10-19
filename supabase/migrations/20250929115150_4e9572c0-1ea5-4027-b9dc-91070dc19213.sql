-- Corriger spécifiquement le rapport de Louis Fischer pour septembre 2025
-- D'abord, récupérer les activités de Louis pour septembre 2025
DO $$
DECLARE
    louis_gm_id UUID;
    september_activities RECORD;
    activities_data JSONB := '[]'::jsonb;
    current_report_data JSONB;
    updated_report_data JSONB;
    louis_report_id UUID;
BEGIN
    -- Trouver l'ID de Louis Fischer
    SELECT id INTO louis_gm_id 
    FROM public.game_masters 
    WHERE LOWER(name) LIKE '%louis%' AND LOWER(name) LIKE '%fischer%'
    LIMIT 1;
    
    IF louis_gm_id IS NULL THEN
        RAISE NOTICE 'Louis Fischer non trouvé dans game_masters';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Louis Fischer ID trouvé: %', louis_gm_id;
    
    -- Construire les données d'activités pour septembre 2025
    FOR september_activities IN 
        SELECT title, date, start_time, end_time, duration, activity_type
        FROM public.activities
        WHERE assigned_gm_id = louis_gm_id
        AND date >= '2025-09-01'
        AND date <= '2025-09-30'
        AND is_assigned = true
    LOOP
        activities_data := activities_data || jsonb_build_object(
            'title', september_activities.title,
            'date', september_activities.date,
            'start_time', september_activities.start_time,
            'end_time', september_activities.end_time,
            'duration', september_activities.duration / 60.0,
            'type', september_activities.activity_type
        );
    END LOOP;
    
    RAISE NOTICE 'Activités trouvées pour septembre 2025: %', jsonb_array_length(activities_data);
    
    -- Récupérer le rapport existant de septembre 2025
    SELECT id, report_data INTO louis_report_id, current_report_data
    FROM public.monthly_reports
    WHERE gm_id = louis_gm_id
    AND month_year = '2025-09'
    LIMIT 1;
    
    IF louis_report_id IS NULL THEN
        RAISE NOTICE 'Aucun rapport manuel trouvé pour septembre 2025';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Rapport existant trouvé: %', louis_report_id;
    
    -- Fusionner les activités avec les données existantes
    IF current_report_data IS NULL THEN
        current_report_data := '{}'::jsonb;
    END IF;
    
    updated_report_data := current_report_data || jsonb_build_object('activities', activities_data);
    
    -- Mettre à jour le rapport
    UPDATE public.monthly_reports
    SET 
        report_data = updated_report_data,
        updated_at = now()
    WHERE id = louis_report_id;
    
    RAISE NOTICE 'Rapport de Louis Fischer pour septembre 2025 mis à jour avec % activités', jsonb_array_length(activities_data);
    
END $$;
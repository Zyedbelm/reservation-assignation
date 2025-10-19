-- Corriger la fonction pour ajouter search_path sécurisé
CREATE OR REPLACE FUNCTION recalculate_event_durations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = ''
AS $$
DECLARE
    event_record RECORD;
    game_duration INTEGER;
BEGIN
    -- Parcourir tous les événements qui ont un mapping de jeu
    FOR event_record IN 
        SELECT DISTINCT a.id, a.title, a.start_time
        FROM public.activities a
        WHERE EXISTS (
            SELECT 1 FROM public.event_game_mappings egm 
            WHERE LOWER(a.title) LIKE '%' || LOWER(egm.event_name_pattern) || '%'
            AND egm.is_active = true
        )
    LOOP
        -- Trouver la durée correcte du jeu
        SELECT g.average_duration INTO game_duration
        FROM public.games g
        JOIN public.event_game_mappings egm ON g.id = egm.game_id
        WHERE LOWER(event_record.title) LIKE '%' || LOWER(egm.event_name_pattern) || '%'
        AND egm.is_active = true
        AND g.is_active = true
        LIMIT 1;
        
        -- Mettre à jour l'événement si une durée a été trouvée
        IF game_duration IS NOT NULL THEN
            UPDATE public.activities 
            SET 
                duration = game_duration,
                end_time = (event_record.start_time::time + (game_duration || ' minutes')::interval)::time,
                updated_at = now()
            WHERE id = event_record.id;
            
            RAISE NOTICE 'Updated event % with duration %', event_record.title, game_duration;
        END IF;
    END LOOP;
END;
$$;
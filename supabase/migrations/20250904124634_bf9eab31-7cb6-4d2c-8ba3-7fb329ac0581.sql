-- Fix duplicate event for Géraldine GIANADDA on 2025-09-05 18:00
-- Step 1: Find and merge the duplicate events

DO $$
DECLARE
    old_event_id uuid;
    new_event_id uuid;
    old_gm_id uuid;
    old_status text;
    old_assignment_date timestamp with time zone;
BEGIN
    -- Find the old event (unknown source) and new event (VR source)
    SELECT id, assigned_gm_id, status, assignment_date 
    INTO old_event_id, old_gm_id, old_status, old_assignment_date
    FROM public.activities 
    WHERE title ILIKE '%Géraldine%GIANADDA%' 
      AND date = '2025-09-05' 
      AND start_time = '18:00:00'
      AND (event_source = 'unknown' OR calendar_source = 'unknown')
    LIMIT 1;

    SELECT id INTO new_event_id
    FROM public.activities 
    WHERE title ILIKE '%Géraldine%GIANADDA%' 
      AND date = '2025-09-05' 
      AND start_time = '18:00:00'
      AND event_source = 'VR'
    LIMIT 1;

    -- If we found both events, proceed with the merge
    IF old_event_id IS NOT NULL AND new_event_id IS NOT NULL THEN
        RAISE NOTICE 'Found duplicate events: old=%, new=%', old_event_id, new_event_id;
        
        -- Update the new event with assignment data from the old event (if old was assigned)
        IF old_gm_id IS NOT NULL THEN
            UPDATE public.activities 
            SET 
                assigned_gm_id = old_gm_id,
                is_assigned = true,
                status = old_status,
                assignment_date = old_assignment_date,
                updated_at = now()
            WHERE id = new_event_id;
            
            RAISE NOTICE 'Transferred assignment from old to new event';
        END IF;

        -- Update event_assignments to point to the new event
        UPDATE public.event_assignments 
        SET activity_id = new_event_id, updated_at = now()
        WHERE activity_id = old_event_id;
        
        RAISE NOTICE 'Updated event_assignments to point to new event';

        -- Delete the old duplicate event
        DELETE FROM public.activities WHERE id = old_event_id;
        
        RAISE NOTICE 'Deleted old duplicate event';
    ELSE
        RAISE NOTICE 'Could not find both duplicate events. Old: %, New: %', old_event_id, new_event_id;
    END IF;
END $$;
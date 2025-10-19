-- Phase 3: Ajouter un index unique pour empêcher les doublons à la source
-- Cet index garantit qu'un même (calendar_source, make_event_id) ne peut pas être inséré deux fois

-- D'abord, s'assurer qu'il n'y a plus de doublons existants
-- (Cette requête devrait retourner 0 si le nettoyage a été fait)
DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT calendar_source, make_event_id, COUNT(*) as cnt
    FROM activities
    WHERE make_event_id IS NOT NULL
    GROUP BY calendar_source, make_event_id
    HAVING COUNT(*) > 1
  ) duplicates;
  
  IF duplicate_count > 0 THEN
    RAISE NOTICE 'Warning: Found % groups of duplicates. Run admin-clean-duplicates first!', duplicate_count;
  ELSE
    RAISE NOTICE 'No duplicates found. Safe to create unique index.';
  END IF;
END $$;

-- Créer l'index unique pour empêcher les futurs doublons
-- Note: WHERE make_event_id IS NOT NULL permet d'ignorer les événements manuels sans make_event_id
CREATE UNIQUE INDEX IF NOT EXISTS uniq_activities_source_eventid
  ON public.activities (calendar_source, make_event_id)
  WHERE make_event_id IS NOT NULL;
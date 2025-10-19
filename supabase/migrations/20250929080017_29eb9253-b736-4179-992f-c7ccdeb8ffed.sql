-- Migration pour synchroniser les statuts d'assignation dans la table activities
-- Correction du problème où is_assigned et status ne reflètent pas les assignations réelles

-- Étape 1: Mettre à jour les événements qui ont des assignations mais is_assigned=false
UPDATE activities 
SET 
  is_assigned = true,
  status = 'assigned',
  updated_at = now()
WHERE id IN (
  SELECT DISTINCT activity_id 
  FROM event_assignments 
  WHERE status = 'assigned'
) 
AND is_assigned = false;

-- Étape 2: Mettre à jour les événements qui n'ont pas d'assignations mais is_assigned=true
UPDATE activities 
SET 
  is_assigned = false,
  status = 'pending',
  updated_at = now()
WHERE id NOT IN (
  SELECT DISTINCT activity_id 
  FROM event_assignments 
  WHERE status = 'assigned'
) 
AND is_assigned = true;

-- Étape 3: Créer une fonction pour maintenir la synchronisation
CREATE OR REPLACE FUNCTION public.sync_activity_assignment_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Si c'est une insertion ou mise à jour d'assignation
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    -- Mettre à jour l'activité comme assignée si elle a au moins une assignation active
    UPDATE activities 
    SET 
      is_assigned = true,
      status = 'assigned',
      updated_at = now()
    WHERE id = NEW.activity_id
    AND EXISTS (
      SELECT 1 FROM event_assignments 
      WHERE activity_id = NEW.activity_id 
      AND status = 'assigned'
    );
  END IF;
  
  -- Si c'est une suppression d'assignation
  IF TG_OP = 'DELETE' THEN
    -- Vérifier s'il reste des assignations pour cette activité
    IF NOT EXISTS (
      SELECT 1 FROM event_assignments 
      WHERE activity_id = OLD.activity_id 
      AND status = 'assigned'
    ) THEN
      -- Aucune assignation restante, marquer comme non assigné
      UPDATE activities 
      SET 
        is_assigned = false,
        status = 'pending',
        updated_at = now()
      WHERE id = OLD.activity_id;
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Étape 4: Créer le trigger sur la table event_assignments
DROP TRIGGER IF EXISTS sync_assignment_status_trigger ON event_assignments;
CREATE TRIGGER sync_assignment_status_trigger
  AFTER INSERT OR UPDATE OR DELETE ON event_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_activity_assignment_status();
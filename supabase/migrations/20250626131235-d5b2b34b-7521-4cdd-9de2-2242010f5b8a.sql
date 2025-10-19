
-- Vérifier et corriger la contrainte check_valid_status sur la table activities
-- D'abord, voir quelle contrainte existe actuellement
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'activities'::regclass 
AND contype = 'c';

-- Supprimer l'ancienne contrainte qui pose problème
ALTER TABLE activities DROP CONSTRAINT IF EXISTS check_valid_status;

-- Recréer la contrainte avec les bonnes valeurs de statut
ALTER TABLE activities ADD CONSTRAINT check_valid_status 
CHECK (status IN ('pending', 'assigned', 'completed', 'cancelled'));

-- Vérifier que tous les événements existants ont un statut valide
UPDATE activities 
SET status = 'assigned' 
WHERE assigned_gm_id IS NOT NULL AND status = 'pending';

-- Nettoyer les doublons potentiels dans event_assignments
DELETE FROM event_assignments a USING event_assignments b
WHERE a.id < b.id 
AND a.activity_id = b.activity_id 
AND a.gm_id = b.gm_id;
